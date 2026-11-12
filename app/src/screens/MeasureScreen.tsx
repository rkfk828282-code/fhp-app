// 측정 화면: ① 촬영 → ② 귀·C7 탭 → ③ CVA 결과
import { useRef, useState } from "react";
import {
  Dimensions, Image, Pressable, StyleSheet, Text, View,
  type GestureResponderEvent,
} from "react-native";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import { LevelGuide, useTilt, type Tilt } from "../components/LevelGuide";
import { calcCVA, describeCVA, type Point } from "../utils/cva";

type Photo = { uri: string; width: number; height: number; tilt: Tilt };

export default function MeasureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const tilt = useTilt();
  const [facing, setFacing] = useState<CameraType>("back");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [tragus, setTragus] = useState<Point | null>(null);
  const [c7, setC7] = useState<Point | null>(null);
  const [threshold, setThreshold] = useState(50); // 기준값 (사용자 조절 가능)

  // 카메라 권한
  if (!permission) return <View style={styles.center} />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>옆모습 촬영을 위해 카메라 권한이 필요해요.</Text>
        <Button title="권한 허용" onPress={requestPermission} />
      </View>
    );
  }

  const takePhoto = async () => {
    const pic = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
    if (!pic) return;
    setPhoto({ uri: pic.uri, width: pic.width, height: pic.height, tilt });
    setTragus(null);
    setC7(null);
  };

  const retake = () => {
    setPhoto(null);
    setTragus(null);
    setC7(null);
  };

  // ① 촬영 단계
  if (!photo) {
    return (
      <View style={styles.flex}>
        <CameraView ref={cameraRef} style={styles.flex} facing={facing} />
        {/* 세로 기준선: 몸 옆선을 맞추는 용도 */}
        <View pointerEvents="none" style={styles.vLine} />
        <View style={styles.topBar}>
          <LevelGuide tilt={tilt} />
        </View>
        <View style={styles.bottomBar}>
          <Button title="전환" onPress={() => setFacing(f => (f === "back" ? "front" : "back"))} />
          <Pressable style={styles.shutter} onPress={takePhoto} />
          <View style={{ width: 70 }} />
        </View>
      </View>
    );
  }

  // ② 점 찍기 단계: 사진을 화면 폭에 맞춰 비율 그대로 표시
  const screenW = Dimensions.get("window").width;
  const imgH = (screenW * photo.height) / photo.width;

  const onTapPhoto = (e: GestureResponderEvent) => {
    const p = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
    if (!tragus) setTragus(p);
    else if (!c7) setC7(p);
  };

  const cva = tragus && c7 ? calcCVA(tragus, c7) : null;
  const result = cva !== null ? describeCVA(cva, threshold) : null;
  const guide = !tragus ? "① 귀 이주(귓구멍 앞 돌기)를 탭하세요"
    : !c7 ? "② C7 극돌기(목 뒤 가장 튀어나온 뼈)를 탭하세요"
    : "측정 완료";

  return (
    <View style={styles.flex}>
      <Text style={styles.guide}>{guide}</Text>
      <Pressable onPress={onTapPhoto} style={{ width: screenW, height: imgH, maxHeight: "75%" }}>
        <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        {tragus && c7 && <AngleLines a={tragus} b={c7} />}
        {tragus && <Dot p={tragus} color="#ffeb3b" />}
        {c7 && <Dot p={c7} color="#00e5ff" />}
      </Pressable>

      <View style={styles.panel}>
        {cva !== null && result && (
          <>
            <Text style={[styles.cva, { color: result.color }]}>CVA {cva.toFixed(1)}°</Text>
            <Text style={{ color: result.color, fontWeight: "700" }}>{result.label}</Text>
          </>
        )}
        <View style={styles.row}>
          <Button title="−" onPress={() => setThreshold(t => t - 1)} />
          <Text style={styles.msg}>기준값 {threshold}°</Text>
          <Button title="+" onPress={() => setThreshold(t => t + 1)} />
        </View>
        <Text style={styles.note}>
          촬영 시 기울기: 좌우 {photo.tilt.roll.toFixed(1)}° · 자가 자세 체크용이며 진단이 아닙니다.
        </Text>
        <View style={styles.row}>
          <Button title="점 다시 찍기" onPress={() => { setTragus(null); setC7(null); }} />
          <Button title="다시 촬영" onPress={retake} />
        </View>
      </View>
    </View>
  );
}

// ── 작은 화면 부품들 ──────────────────────────
function Dot({ p, color }: { p: Point; color: string }) {
  const R = 9;
  return (
    <View pointerEvents="none" style={{
      position: "absolute", left: p.x - R, top: p.y - R, width: R * 2, height: R * 2,
      borderRadius: R, backgroundColor: color, borderWidth: 2, borderColor: "black",
    }} />
  );
}

// 두 점을 잇는 선 + C7에서 시작하는 수평선
function AngleLines({ a, b }: { a: Point; b: Point }) {
  const len = Math.hypot(a.x - b.x, a.y - b.y);
  const angle = Math.atan2(a.y - b.y, a.x - b.x);
  const dir = a.x >= b.x ? 1 : -1;
  return (
    <>
      <View pointerEvents="none" style={{
        position: "absolute", left: (a.x + b.x) / 2 - len / 2, top: (a.y + b.y) / 2 - 1,
        width: len, height: 3, backgroundColor: "#ffeb3b", transform: [{ rotate: `${angle}rad` }],
      }} />
      <View pointerEvents="none" style={{
        position: "absolute", top: b.y - 1, height: 3, width: len,
        left: dir === 1 ? b.x : b.x - len, backgroundColor: "#00e5ff",
      }} />
    </>
  );
}

function Button({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.btn}>
      <Text style={styles.btnText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "black" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16, backgroundColor: "white" },
  msg: { fontSize: 16, textAlign: "center" },
  vLine: { position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, backgroundColor: "#ffffff88" },
  topBar: { position: "absolute", top: 84, left: 0, right: 0, alignItems: "center" },
  bottomBar: {
    position: "absolute", bottom: 40, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
  },
  shutter: { width: 72, height: 72, borderRadius: 36, backgroundColor: "white", borderWidth: 5, borderColor: "#ccc" },
  guide: { color: "white", fontSize: 16, textAlign: "center", paddingTop: 80, paddingBottom: 10 },
  panel: { flex: 1, backgroundColor: "white", alignItems: "center", padding: 12, gap: 8 },
  cva: { fontSize: 32, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  note: { fontSize: 12, color: "#666", textAlign: "center" },
  btn: { backgroundColor: "#1565c0", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, minWidth: 48, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
