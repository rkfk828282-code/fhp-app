// 여러 화면에서 같이 쓰는 작은 부품들 (글자, 카드, 버튼, 알약 표시, 선택 버튼)
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text as RNText, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { colors, fonts } from "../theme";
import { Icon, type IconName } from "./icons";

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

/** 모든 탭의 맨 위 제목 줄: 높이·위치를 똑같이 (아이콘 칸 + 제목 + 오른쪽 칸) */
export function PageHead({ icon, title, right, brand, onIcon }: { icon: IconName; title: string; right?: ReactNode; brand?: boolean; onIcon?: () => void }) {
  const box = (
    <View style={[styles.headIcon, brand && { backgroundColor: colors.accent }]}>
      <Icon name={icon} color={brand ? "#fff" : colors.accent} size={22} width={brand ? 2.2 : 1.9} />
    </View>
  );
  return (
    <View style={styles.head}>
      {onIcon ? <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={onIcon}>{box}</Pressable> : box}
      <Text weight="heavy" numberOfLines={1} style={{ flex: 1, fontSize: 22, color: brand ? colors.accent : colors.ink }}>{title}</Text>
      {right}
    </View>
  );
}

/** 가로 칸 나눔 숫자 (예: 최근 CVA | 목표까지 | ...) */
export function KV({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <View style={styles.kv}>
      {items.map((it, i) => (
        <View key={it.label} style={[styles.kvItem, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.line }]}>
          <Text style={{ fontSize: 12, color: colors.muted }}>{it.label}</Text>
          <Text style={[textStyles.num, { fontSize: 18, color: it.color ?? colors.ink }]}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** 진행 막대 */
export function Bar({ pct, style }: { pct: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.bar, style]}><View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, pct))}%` }]} /></View>
  );
}

/** 알약 모양 선택 버튼들 (예: 30분 / 50분 / ...) */
export function Chips<T extends string | number>({ options, value, onChange, format }: { options: T[]; value: T; onChange: (v: T) => void; format: (v: T) => string }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable key={String(o)} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(o)}
            style={[styles.chip, on && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
            <Text weight="bold" style={{ color: on ? "#fff" : colors.ink, fontSize: 14 }}>{format(o)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 섹션 제목 줄 (오른쪽에 링크 등) */
export function SecHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
      <Text weight="heavy" style={{ fontSize: 18 }}>{title}</Text>
      {right}
    </View>
  );
}

export const textStyles: Record<string, TextStyle> = {
  muted: { color: colors.muted, fontSize: 13 },
  num: { fontFamily: fonts.heavy, fontVariant: ["tabular-nums"], letterSpacing: -0.5 },
};

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 10, height: 44 },
  headIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  kv: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  kvItem: { flex: 1, alignItems: "center", gap: 2 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.accentSoft, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 4 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, gap: 12 },
  label: { fontSize: 12, color: colors.muted, letterSpacing: 0.5 },
  btn: { minHeight: 46, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  btnBig: { minHeight: 56 },
  pill: { alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  seg: { flexDirection: "row", borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: "hidden", backgroundColor: colors.surface },
  segBtn: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center" },
});
