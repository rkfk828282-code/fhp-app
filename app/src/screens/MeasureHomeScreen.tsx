// 측정 탭 첫 화면: 최근 결과 + 측정 방법 고르기
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Card, Label, Pill, ScreenTitle, Text, textStyles } from "../components/ui";
import { useAppState } from "../store/AppState";
import { colors, TAG_LABEL } from "../theme";
import { describeCVA } from "../utils/cva";
import { formatDateTime } from "../utils/format";

export default function MeasureHomeScreen({ onPhoto, onLive }: { onPhoto: () => void; onLive: () => void }) {
  const insets = useSafeAreaInsets();
  const { records, settings } = useAppState();
  const last = records.length ? [...records].sort((a, b) => a.date.localeCompare(b.date))[records.length - 1] : null;
  const d = last ? describeCVA(last.cva, last.threshold) : null;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <ScreenTitle title="거북목 체크" sub="옆모습으로 목 각도(CVA)를 재고 기록해요" />

      {/* 최근 결과 */}
      <Card>
        <Label>최근 측정</Label>
        {last && d ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Text style={[textStyles.num, { fontSize: 44, color: colors[d.kind] }]}>{last.cva.toFixed(1)}°</Text>
            <View style={{ gap: 4, flex: 1 }}>
              <Pill kind={d.kind}>{d.label}</Pill>
              <Text style={textStyles.muted}>
                {formatDateTime(last.date)}{last.tag !== "none" ? ` · ${TAG_LABEL[last.tag]}` : ""}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={textStyles.muted}>아직 기록이 없어요. 아래에서 측정 방법을 골라 첫 기록을 남겨 보세요.</Text>
        )}
        <Text style={textStyles.muted}>기준값 {settings.threshold}° · 설정 탭에서 바꿀 수 있어요</Text>
      </Card>

      {/* 측정 방법 */}
      <Label>측정 방법</Label>
      <Option
        icon="phone"
        title="폰으로 찍어서 측정"
        desc="다른 사람이 옆에서 찍어 줄 때. 폰 화면에서 귀와 C7을 탭해요."
        onPress={onPhoto}
      />
      <Option
        icon="laptop"
        title="노트북 보면서 촬영"
        desc="폰을 세워 두고 혼자 잴 때. 폰 카메라 화면이 노트북에 실시간으로 떠요."
        onPress={onLive}
      />

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

function Option({ icon, title, desc, onPress }: { icon: "phone" | "laptop"; title: string; desc: string; onPress: () => void }) {
  const p = { stroke: colors.accent, strokeWidth: 1.8, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.option, pressed && { opacity: 0.8 }]}>
      <View style={styles.optionIcon}>
        <Svg width={28} height={28} viewBox="0 0 24 24">
          {icon === "phone"
            ? (<><Rect x={6} y={2.5} width={12} height={19} rx={2.5} {...p} /><Circle cx={12} cy={9} r={2.5} {...p} /></>)
            : (<><Rect x={2.5} y={5} width={13} height={10} rx={1.5} {...p} /><Path d="M1 18h16" {...p} /><Rect x={17.5} y={8} width={5} height={11} rx={1.2} {...p} /></>)}
        </Svg>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="bold" style={{ fontSize: 16 }}>{title}</Text>
        <Text style={textStyles.muted}>{desc}</Text>
      </View>
      <Text weight="bold" style={{ color: colors.muted, fontSize: 20 }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
  option: {
    flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16,
  },
  optionIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
});
