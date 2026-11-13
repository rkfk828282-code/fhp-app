// 측정 완료 후 결과 요약
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, KV, Label, PageHead, Pill, Text, textStyles } from "../components/ui";
import { useNav } from "../nav";
import { useAppState } from "../store/AppState";
import { colors, TAG_LABEL } from "../theme";
import { formatDateTime } from "../utils/format";
import { summarize } from "../utils/summary";

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const { summary, go } = useNav();
  const { settings, records } = useAppState();
  if (!summary) return null;
  const r = summary.rec;
  const sm = summarize(r, summary.prev, settings.goal.cva);
  const sign = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}°`;
  const quality = r.roll === undefined ? "촬영할 때 폰 기울기 정보가 없어요."
    : Math.abs(r.roll) <= 2 ? `촬영할 때 폰이 수평이었어요 (좌우 ${r.roll.toFixed(1)}°).`
    : `촬영할 때 폰이 ${Math.abs(r.roll).toFixed(1)}° 기울어 있었어요. 다음엔 수평 표시가 초록일 때 찍어 주세요.`;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <PageHead icon="measure" title="측정 결과" right={<Text style={textStyles.muted}>{formatDateTime(r.date)}</Text>} />

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
        <Text style={[textStyles.num, { fontSize: 52, color: colors[sm.kind] }]}>{r.cva.toFixed(1)}°</Text>
        <View style={{ gap: 6, flex: 1, alignItems: "flex-start" }}>
          <Label>CVA 두개척추각</Label>
          <Pill kind={sm.kind}>{sm.label}</Pill>
          <Text style={textStyles.muted}>{TAG_LABEL[r.tag]} · {r.source === "laptop" ? "노트북 두 카메라" : "폰 촬영"}</Text>
        </View>
      </Card>

      <Card>
        <Text weight="bold" style={{ fontSize: 16 }}>한눈에 요약</Text>
        <Text style={styles.summary}>
          {sm.parts.map((p, i) => <Text key={i} weight={p.bold ? "bold" : "regular"} style={styles.summary}>{p.text}</Text>)}
        </Text>
        <KV items={[
          { label: "기준 대비", value: sign(sm.th), color: sm.th >= 0 ? colors.ok : colors.warn },
          { label: "지난번 대비", value: sm.diffPrev === null ? "첫 측정" : sign(sm.diffPrev), color: sm.diffPrev === null ? colors.ink : sm.diffPrev >= 0 ? colors.ok : colors.warn },
          { label: "목표까지", value: sm.gap > 0 ? `${sm.gap.toFixed(1)}°` : "달성" },
          { label: "누적 측정", value: `${records.length}회` },
        ]} />
        <Text style={textStyles.muted}>{quality}</Text>
      </Card>

      {!!summary.side && (
        <View style={styles.thumb}>
          <Image source={{ uri: summary.side }} style={{ width: "100%", height: 220 }} resizeMode="contain" />
          <Text style={{ color: "#fff", fontSize: 12.5, padding: 8 }}>옆모습</Text>
        </View>
      )}

      <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
        <Text weight="bold" style={{ color: colors.ok }}>이렇게 해 보세요</Text>
        {sm.tips.map((t) => <Text key={t} style={{ fontSize: 13.5, lineHeight: 21 }}>•  {t}</Text>)}
      </Card>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title="기록 보기" onPress={() => go("records")} style={{ flex: 1 }} />
        <Button kind="primary" title={sm.kind === "warn" ? "목 운동 시작" : "다시 측정"} style={{ flex: 1.4 }}
          onPress={() => (sm.kind === "warn" ? go("exercise") : go("measure"))} />
      </View>
      <Text style={[textStyles.muted, { textAlign: "center" }]}>자가 자세 체크·기록용이며 질환을 진단하지 않습니다.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
  summary: { fontSize: 15, lineHeight: 26 },
  thumb: { backgroundColor: colors.stage, borderRadius: 14, overflow: "hidden" },
});
