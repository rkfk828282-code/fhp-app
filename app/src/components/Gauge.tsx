// 경추 각도 게이지: 30°~65° 반원, 거북목(빨강)·주의(노랑)·바른 자세(초록) 구간 + 바늘
import { View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { colors, fonts } from "../theme";
import { moodOf, type Mood } from "./Turtle";
import { Pill, Text, textStyles } from "./ui";

export const MOOD_LABEL: Record<Mood, string> = { good: "바른 자세", strain: "주의", bad: "거북목" };

export function Gauge({ cva, threshold, sub }: { cva: number; threshold: number; sub?: string }) {
  const lo = 30, hi = 65, cx = 150, cy = 140, R = 110, sw = 18;
  const ang = (v: number) => Math.PI * (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo));
  const pt = (v: number, r = R) => [cx + r * Math.cos(ang(v)), cy - r * Math.sin(ang(v))] as const;
  const arc = (a: number, b: number, c: string) => {
    const [x1, y1] = pt(a), [x2, y2] = pt(b);
    return <Path d={`M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}`} stroke={c} strokeWidth={sw} fill="none" />;
  };
  const [nx, ny] = pt(cva, R - 30);
  const mood = moodOf(cva, threshold);
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Svg width="100%" height={175} viewBox="0 0 300 175" style={{ maxWidth: 320 }}
        accessibilityLabel={`CVA ${cva.toFixed(1)}도, ${MOOD_LABEL[mood]}`}>
        {arc(lo, threshold - 5 - 0.4, colors.warn)}
        {arc(threshold - 5 + 0.4, threshold - 0.4, colors.tragus)}
        {arc(threshold + 0.4, hi, colors.ok)}
        {[lo, threshold - 5, threshold, hi].map((v) => {
          const [x, y] = pt(v, R + 22);
          return <SvgText key={v} x={x} y={y + 4} textAnchor="middle" fontSize={11} fontFamily={fonts.regular} fill={colors.muted}>{`${v}°`}</SvgText>;
        })}
        <Line x1={cx} y1={cy} x2={nx} y2={ny} stroke={colors.ink} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={cx} cy={cy} r={9} fill={colors.ink} />
        <Circle cx={cx} cy={cy} r={4} fill={colors.surface} />
      </Svg>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={[textStyles.num, { fontSize: 36 }]}>{cva.toFixed(1)}°</Text>
        <Pill kind={mood === "good" ? "ok" : "warn"}>{MOOD_LABEL[mood]}</Pill>
      </View>
      {!!sub && <Text style={[textStyles.muted, { textAlign: "center" }]}>{sub}</Text>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 12 }}>
        {([[colors.warn, `거북목 ${threshold - 5}° 미만`], [colors.tragus, "주의"], [colors.ok, `바른 자세 ${threshold}° 이상`]] as const).map(([c, l]) => (
          <View key={l} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c }} />
            <Text style={[textStyles.muted, { fontSize: 12 }]}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** 운동 전·후 막대 2개 */
export const C_BEFORE = "#8C7FE8", C_AFTER = "#16A585"; // 남색 배경에서 색약 검사 통과
export function BeforeAfterBars({ before, after }: { before: number; after: number }) {
  const lo = Math.min(before, after) - 6, H = 120, top = Math.max(before, after);
  const h = (v: number) => ((v - lo) / (top - lo)) * H;
  const Bar = ({ v, c, l }: { v: number; c: string; l: string }) => (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Text weight="bold" style={{ fontVariant: ["tabular-nums"] }}>{v.toFixed(1)}°</Text>
      <View style={{ width: 56, height: h(v), backgroundColor: c, borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
      <Text style={textStyles.muted}>{l}</Text>
    </View>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 22, paddingTop: 6 }}>
      <Bar v={before} c={C_BEFORE} l="운동 전" />
      <Text style={[textStyles.muted, { fontSize: 22, paddingBottom: 60 }]}>→</Text>
      <Bar v={after} c={C_AFTER} l="운동 후" />
    </View>
  );
}
