// 화면 아래 탭 (홈 / 측정 / 기록 / 운동 / MY)
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import type { TabKey } from "../nav";
import { Icon } from "./icons";
import { Text } from "./ui";

const TABS: { key: TabKey; label: string }[] = [
  { key: "home", label: "홈" },
  { key: "measure", label: "측정" },
  { key: "records", label: "기록" },
  { key: "exercise", label: "운동" },
  { key: "my", label: "MY" },
];

export function TabBar({ value, onChange }: { value: TabKey; onChange: (t: TabKey) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((t) => {
        const on = t.key === value;
        const color = on ? colors.accent : colors.muted;
        return (
          <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(t.key)} style={styles.tab}>
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
