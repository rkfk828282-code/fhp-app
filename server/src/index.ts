// 실시간 연동 서버 (Cloudflare Workers + Durable Objects)
//
// 하는 일: 같은 "연결 코드"로 들어온 폰과 노트북을 한 방(Room)에 묶고,
// 둘 사이의 메시지(영상 연결 정보, 폰 기울기 등)를 전달만 합니다.
// 영상 자체는 서버를 거치지 않고 폰 → 노트북으로 직접 갑니다(WebRTC).
import { DurableObject } from "cloudflare:workers";

type Role = "phone" | "viewer";

export interface Env {
  ROOMS: DurableObjectNamespace<Room>;
  ASSETS: Fetcher;
  // Cloudflare TURN 키 (대시보드 → Realtime → TURN Server). Worker 설정의 비밀값으로 넣음. 없으면 STUN만 씀
  TURN_KEY_ID?: string;
  TURN_KEY_API_TOKEN?: string;
}

const STUN_ONLY = { iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }], relay: false };

/** 폰과 노트북이 다른 네트워크(와이파이 ↔ LTE·5G)여도 영상이 오가도록 TURN 중계 서버 접속 정보를 짧게(하루) 발급 */
async function turnServers(env: Env): Promise<Response> {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return new Response(JSON.stringify(STUN_ONLY), { headers });
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 86400 }),
    });
    if (!r.ok) throw new Error(`TURN ${r.status}`);
    const j = (await r.json()) as { iceServers: unknown };
    const list = (Array.isArray(j.iceServers) ? j.iceServers : [j.iceServers]) as { urls: string | string[]; username?: string; credential?: string }[];
    // 53번 포트 주소는 브라우저에서 막혀 연결만 늦어지므로 뺌 (Cloudflare 안내)
    const ice = list.map((s) => ({ ...s, urls: ([] as string[]).concat(s.urls).filter((u) => !/:53(\?|$)/.test(u)) })).filter((s) => s.urls.length);
    return new Response(JSON.stringify({ iceServers: ice, relay: true }), { headers });
  } catch {
    return new Response(JSON.stringify(STUN_ONLY), { headers });
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/turn") return turnServers(env);
    const m = url.pathname.match(/^\/ws\/(\d{6})$/);
    if (m) {
      if (req.headers.get("Upgrade") !== "websocket") {
        return new Response("WebSocket으로만 연결할 수 있어요", { status: 426 });
      }
      const role = url.searchParams.get("role");
      if (role !== "phone" && role !== "viewer") {
        return new Response("role은 phone 또는 viewer여야 해요", { status: 400 });
      }
      const room = env.ROOMS.get(env.ROOMS.idFromName(m[1]));
      return room.fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;

const otherOf = (r: Role): Role => (r === "phone" ? "viewer" : "phone");

export class Room extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    const role = new URL(req.url).searchParams.get("role") as Role;

    // 같은 역할로 다시 들어오면(새로고침 등) 예전 연결은 닫습니다
    for (const old of this.ctx.getWebSockets(role)) {
      try { old.close(4000, "replaced"); } catch { /* 이미 닫힘 */ }
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [role]);

    // 상대가 이미 있으면 양쪽에 알려줍니다 → 폰이 영상 연결을 시작
    const others = this.ctx.getWebSockets(otherOf(role));
    if (others.length > 0) {
      server.send(JSON.stringify({ type: "peer-joined", role: otherOf(role) }));
      for (const o of others) o.send(JSON.stringify({ type: "peer-joined", role }));
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string" || message.length > 64 * 1024) return;
    const role = this.ctx.getTags(ws)[0] as Role;
    for (const o of this.ctx.getWebSockets(otherOf(role))) {
      try { o.send(message); } catch { /* 상대 연결이 끊기는 중 */ }
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    const role = this.ctx.getTags(ws)[0] as Role;
    try { ws.close(code === 1005 ? 1000 : code, "bye"); } catch { /* 이미 닫힘 */ }
    for (const o of this.ctx.getWebSockets(otherOf(role))) {
      try { o.send(JSON.stringify({ type: "peer-left", role })); } catch { /* 무시 */ }
    }
  }
}
