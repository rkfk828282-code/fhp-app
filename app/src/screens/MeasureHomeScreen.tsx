// 측정 탭 첫 화면: 최근 결과 + 측정 방법 고르기
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gauge } from "../components/Gauge";
import { MOOD_TEXT, moodOf, Turtle } from "../components/Turtle";
import { Button, Card, PageHead, Text, textStyles } from "../components/ui";
import { useNav } from "../nav";
import { useAppState } from "../store/AppState";
import { colors, TAG_LABEL } from "../theme";
import { formatDateTime } from "../utils/format";

export default function MeasureHomeScreen({ onPhoto, onLive }: { onPhoto: () => void; onLive: () => void }) {
  // 제목 줄은 다른 탭과 같은 모양
  const insets = useSafeAreaInsets();
  const { records, settings } = useAppState();
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

      {/* 2. 측정 버튼 */}
      <Button kind="primary" big title="📸  폰으로 측정하기" onPress={onPhoto} />
      <Button big title="💻  노트북 보면서 촬영" onPress={onLive} />
      <Text style={[textStyles.muted, { textAlign: "center" }]}>혼자 잴 때는 폰을 세워 두고 노트북으로 보면서 찍어요 · 기준값 {settings.threshold}° (MY에서 변경)</Text>

      <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
        <Text weight="bold" style={{ color: colors.ok }}>정확하게 재는 법</Text>
        <Text style={{ fontSize: 13.5, lineHeight: 21 }}>
          • 카메라를 어깨 높이에서 몸과 직각으로 두어요{"\n"}
          • 귀 이주와 C7(목 뒤 가장 튀어나온 뼈)에 작은 스티커를 붙여요{"\n"}
          • 편하게 정면을 보고 선 자세에서 찍어요
        </Text>
      </Card>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
});
