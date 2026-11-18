// 기록 탭: 차분한 달력(운동한 날 = 민트 동그라미, 측정한 날 = 점) → 고른 날 기록 → CVA 변화 → 운동 효과
// 노트북 웹(server/public/index.html의 recordsScreen)과 같은 구성
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { C_AFTER, C_BEFORE } from "../components/Gauge";
import { moodOf, Turtle } from "../components/Turtle";
import { Card, PageHead, Segmented, Text, textStyles } from "../components/ui";
import { useNav } from "../nav";
import { dayKey, useAppState, type MeasureRecord } from "../store/AppState";
import { colors, fonts, TAG_LABEL } from "../theme";
import { formatDateTime } from "../utils/format";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");
const parseDay = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (k: string, n: number) => { const d = parseDay(k); d.setDate(d.getDate() + n); return dayKey(d); };
const dayOf = (iso: string) => dayKey(new Date(iso));
const avgOf = (l: MeasureRecord[]) => (l.length ? l.reduce((s, r) => s + r.cva, 0) / l.length : null);
const sgn = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}°`;
const hm = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

type Pair = { day: string; b: MeasureRecord; a: MeasureRecord; d: number };

export default function RecordsScreen(_: { onMeasure?: () => void }) {
  const insets = useSafeAreaInsets();
  const { records, sessions, settings, deleteRecord } = useAppState();
  const { showSummary } = useNav();
  const today = dayKey();
  const [sel, setSel] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7)); // "YYYY-MM"
  const [span, setSpan] = useState<"week" | "month">("week");

  const recs = useMemo(() => [...records].sort((a, b) => a.date.localeCompare(b.date)), [records]);
  const recsOn = (k: string) => recs.filter((r) => dayOf(r.date) === k);
  const sessOn = (k: string) => sessions.filter((s) => s.day === k);
  const pairs = useMemo(() => {
    const out: Pair[] = [];
    recs.forEach((b, i) => {
      if (b.tag !== "before") return;
      const k = dayOf(b.date), a = recs.slice(i + 1).find((r) => r.tag === "after" && dayOf(r.date) === k);
      if (a) out.push({ day: k, b, a, d: a.cva - b.cva });
    });
    return out;
  }, [recs]);

  // 이번 달 요약
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`, to = dayKey(new Date(y, m, 0));
  const recM = recs.filter((r) => { const k = dayOf(r.date); return k >= from && k <= to; });
  const exDays = new Set(sessions.filter((s) => s.day >= from && s.day <= to).map((s) => s.day)).size;
  const moveMonth = (n: number) => setMonth(dayKey(new Date(y, m - 1 + n, 1)).slice(0, 7));

  const confirmDelete = (r: MeasureRecord) =>
    Alert.alert("기록 삭제", `${formatDateTime(r.date)} · ${r.cva.toFixed(1)}° 기록을 지울까요?`, [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => deleteRecord(r.id) },
    ]);
  const openResult = (r: MeasureRecord) => { const k = recs.indexOf(r); showSummary({ rec: r, prev: k > 0 ? recs[k - 1] : null }); };

  // 고른 날
  const selD = parseDay(sel), selRecs = recsOn(sel), selSess = sessOn(sel), selPair = pairs.find((p) => p.day === sel);
  const items = [
    ...selRecs.map((r) => ({ t: r.date, kind: "m" as const, r })),
    ...selSess.map((s) => ({ t: s.at, kind: "e" as const, s })),
  ].sort((a, b) => a.t.localeCompare(b.t));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <PageHead icon="records" title="기록" />

      {/* 1. 달력 */}
      <Card style={{ gap: 10 }}>
        <View style={styles.calNav}>
          <Pressable accessibilityLabel="이전 달" onPress={() => moveMonth(-1)} hitSlop={10} style={styles.navBtn}><Text style={styles.navTxt}>‹</Text></Pressable>
          <Text weight="bold" style={{ fontSize: 16 }}>{y}년 {m}월</Text>
          <Pressable accessibilityLabel="다음 달" onPress={() => moveMonth(1)} hitSlop={10} style={styles.navBtn}><Text style={styles.navTxt}>›</Text></Pressable>
        </View>
        <View style={styles.sum}>
          <Sum label="운동한 날" value={`${exDays}`} unit="일" />
          <Sum label="평균 CVA" value={recM.length ? `${avgOf(recM)!.toFixed(1)}°` : "–"} />
          <Sum label="측정" value={`${recM.length}`} unit="회" />
        </View>
        <Calendar y={y} m={m - 1} sel={sel} today={today} onPick={setSel}
          exercised={(k) => sessOn(k).length > 0} measured={(k) => recsOn(k).length > 0} />
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 16 }}>
          <View style={styles.legend}><View style={styles.lgEx} /><Text style={[textStyles.muted, { fontSize: 12 }]}>운동한 날</Text></View>
          <View style={styles.legend}><View style={styles.lgMs} /><Text style={[textStyles.muted, { fontSize: 12 }]}>측정한 날</Text></View>
        </View>
      </Card>

      {/* 2. 고른 날 */}
      <Card style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text weight="bold" style={{ fontSize: 16 }}>{sel === today ? "오늘" : `${selD.getMonth() + 1}월 ${selD.getDate()}일 (${WEEK[selD.getDay()]})`}</Text>
          <Text style={textStyles.muted}>{selSess.length ? `운동 ${selSess.length}회` : "운동 안 함"} · {selRecs.length ? `측정 ${selRecs.length}회` : "측정 없음"}</Text>
        </View>
        {!!selPair && (
          <View style={styles.pairNote}>
            <Text style={textStyles.muted}>운동 전 {selPair.b.cva.toFixed(1)}° → 운동 후 {selPair.a.cva.toFixed(1)}°  <Text weight="bold">{sgn(selPair.d)}</Text></Text>
          </View>
        )}
        {items.length === 0 && <Text style={textStyles.muted}>이 날은 기록이 없어요.</Text>}
        {items.map((it, i) => (
          <View key={it.kind + it.t + i} style={[styles.item, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
            {it.kind === "m" ? (
              <>
                <Turtle mood={moodOf(it.r.cva, it.r.threshold)} height={40} />
                <Pressable style={{ flex: 1, gap: 2 }} accessibilityRole="button" onPress={() => openResult(it.r)}>
                  <Text style={[textStyles.num, { fontSize: 18 }]}>{it.r.cva.toFixed(1)}°</Text>
                  <Text style={textStyles.muted}>{hm(it.r.date)} 측정{it.r.tag !== "none" ? ` · ${TAG_LABEL[it.r.tag]}` : ""} · 결과 보기 ›</Text>
                </Pressable>
                <Pressable accessibilityLabel="이 측정 삭제" onPress={() => confirmDelete(it.r)} hitSlop={8} style={{ padding: 6 }}>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>삭제</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.evIc}><Text style={{ fontSize: 22 }}>🧘</Text></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text weight="bold">목 운동 완료</Text>
                  <Text style={textStyles.muted}>{hm(it.s.at)}</Text>
                </View>
              </>
            )}
          </View>
        ))}
      </Card>

      {/* 3. CVA 변화 */}
      <Trend recs={recs} span={span} setSpan={setSpan} threshold={settings.threshold} />

      {/* 4. 운동 효과 */}
      <Effect pairs={pairs.slice(-5).reverse()} />
    </ScrollView>
  );
}

