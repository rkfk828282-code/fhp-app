// 기록 탭: 요약 숫자 + 날짜별 CVA 그래프 + 측정 목록
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { Card, Label, Pill, ScreenTitle, Text, textStyles } from "../components/ui";
import { useAppState, type MeasureRecord } from "../store/AppState";
import { colors, fonts, TAG_LABEL } from "../theme";
import { describeCVA } from "../utils/cva";
import { formatDateTime, formatShortDate } from "../utils/format";

export default function RecordsScreen({ onMeasure }: { onMeasure: () => void }) {
  const insets = useSafeAreaInsets();
  const { records, settings, deleteRecord } = useAppState();
  const recs = [...records].sort((a, b) => a.date.localeCompare(b.date));

  if (recs.length === 0) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + 16 }]}>
        <ScreenTitle title="기록" />
        <Card style={{ alignItems: "center", paddingVertical: 32 }}>
          <Text weight="bold" style={{ fontSize: 17 }}>아직 측정 기록이 없어요</Text>
          <Text style={[textStyles.muted, { textAlign: "center" }]}>측정하고 "기록 저장"을 누르면{"\n"}여기에 날짜별 그래프로 쌓여요.</Text>
          <Pressable onPress={onMeasure} style={styles.cta}><Text weight="bold" style={{ color: "#fff" }}>측정하러 가기</Text></Pressable>
        </Card>
      </View>
    );
  }

  const last = recs[recs.length - 1];
  const avg = recs.reduce((s, r) => s + r.cva, 0) / recs.length;
  const lastBefore = [...recs].reverse().find((r) => r.tag === "before");
  const lastAfter = lastBefore ? [...recs].reverse().find((r) => r.tag === "after" && r.date > lastBefore.date) : undefined;
  const diff = lastBefore && lastAfter ? lastAfter.cva - lastBefore.cva : null;

  const confirmDelete = (r: MeasureRecord) =>
    Alert.alert("기록 삭제", `${formatDateTime(r.date)} · ${r.cva.toFixed(1)}° 기록을 지울까요?`, [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => deleteRecord(r.id) },
    ]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <ScreenTitle title="기록" sub={`총 ${recs.length}회 측정`} />

      <View style={styles.stats}>
        <Stat label="최근" value={`${last.cva.toFixed(1)}°`} />
        <Stat label="평균" value={`${avg.toFixed(1)}°`} />
        <Stat label="운동 전→후" value={diff === null ? "–" : `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}°`} />
      </View>

      <Card>
        <Text weight="bold" style={{ fontSize: 16 }}>날짜별 CVA</Text>
        <Chart recs={recs.slice(-20)} threshold={settings.threshold} />
        <View style={{ flexDirection: "row", gap: 14 }}>
          <Legend color={colors.tragus} label="운동 전" />
          <Legend color={colors.c7} label="운동 후" />
          <Legend color={colors.warn} label={`기준 ${settings.threshold}°`} dashed />
        </View>
        {recs.length > 20 && <Text style={textStyles.muted}>최근 20회만 그래프에 보여요</Text>}
      </Card>

      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {[...recs].reverse().map((r, i) => {
          const d = describeCVA(r.cva, r.threshold);
          return (
            <View key={r.id} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[textStyles.num, { fontSize: 18, color: colors[d.kind] }]}>{r.cva.toFixed(1)}°</Text>
                <Text style={textStyles.muted}>{formatDateTime(r.date)}{r.tag !== "none" ? ` · ${TAG_LABEL[r.tag]}` : ""}</Text>
              </View>
              <Pill kind={d.kind}>{d.label}</Pill>
              <Pressable accessibilityLabel="이 기록 삭제" onPress={() => confirmDelete(r)} hitSlop={8} style={{ padding: 6 }}>
                <Text style={{ color: colors.muted, fontSize: 13 }}>삭제</Text>
              </Pressable>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Label>{label}</Label>
      <Text style={[textStyles.num, { fontSize: 22 }]}>{value}</Text>
    </View>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={dashed ? { width: 14, borderTopWidth: 2, borderStyle: "dashed", borderColor: color } : { width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <Text style={textStyles.muted}>{label}</Text>
    </View>
  );
}

function Chart({ recs, threshold }: { recs: MeasureRecord[]; threshold: number }) {
  const { width } = useWindowDimensions();
  const W = width - 32 - 32; // 화면 여백과 카드 안쪽 여백 제외
  const H = 190, L = 34, R = 10, T = 12, B = 24;
  const vals = recs.map((r) => r.cva).concat(threshold);
  const lo = Math.floor(Math.min(...vals) - 2), hi = Math.ceil(Math.max(...vals) + 2);
  const x = (i: number) => (recs.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (recs.length - 1));
  const y = (v: number) => T + ((hi - v) * (H - T - B)) / (hi - lo);
  const step = Math.max(1, Math.round((hi - lo) / 4));
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  const path = recs.map((r, i) => `${i ? "L" : "M"}${x(i)} ${y(r.cva)}`).join(" ");

  return (
    <Svg width={W} height={H}>
      {ticks.map((v) => (
        <G key={v}>
          <Line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={colors.line} strokeWidth={1} />
          <SvgText x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={10} fill={colors.muted} fontFamily={fonts.regular}>{`${v}°`}</SvgText>
        </G>
      ))}
      <Line x1={L} x2={W - R} y1={y(threshold)} y2={y(threshold)} stroke={colors.warn} strokeWidth={1.2} strokeDasharray="4 4" />
      {recs.length > 1 && <Path d={`${path} L${x(recs.length - 1)} ${H - B} L${x(0)} ${H - B} Z`} fill={colors.accent} fillOpacity={0.1} />}
      <Path d={path} stroke={colors.accent} strokeWidth={2} fill="none" />
      {recs.map((r, i) => (
        <Circle
          key={r.id} cx={x(i)} cy={y(r.cva)} r={i === recs.length - 1 ? 5 : 3.5}
          fill={r.tag === "before" ? colors.tragus : r.tag === "after" ? colors.c7 : colors.accent}
          stroke={colors.surface} strokeWidth={1.5}
        />
      ))}
      <SvgText x={x(0)} y={H - 6} fontSize={10} fill={colors.muted} fontFamily={fonts.regular} textAnchor={recs.length === 1 ? "middle" : "start"}>
        {formatShortDate(recs[0].date)}
      </SvgText>
      {recs.length > 1 && (
        <SvgText x={x(recs.length - 1)} y={H - 6} fontSize={10} fill={colors.muted} fontFamily={fonts.regular} textAnchor="end">
          {formatShortDate(recs[recs.length - 1].date)}
        </SvgText>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
  empty: { flex: 1, padding: 16, gap: 12 },
  cta: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, marginTop: 4 },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
});
