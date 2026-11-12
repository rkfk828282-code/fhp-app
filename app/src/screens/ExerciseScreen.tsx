// 운동 탭: 자가운동 타이머가 들어갈 자리 (다음 단계에서 만듦)
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Label, Pill, ScreenTitle, Text, textStyles } from "../components/ui";
import { colors } from "../theme";

const PLANNED = [
  { title: "알림 간격 설정", desc: "예: 50분마다 운동 알림, 방해 금지 시간 설정" },
  { title: "운동 순서 안내", desc: "동작별 카운트다운과 설명" },
  { title: "운동 전·후 측정", desc: "운동 시작 전과 끝난 뒤 CVA를 바로 측정" },
  { title: "연속 기록과 배지", desc: "며칠 연속 했는지, 목표 달성 배지" },
];

export default function ExerciseScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <ScreenTitle title="자가운동" sub="정해진 간격마다 알림을 받고 목 운동을 해요" />
      <Card>
        <Pill kind="neutral">준비 중</Pill>
        <Text weight="bold" style={{ fontSize: 17 }}>자가운동 타이머를 만들고 있어요</Text>
        <Text style={textStyles.muted}>다음 업데이트에서 아래 기능이 들어와요.</Text>
      </Card>
      <Label>들어올 기능</Label>
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {PLANNED.map((p, i) => (
          <View key={p.title} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
            <View style={styles.num}><Text weight="bold" style={{ color: colors.ok }}>{i + 1}</Text></View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text weight="bold">{p.title}</Text>
              <Text style={textStyles.muted}>{p.desc}</Text>
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
});