function Sum({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={[textStyles.muted, { fontSize: 12 }]}>{label}</Text>
      <Text style={[textStyles.num, { fontSize: 18 }]}>{value}{!!unit && <Text style={[textStyles.muted, { fontSize: 12 }]}>{unit}</Text>}</Text>
    </View>
  );
}

function Calendar({ y, m, sel, today, onPick, exercised, measured }: {
  y: number; m: number; sel: string; today: string; onPick: (k: string) => void; exercised: (k: string) => boolean; measured: (k: string) => boolean;
}) {
  const first = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => dayKey(new Date(y, m, i + 1)))];
  while (cells.length % 7) cells.push(null);
  return (
    <View>
      <View style={styles.row7}>{WEEK.map((w) => <Text key={w} style={[styles.cell, textStyles.muted, { fontSize: 12, textAlign: "center" }]}>{w}</Text>)}</View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={styles.row7}>
          {cells.slice(r * 7, r * 7 + 7).map((k, i) => {
            if (!k) return <View key={i} style={styles.cell} />;
            const ex = exercised(k), ms = measured(k), isSel = k === sel, isToday = k === today;
            return (
              <Pressable key={k} style={styles.cell} onPress={() => onPick(k)} accessibilityRole="button"
                accessibilityLabel={`${Number(k.slice(5, 7))}월 ${Number(k.slice(8))}일${ex ? ", 운동함" : ""}${ms ? ", 측정함" : ""}`}>
                <View style={[styles.dayCircle, ex && { backgroundColor: colors.accentSoft }, isToday && !isSel && { borderWidth: 1.5, borderColor: colors.muted }, isSel && { backgroundColor: colors.accent }]}>
                  <Text weight={ex || isSel ? "bold" : "regular"} style={{ fontSize: 13, color: isSel ? colors.onAccent : ex ? colors.accent : colors.ink }}>{Number(k.slice(8))}</Text>
                </View>
                <View style={[styles.dot, ms && { backgroundColor: colors.ink, opacity: 0.7 }]} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Trend({ recs, span, setSpan, threshold }: { recs: MeasureRecord[]; span: "week" | "month"; setSpan: (s: "week" | "month") => void; threshold: number }) {
  const { width } = useWindowDimensions();
  const days = span === "week" ? 7 : 30, end = dayKey(), start = addDays(end, -(days - 1));
  const pts: { k: string; a: number }[] = [];
  for (let k = start; k <= end; k = addDays(k, 1)) { const l = recs.filter((r) => dayOf(r.date) === k); const a = avgOf(l); if (a !== null) pts.push({ k, a }); }
  const seg = <Segmented options={[{ value: "week", label: "최근 1주" }, { value: "month", label: "최근 1달" }]} value={span} onChange={setSpan} />;
  if (pts.length < 2) {
    return <Card style={{ gap: 8 }}><Text weight="bold" style={{ fontSize: 16 }}>CVA 변화</Text>{seg}<Text style={textStyles.muted}>이 기간에 측정이 2번 이상 있으면 변화가 보여요.</Text></Card>;
  }
  const W = width - 64, H = 150, L = 34, R = 14, T = 16, B = 22;
  const vals = pts.map((p) => p.a).concat(threshold), lo = Math.floor(Math.min(...vals) - 1.5), hi = Math.ceil(Math.max(...vals) + 1.5);
  const idx = (k: string) => Math.round((parseDay(k).getTime() - parseDay(start).getTime()) / 864e5);
  const X = (k: string) => L + (idx(k) * (W - L - R)) / (days - 1), Y = (v: number) => T + ((hi - v) * (H - T - B)) / (hi - lo);
  const ch = pts[pts.length - 1].a - pts[0].a, last = pts[pts.length - 1];
  return (
    <Card style={{ gap: 8 }}>
      <Text weight="bold" style={{ fontSize: 16 }}>CVA 변화</Text>
      {seg}
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text style={[textStyles.num, { fontSize: 28 }]}>{sgn(ch)}</Text>
        <Text style={textStyles.muted}>{ch >= 0 ? "목이 조금씩 펴지고 있어요" : "조금 나빠졌어요. 운동을 이어 가 봐요"}</Text>
      </View>
      <Svg width={W} height={H}>
        {[lo, Math.round((lo + hi) / 2), hi].map((v) => (
          <G key={v}>
            <Line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke={colors.line} />
            <SvgText x={L - 6} y={Y(v) + 4} textAnchor="end" fontSize={10} fill={colors.muted} fontFamily={fonts.regular}>{`${v}°`}</SvgText>
          </G>
        ))}
        <Line x1={L} x2={W - R} y1={Y(threshold)} y2={Y(threshold)} stroke={colors.warn} strokeWidth={1.2} strokeDasharray="4 4" />
        <Path d={pts.map((p, i) => `${i ? "L" : "M"}${X(p.k)} ${Y(p.a)}`).join(" ")} stroke={colors.accent} strokeWidth={2} fill="none" />
        {pts.map((p) => <Circle key={p.k} cx={X(p.k)} cy={Y(p.a)} r={4} fill={colors.accent} stroke={colors.surface} strokeWidth={2} />)}
        <SvgText x={X(last.k)} y={Y(last.a) - 10} textAnchor="end" fontSize={11} fontFamily={fonts.bold} fill={colors.ink}>{`${last.a.toFixed(1)}°`}</SvgText>
        <SvgText x={L} y={H - 6} fontSize={10} fill={colors.muted} fontFamily={fonts.regular}>{`${parseDay(start).getMonth() + 1}/${parseDay(start).getDate()}`}</SvgText>
        <SvgText x={W - R} y={H - 6} textAnchor="end" fontSize={10} fill={colors.muted} fontFamily={fonts.regular}>{`${parseDay(end).getMonth() + 1}/${parseDay(end).getDate()}`}</SvgText>
      </Svg>
    </Card>
  );
}

function Effect({ pairs }: { pairs: Pair[] }) {
  const { width } = useWindowDimensions();
  if (!pairs.length) {
    return (
      <Card style={{ gap: 6 }}>
        <Text weight="bold" style={{ fontSize: 16 }}>운동 효과</Text>
        <Text style={textStyles.muted}>운동 탭에서 <Text weight="bold">운동 전 측정 → 운동 → 운동 후 측정</Text>을 하면, 운동하고 목 각도가 얼마나 달라졌는지 여기서 보여요.</Text>
      </Card>
    );
  }
  const all = pairs.flatMap((p) => [p.b.cva, p.a.cva]), lo = Math.floor(Math.min(...all) - 1), hi = Math.ceil(Math.max(...all) + 1);
  const W = width - 64, L = 44, R = 50, rowH = 32, T = 8, H = T + pairs.length * rowH;
  const X = (v: number) => L + ((v - lo) * (W - L - R)) / (hi - lo);
  const avg = pairs.reduce((s, p) => s + p.d, 0) / pairs.length;
  return (
    <Card style={{ gap: 8 }}>
      <Text weight="bold" style={{ fontSize: 16 }}>운동 효과</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <Text style={[textStyles.num, { fontSize: 28 }]}>{sgn(avg)}</Text>
        <Text style={textStyles.muted}>운동하고 나면 목 각도가 평균 이만큼 달라졌어요</Text>
      </View>
      <Svg width={W} height={H}>
        {pairs.map((p, i) => {
          const yy = T + i * rowH + rowH / 2, d = parseDay(p.day);
          return (
            <G key={p.day + i}>
              <SvgText x={0} y={yy + 4} fontSize={11} fill={colors.muted} fontFamily={fonts.regular}>{`${d.getMonth() + 1}/${d.getDate()}`}</SvgText>
              <Line x1={L} x2={W - R} y1={yy} y2={yy} stroke={colors.line} />
              <Line x1={X(p.b.cva)} x2={X(p.a.cva)} y1={yy} y2={yy} stroke={colors.muted} strokeWidth={2} />
              <Circle cx={X(p.b.cva)} cy={yy} r={5.5} fill={C_BEFORE} stroke={colors.surface} strokeWidth={2} />
              <Circle cx={X(p.a.cva)} cy={yy} r={5.5} fill={C_AFTER} stroke={colors.surface} strokeWidth={2} />
              <SvgText x={W} y={yy + 4} textAnchor="end" fontSize={12} fontFamily={fonts.bold} fill={colors.ink}>{sgn(p.d)}</SvgText>
            </G>
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={[styles.lgDot, { backgroundColor: C_BEFORE }]} /><Text style={textStyles.muted}>운동 전 →</Text>
        <View style={[styles.lgDot, { backgroundColor: C_AFTER }]} /><Text style={textStyles.muted}>운동 후 · 최근 {pairs.length}번</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
  calNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: { width: 40, height: 36, alignItems: "center", justifyContent: "center" },
  navTxt: { fontSize: 22, color: colors.muted },
  sum: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  row7: { flexDirection: "row" },
  cell: { flex: 1, alignItems: "center", paddingVertical: 2, gap: 3 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legend: { flexDirection: "row", alignItems: "center", gap: 6 },
  lgEx: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent },
  lgMs: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.ink, opacity: 0.7 },
  lgDot: { width: 9, height: 9, borderRadius: 5 },
  pairNote: { backgroundColor: colors.surface2, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  evIc: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
});
