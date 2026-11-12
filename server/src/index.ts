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
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
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
