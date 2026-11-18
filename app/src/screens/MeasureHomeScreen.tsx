// 측정 탭 첫 화면: 최근 결과 + 실시간 자세 측정 버튼 하나
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gauge } from "../components/Gauge";
import { MOOD_TEXT, moodOf, Turtle } from "../components/Turtle";
import { Button, Card, PageHead, Text, textStyles } from "../components/ui";
import { useNav } from "../nav";
import { useAppState } from "../store/AppState";
import { colors, TAG_LABEL } from "../theme";
import { formatDateTime } from "../utils/format";

export default function MeasureHomeScreen({ onMonitor }: { onMonitor: () => void }) {
  // 제목 줄은 다른 탭과 같은 모양
  const insets = useSafeAreaInsets();
  const { records } = useAppState();
  const { showSummary } = useNav();
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted.length ? sorted[sorted.length - 1] : null, prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <PageHead icon="measure" title="측정" />

      {/* 1. 최근 측정 결과 (게이지) */}
      {last ? (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text weight="bold" style={{ fontSize: 16 }}>최근 측정 결과</Text>
            <Text style={textStyles.muted}>{formatDateTime(last.date)}{last.tag !== "none" ? ` · ${TAG_LABEL[last.tag]}` : ""}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Turtle mood={moodOf(last.cva, last.threshold)} height={56} />
            <Text weight="bold" style={{ flex: 1, fontSize: 15 }}>{MOOD_TEXT[moodOf(last.cva, last.threshold)]}</Text>
          </View>
          <Gauge cva={last.cva} threshold={last.threshold} />
          <Pressable accessibilityRole="button" onPress={() => showSummary({ rec: last, prev: prev ?? null })} hitSlop={8} style={{ alignSelf: "center", padding: 6 }}>
            <Text weight="bold" style={{ color: colors.accent }}>결과 자세히 보기 ›</Text>
          </Pressable>
        </Card>
      ) : (
        <Card style={{ alignItems: "center", paddingVertical: 24 }}>
          <Turtle mood="strain" height={90} />
          <Text weight="bold" style={{ fontSize: 16 }}>아직 측정 결과가 없어요</Text>
          <Text style={[textStyles.muted, { textAlign: "center" }]}>아래 버튼으로 첫 측정을 해 보세요. 결과가 여기에 게이지로 나와요.</Text>
        </Card>
      )}

      {/* 2. 측정 버튼: 노트북 웹캠 측정과 같은 실시간 자세 측정 */}
      <Button kind="primary" big title="📷  실시간 자세 측정" onPress={onMonitor} />
      <Text style={[textStyles.muted, { textAlign: "center" }]}>전면 카메라로 얼굴과 어깨를 보고 3초 기준을 잡은 뒤, 게이지와 데이터로 자세를 실시간으로 보여 줘요</Text>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
});
