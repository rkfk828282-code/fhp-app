// 화면 아래 탭 (측정 / 기록 / 운동 / 설정)
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../theme";
import { Text } from "./ui";

export type TabKey = "measure" | "records" | "exercise" | "settings";

const TABS: { key: TabKey; label: string }[] = [
  { key: "measure", label: "측정" },
  { key: "records", label: "기록" },
  { key: "exercise", label: "운동" },
  { key: "settings", label: "설정" },
];

function Icon({ name, color }: { name: TabKey; color: string }) {
  const p = { stroke: color, strokeWidth: 1.8, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {name === "measure" && (<><Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...p} /><Circle cx={12} cy={13} r={3.5} {...p} /></>)}
      {name === "records" && <Path d="M4 19h16M6 15l4-4 3 3 5-6" {...p} />}
      {name === "exercise" && (<><Circle cx={12} cy={13} r={7} {...p} /><Path d="M12 9v4l2.5 2M9.5 3h5" {...p} /></>)}
      {name === "settings" && (<><Rect x={4} y={6} width={16} height={2} rx={1} {...p} /><Rect x={4} y={16} width={16} height={2} rx={1} {...p} /><Circle cx={9} cy={7} r={2.2} {...p} fill={colors.surface} /><Circle cx={15} cy={17} r={2.2} {...p} fill={colors.surface} /></>)}
    </Svg>
  );
}

export function TabBar({ value, onChange }: { value: TabKey; onChange: (t: TabKey) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((t) => {
        const on = t.key === value;
        const color = on ? colors.accent : colors.muted;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(t.key)}
            style={styles.tab}
          >
            <Icon name={t.key} color={color} />
            <Text weight={on ? "bold" : "regular"} style={{ color, fontSize: 12 }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 6 },
  tab: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 4, minHeight: 52, justifyContent: "center" },
});
