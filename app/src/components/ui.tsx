// 여러 화면에서 같이 쓰는 작은 부품들 (글자, 카드, 버튼, 알약 표시, 선택 버튼)
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text as RNText, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { colors, fonts } from "../theme";

type Weight = "regular" | "bold" | "heavy";

export function Text({ weight = "regular", style, ...rest }: TextProps & { weight?: Weight }) {
  return <RNText {...rest} style={[{ fontFamily: fonts[weight], color: colors.ink, fontSize: 15 }, style]} />;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text weight="bold" style={styles.label}>{children}</Text>;
}

type ButtonKind = "primary" | "secondary" | "danger";
export function Button({
  title, onPress, kind = "secondary", disabled, style, big,
}: { title: string; onPress: () => void; kind?: ButtonKind; disabled?: boolean; style?: StyleProp<ViewStyle>; big?: boolean }) {
  const bg = kind === "primary" ? colors.accent : colors.surface;
  const border = kind === "primary" ? colors.accent : kind === "danger" ? colors.warn : colors.line;
  const fg = kind === "primary" ? "#FFFFFF" : kind === "danger" ? colors.warn : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn, big && styles.btnBig,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text weight="bold" style={{ color: fg, fontSize: big ? 17 : 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Pill({ kind, children }: { kind: "ok" | "warn" | "neutral"; children: ReactNode }) {
  const bg = kind === "ok" ? colors.okBg : kind === "warn" ? colors.warnBg : colors.bg;
  const fg = kind === "ok" ? colors.ok : kind === "warn" ? colors.warn : colors.muted;
  return (
    <View style={[styles.pill, { backgroundColor: bg }, kind === "neutral" && { borderWidth: 1, borderColor: colors.line }]}>
      <Text weight={kind === "neutral" ? "regular" : "bold"} style={{ color: fg, fontSize: 13 }}>{children}</Text>
    </View>
  );
}

export function Segmented<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segBtn, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.line }, on && { backgroundColor: colors.accent }]}
          >
            <Text weight={on ? "bold" : "regular"} style={{ color: on ? "#FFFFFF" : colors.ink }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ScreenTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ gap: 2, marginBottom: 4 }}>
      <Text weight="heavy" style={{ fontSize: 24, letterSpacing: -0.3 }}>{title}</Text>
      {!!sub && <Text style={{ color: colors.muted, fontSize: 13 }}>{sub}</Text>}
    </View>
  );
}

export const textStyles: Record<string, TextStyle> = {
  muted: { color: colors.muted, fontSize: 13 },
  num: { fontFamily: fonts.heavy, fontVariant: ["tabular-nums"], letterSpacing: -0.5 },
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, gap: 12 },
  label: { fontSize: 12, color: colors.muted, letterSpacing: 0.5 },
  btn: { minHeight: 46, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  btnBig: { minHeight: 56 },
  pill: { alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  seg: { flexDirection: "row", borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: "hidden", backgroundColor: colors.surface },
  segBtn: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center" },
});
