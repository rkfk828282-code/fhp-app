// 실시간 송출 화면: 폰 카메라 화면을 노트북으로 실시간 전송
// 노트북 화면(public/index.html)과 서버(src/index.ts)는 neckcheck-live 프로젝트에 있어요.
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import {
  mediaDevices, MediaStream, RTCIceCandidate, RTCPeerConnection,
  RTCSessionDescription, RTCView,
} from "react-native-webrtc";
import { LevelGuide, useTilt } from "../components/LevelGuide";
import { SERVER_URL } from "../config";
import { Button, Text } from "../components/ui";
import { colors, fonts } from "../theme";

const ICE = [{ urls: "stun:stun.cloudflare.com:3478" }];
type Status = "idle" | "waiting" | "connecting" | "live" | "failed";
const STATUS_TEXT: Record<Status, string> = {
  idle: "준비",
  waiting: "노트북 기다리는 중",
  connecting: "노트북 연결 중",
  live: "노트북에 송출 중",
  failed: "영상 연결 실패 · 같은 와이파이인지 확인해 주세요",
};

export default function LiveSendScreen({ onBack }: { onBack: () => void }) {
  useKeepAwake(); // 송출 중에 화면이 꺼지지 않게
  const insets = useSafeAreaInsets();
  const tilt = useTilt();
  const [code, setCode] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tiltRef = useRef(tilt);
  const activeRef = useRef(false);
  tiltRef.current = tilt;

  const send = (obj: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  };

  // 기울기를 1초에 5번 노트북으로
  useEffect(() => {
    if (!stream) return;
    const id = setInterval(() => send({ type: "tilt", ...tiltRef.current }), 200);
    return () => clearInterval(id);
  }, [stream]);

  // 화면을 나가면 모두 정리
  useEffect(() => () => stopAll(), []);

  const closePeer = () => {
    pcRef.current?.close();
    pcRef.current = null;
  };

  // 노트북이 들어오면 폰이 영상 연결을 시작
  const startPeer = async () => {
    const s = streamRef.current;
    if (!s) return;
    closePeer();
    setStatus("connecting");
    const pc = new RTCPeerConnection({ iceServers: ICE });
    pcRef.current = pc;
    s.getTracks().forEach((t) => pc.addTrack(t, s));
    pc.addEventListener("icecandidate", (e) => {
      if (e.candidate) send({ type: "ice", candidate: e.candidate });
    });
    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") setStatus("live");
      if (pc.connectionState === "failed") setStatus("failed");
    });
    const offer = await pc.createOffer({});
    await pc.setLocalDescription(offer);
    send({ type: "offer", sdp: pc.localDescription });
  };

  const handle = async (msg: any) => {
    const pc = pcRef.current;
    switch (msg.type) {
      case "peer-joined": await startPeer(); break;
      case "peer-left": closePeer(); setStatus("waiting"); break;
      case "answer": if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)); break;
      case "ice": if (pc) { try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {} } break;
    }
  };

  const connect = (c: string) => {
    const url = SERVER_URL.replace(/^http/, "ws") + `/ws/${c}?role=phone`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => setStatus("waiting");
    ws.onmessage = (e) => { try { handle(JSON.parse(String(e.data))); } catch {} };
    ws.onclose = (e) => {
      if (wsRef.current !== ws) return;
      if (activeRef.current && e.code !== 4000) setTimeout(() => activeRef.current && connect(c), 2000);
    };
  };

  const start = async () => {
    const c = code.trim();
    if (!/^\d{6}$/.test(c)) { setError("노트북에 나온 6자리 숫자를 입력해 주세요."); return; }
    setError("");
    try {
      const s = await mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "environment", width: 1280, height: 720, frameRate: 30 },
      });
      streamRef.current = s;
      setStream(s);
    } catch {
      setError("카메라를 켤 수 없어요. 설정에서 카메라 권한을 허용해 주세요.");
      return;
    }
    activeRef.current = true;
    connect(c);
  };

  function stopAll() {
    activeRef.current = false;
    closePeer();
    wsRef.current?.close();
    wsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }
  const stop = () => { stopAll(); setStream(null); setStatus("idle"); };

  // ① 코드 입력
  if (!stream) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onBack} hitSlop={12} style={{ alignSelf: "flex-start" }}>
          <Text weight="bold" style={{ color: colors.accent }}>‹ 뒤로</Text>
        </Pressable>
        <View style={{ flex: 1, justifyContent: "center", gap: 14 }}>
          <Text weight="heavy" style={styles.title}>노트북 보면서 촬영</Text>
          <Text style={styles.help}>노트북에서 {SERVER_URL.replace("https://", "")} 를 열면 6자리 코드가 나와요. 폰과 노트북은 같은 와이파이에 연결해 주세요.</Text>
          <TextInput
            style={styles.codeInput} value={code} onChangeText={setCode}
            keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor="#9aa59f"
            accessibilityLabel="노트북 연결 코드 6자리"
          />
          <Button kind="primary" big title="카메라 켜고 연결" onPress={start} />
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      </View>
    );
  }

  // ② 송출 중
  return (
    <View style={styles.flex}>
      <RTCView streamURL={stream.toURL()} style={styles.flex} objectFit="cover" />
      <View pointerEvents="none" style={styles.vLine} />
      <View style={[styles.topBar, { top: insets.top + 8 }]}><LevelGuide tilt={tilt} /></View>
      <View style={[styles.bottomBar, { bottom: insets.bottom + 24 }]}>
        <Text weight="bold" style={[styles.status, status === "live" && { color: "#3fcf89" }]}>● {STATUS_TEXT[status]}</Text>
        <Text style={styles.help2}>노트북 화면을 보며 자세를 맞추고, 찍기는 노트북에서 눌러요.</Text>
        <Pressable style={styles.secondary} onPress={() => { stop(); onBack(); }}>
          <Text weight="bold" style={{ color: "#fff" }}>송출 끝내기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "black" },
  center: { flex: 1, padding: 24, backgroundColor: colors.bg },
  title: { fontSize: 24 },
  codeInput: {
    fontSize: 30, fontFamily: fonts.heavy, letterSpacing: 6, textAlign: "center", color: colors.ink,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 12,
  },
  help: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  error: { color: colors.warn, fontSize: 14, textAlign: "center" },
  vLine: { position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, backgroundColor: "#ffffff99" },
  topBar: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  bottomBar: { position: "absolute", left: 16, right: 16, gap: 8, alignItems: "center" },
  status: { color: "#c9d3d8", fontSize: 15 },
  help2: { color: "#c9d3d8", fontSize: 12.5, textAlign: "center" },
  secondary: { backgroundColor: "#ffffff26", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18 },
});
