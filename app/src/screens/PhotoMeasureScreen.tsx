// 폰으로 찍어서 측정: ① 촬영 → ② 귀 이주·C7 탭(끌어서 조정) → ③ CVA 결과 저장
import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type GestureResponderEvent } from "react-native";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { LevelGuide, useTilt, type Tilt } from "../components/LevelGuide";
import { Button, Card, Label, Pill, Segmented, Text, textStyles } from "../components/ui";
import { useAppState } from "../store/AppState";
import { colors, fonts, TAG_LABEL, type Tag } from "../theme";
import { calcCVA, describeCVA, type Point } from "../utils/cva";

type Photo = { uri: string; width: number; height: number; tilt: Tilt };
const HIT = 32; // 점을 잡을 수 있는 반경(px)

export default function PhotoMeasureScreen({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { settings, addRecord } = useAppState();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const tilt = useTilt();
  const [facing, setFacing] = useState<CameraType>("back");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [tragus, setTragus] = useState<Point | null>(null);
  const [c7, setC7] = useState<Point | null>(null);
  const [tag, setTag] = useState<Tag>("none");
  const [saved, setSaved] = useState(false);
  const dragging = useRef<"tragus" | "c7" | null>(null);

  const resetPoints = () => { setTragus(null); setC7(null); setSaved(false); };

  // 카메라 권한
  if (!permission) return <View style={styles.dark} />;
  if (!permission.granted) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text weight="bold" style={{ fontSize: 18, textAlign: "center" }}>옆모습 촬영을 위해{"\n"}카메라 권한이 필요해요</Text>
        <Button kind="primary" title="권한 허용" onPress={requestPermission} />
        <Button title="뒤로" onPress={onBack} />
      </View>
    );
  }

  const takePhoto = async () => {
    const pic = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
    if (!pic) return;
    setPhoto({ uri: pic.uri, width: pic.width, height: pic.height, tilt });
    resetPoints();
    setTag("none");
  };

  // ① 촬영 단계
  if (!photo) {
    return (
      <View style={styles.dark}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
        <View pointerEvents="none" style={styles.vLine} />
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}><Text weight="bold" style={{ color: "#fff" }}>‹ 뒤로</Text></Pressable>
          <LevelGuide tilt={tilt} />
          <View style={{ width: 64 }} />
        </View>
        <Text style={[styles.cameraTip, { bottom: insets.bottom + 132 }]}>몸 옆선을 가운데 세로선에 맞추고, 표시가 초록색일 때 찍어요</Text>
        <View style={[styles.bottomBar, { bottom: insets.bottom + 28 }]}>
          <Pressable onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))} style={styles.roundBtn}>
            <Text weight="bold" style={{ color: "#fff", fontSize: 13 }}>전환</Text>
          </Pressable>
          <Pressable accessibilityLabel="찍기" onPress={takePhoto} style={styles.shutter} />
          <View style={{ width: 56 }} />
        </View>
      </View>
    );
  }

  // ② 점 찍기: 사진을 비율 그대로, 화면 높이의 60%를 넘지 않게
  const maxH = screenH * 0.6;
  let boxW = screenW, boxH = (screenW * photo.height) / photo.width;
  if (boxH > maxH) { boxH = maxH; boxW = (maxH * photo.width) / photo.height; }

  const clamp = (p: Point): Point => ({ x: Math.max(0, Math.min(boxW, p.x)), y: Math.max(0, Math.min(boxH, p.y)) });
  const onGrant = (e: GestureResponderEvent) => {
    const p = clamp({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
    const near = ([["c7", c7], ["tragus", tragus]] as const).find(([, q]) => q && Math.hypot(q.x - p.x, q.y - p.y) < HIT);
    if (near) dragging.current = near[0];
    else if (!tragus) { setTragus(p); dragging.current = "tragus"; }
    else if (!c7) { setC7(p); dragging.current = "c7"; }
    setSaved(false);
  };
  const onMove = (e: GestureResponderEvent) => {
    const p = clamp({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
    if (dragging.current === "tragus") setTragus(p);
    if (dragging.current === "c7") setC7(p);
  };

  const cva = tragus && c7 ? calcCVA(tragus, c7) : null;
  const result = cva !== null ? describeCVA(cva, settings.threshold) : null;
  const guide = !tragus ? "① 귀 이주(귓구멍 앞 작은 돌기)를 탭하세요"
    : !c7 ? "② C7 극돌기(목 뒤 가장 튀어나온 뼈)를 탭하세요"
    : "점을 끌어서 위치를 다듬을 수 있어요";

  const save = () => {
    if (cva === null) return;
    addRecord({ cva: Math.round(cva * 10) / 10, threshold: settings.threshold, tag, roll: Math.round(photo.tilt.roll * 10) / 10 });
    setSaved(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.stage, { paddingTop: insets.top + 8 }]}>
        <View style={styles.stageHead}>
          <Pressable onPress={onBack} hitSlop={12}><Text weight="bold" style={{ color: "#fff" }}>‹ 뒤로</Text></Pressable>
          <Text style={{ color: "#fff", fontSize: 13, flex: 1, textAlign: "center" }}>{guide}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View
          style={{ width: boxW, height: boxH, alignSelf: "center" }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={onGrant}
          onResponderMove={onMove}
          onResponderRelease={() => { dragging.current = null; }}
          onResponderTerminationRequest={() => false}
        >
          <Image pointerEvents="none" source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Overlay w={boxW} h={boxH} tragus={tragus} c7={c7} cva={cva} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Text style={[textStyles.num, { fontSize: 44, color: result ? colors[result.kind] : colors.line }]}>
              {cva !== null ? `${cva.toFixed(1)}°` : "--.-°"}
            </Text>
            <View style={{ gap: 4, flex: 1 }}>
              <Label>CVA 두개척추각</Label>
              {result ? <Pill kind={result.kind}>{result.label}</Pill> : <Pill kind="neutral">점 2개를 찍으면 계산돼요</Pill>}
            </View>
          </View>
          <Text style={textStyles.muted}>
            기준값 {settings.threshold}° · 찍을 때 기울기 좌우 {photo.tilt.roll.toFixed(1)}°{Math.abs(photo.tilt.roll) > 2 ? " (2° 넘음 — 다시 찍기를 권해요)" : ""}
          </Text>
          <View style={{ gap: 6 }}>
            <Label>측정 시점</Label>
            <Segmented
              value={tag}
              onChange={(t) => { setTag(t); setSaved(false); }}
              options={(Object.keys(TAG_LABEL) as Tag[]).map((k) => ({ value: k, label: TAG_LABEL[k] }))}
            />
          </View>
          {saved ? (
            <View style={styles.savedBox}>
              <Text weight="bold" style={{ color: colors.ok }}>기록에 저장했어요</Text>
              <Button title="기록 보기" onPress={onSaved} />
            </View>
          ) : (
            <Button kind="primary" big title="기록 저장" disabled={cva === null} onPress={save} />
          )}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title="점 다시 찍기" onPress={resetPoints} style={{ flex: 1 }} />
            <Button title="다시 촬영" onPress={() => { setPhoto(null); resetPoints(); }} style={{ flex: 1 }} />
          </View>
        </Card>
        <Text style={[textStyles.muted, { textAlign: "center" }]}>자가 자세 체크·기록용이며 질환을 진단하지 않습니다.</Text>
      </ScrollView>
    </View>
  );
}

// 두 점, 이은 선, C7 수평선, 각도 호와 숫자
function Overlay({ w, h, tragus, c7, cva }: { w: number; h: number; tragus: Point | null; c7: Point | null; cva: number | null }) {
  let lines = null;
  if (tragus && c7 && cva !== null) {
    const len = Math.hypot(tragus.x - c7.x, tragus.y - c7.y);
    const dir = tragus.x >= c7.x ? 1 : -1;
    const ang = (cva * Math.PI) / 180;
    const R = 44;
    const bx = c7.x + dir * R * Math.cos(ang), by = c7.y - R * Math.sin(ang);
    const lx = c7.x + dir * (R + 28) * Math.cos(ang / 2), ly = c7.y - (R + 28) * Math.sin(ang / 2);
    lines = (
      <>
        <Line x1={c7.x} y1={c7.y} x2={c7.x + dir * len * 1.05} y2={c7.y} stroke={colors.c7} strokeWidth={3} strokeDasharray="8 6" />
        <Line x1={c7.x} y1={c7.y} x2={tragus.x} y2={tragus.y} stroke={colors.tragus} strokeWidth={3.5} />
        <Path d={`M${c7.x + dir * R} ${c7.y} A${R} ${R} 0 0 ${dir === 1 ? 0 : 1} ${bx} ${by}`} stroke="#fff" strokeWidth={2.5} fill="none" />
        <SvgText x={lx} y={ly + 6} textAnchor="middle" fontFamily={fonts.heavy} fontSize={17} fill="#fff" stroke="#000" strokeWidth={0.8}>
          {`${cva.toFixed(1)}°`}
        </SvgText>
      </>
    );
  }
  const dot = (p: Point | null, color: string) => p && (
    <>
      <Circle cx={p.x} cy={p.y} r={18} fill={color} fillOpacity={0.2} />
      <Circle cx={p.x} cy={p.y} r={8} fill={color} stroke="#000" strokeWidth={2} />
    </>
  );
  return (
    <Svg width={w} height={h}>
      {lines}
      {dot(tragus, colors.tragus)}
      {dot(c7, colors.c7)}
    </Svg>
  );
}

const styles = StyleSheet.create({
  dark: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24, backgroundColor: colors.bg },
  vLine: { position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, backgroundColor: "#ffffff99" },
  topBar: { position: "absolute", left: 12, right: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 64, paddingVertical: 6 },
  cameraTip: { position: "absolute", left: 24, right: 24, color: "#fff", textAlign: "center", fontSize: 13 },
  bottomBar: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  roundBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#ffffff26", alignItems: "center", justifyContent: "center" },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#fff", borderWidth: 6, borderColor: "#ffffff66" },
  stage: { backgroundColor: colors.stage, paddingBottom: 12, gap: 10 },
  stageHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 8 },
  savedBox: { backgroundColor: colors.okBg, borderRadius: 12, padding: 12, gap: 8, alignItems: "center" },
});
