// 홈: 박스형 메뉴 + 넘어가는 배너 + 오늘의 팁 + 바로가기 + 최근 측정
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Ellipse, Line, Path } from "react-native-svg";
import { Icon } from "../components/icons";
import { Bar, Card, PageHead, Pill, SecHead, Text, textStyles } from "../components/ui";
import { useNav, type Route, type TabKey } from "../nav";
import { sortedRecords, todayCount, useAppState } from "../store/AppState";
import { colors, TAG_LABEL } from "../theme";
import { describeCVA } from "../utils/cva";
import { formatDateTime } from "../utils/format";
import { TIPS } from "../utils/routine";

type Slide = { bg: string; t: string; s: string; art: string; tab: TabKey; route?: Route };
const SLIDES: Slide[] = [
  { bg: "#0B9B5A", t: "이번 주 목 각도\n얼마나 좋아졌을까?", s: "주간 변화 확인하기", art: "📈", tab: "records" },
  { bg: "#E0882F", t: "CVA가 뭐예요?\n목 각도 쉽게 알기", s: "1분 설명 읽기", art: "📐", tab: "home", route: "cva" },
  { bg: "#3A7BD5", t: "50분 앉아 있었다면\n목 운동할 시간", s: "자가운동 타이머 보기", art: "⏰", tab: "exercise" },
  { bg: "#7A5AF8", t: "혼자서도 정확하게\n노트북 보며 촬영", s: "노트북 촬영 시작하기", art: "💻", tab: "measure", route: "live" },
];

export function NeckArt({ size = 150 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 150 150">
      <Path d="M38 150 L44 112 Q50 92 70 88 L86 90 Q104 98 106 120 L108 150 Z" fill="#7FC9A0" />
      <Path d="M64 92 L84 62 L100 68 L86 96 Z" fill="#7FC9A0" />
      <Ellipse cx={102} cy={48} rx={26} ry={30} fill="#9AD7B4" />
      <Line x1={66} y1={90} x2={92} y2={54} stroke={colors.tragus} strokeWidth={2.5} />
      <Line x1={66} y1={90} x2={112} y2={90} stroke={colors.c7} strokeWidth={2.5} strokeDasharray="5 4" />
      <Path d="M84 90 A18 18 0 0 0 76.6 75.5" fill="none" stroke={colors.ink} strokeWidth={2} />
      <Circle cx={92} cy={54} r={4.5} fill={colors.tragus} stroke={colors.ink} strokeWidth={1.5} />
      <Circle cx={66} cy={90} r={4.5} fill={colors.c7} stroke={colors.ink} strokeWidth={1.5} />
    </Svg>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { records, sessions, settings } = useAppState();
  const { go } = useNav();
  const recs = sortedRecords(records);
  const last = recs[recs.length - 1];
  const goalGap = last ? settings.goal.cva - last.cva : null;
  const goalProg = last ? ((last.cva - 40) / (settings.goal.cva - 40)) * 100 : 0;
  const tip = TIPS[new Date().getDate() % TIPS.length];

  // 배너: 4초마다 오른쪽으로만 넘어감 (마지막 뒤에 첫 장 복사본 → 도착하면 진짜 첫 장으로 바꿔치기)
  const scroller = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const holdUntil = useRef(0);
  const index = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() < holdUntil.current) return;
      const next = Math.min(index.current + 1, SLIDES.length);
      scroller.current?.scrollTo({ x: next * width, animated: true });
    }, 4000);
    return () => clearInterval(id);
  }, [width]);
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    let i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i >= SLIDES.length) { scroller.current?.scrollTo({ x: 0, animated: false }); i = 0; }
    index.current = i; setPage(i);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <PageHead icon="logo" brand title="거북목 체크"
        right={<Pressable accessibilityRole="button" accessibilityLabel="운동 알림" onPress={() => go("exercise")} hitSlop={8} style={{ padding: 8 }}>
          <Icon name="bell" color={colors.ink} /></Pressable>} />

      {/* 박스 3개: 자세 측정(크게) | 내 목표 / 오늘 운동 */}
      <View style={styles.bento}>
        <Pressable accessibilityRole="button" onPress={() => go("measure")} style={[styles.tile, styles.tall]}>
          <View style={{ padding: 16, paddingBottom: 8, gap: 4 }}>
            <Text weight="heavy" style={styles.h3}>자세 측정</Text>
            <Text style={styles.desc}>옆모습으로 목 각도 재기</Text>
          </View>
          <View style={styles.badge}><Text weight="heavy" style={{ color: colors.warn, fontSize: 12 }}>CVA</Text></View>
          <View style={styles.scene}><NeckArt size={140} /></View>
        </Pressable>
        <View style={{ flex: 1, gap: 10 }}>
          <Pressable accessibilityRole="button" onPress={() => go("my")} style={styles.tile}>
            <Text weight="heavy" style={styles.h3}>내 목표</Text>
            <Text style={styles.desc}>CVA {settings.goal.cva}° 이상 목표</Text>
            <View style={styles.tag}><Text weight="bold" style={styles.tagText}>{!last ? "측정 전" : goalGap! > 0 ? `${goalGap!.toFixed(1)}° 남음` : "목표 달성!"}</Text></View>
            <Bar pct={goalProg} style={{ width: "62%", marginTop: 8 }} />
            <Text style={styles.art}>🎯</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => go("exercise")} style={styles.tile}>
            <Text weight="heavy" style={styles.h3}>오늘 운동</Text>
            <Text style={styles.desc}>목 스트레칭 · 타이머</Text>
            <View style={styles.tag}><Text weight="bold" style={styles.tagText}>{todayCount(sessions)} / {settings.goal.daily}회</Text></View>
            <Text style={styles.art}>⏱️</Text>
          </Pressable>
        </View>
      </View>

      {/* 넘어가는 배너 */}
      <View style={{ marginHorizontal: -16 }}>
        <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => { holdUntil.current = Date.now() + 6000; }}
          onMomentumScrollEnd={onScrollEnd}>
          {[...SLIDES, SLIDES[0]].map((sl, i) => (
            <Pressable key={i} accessibilityRole="button" accessibilityElementsHidden={i === SLIDES.length}
              onPress={() => go(sl.tab, sl.route)} style={[styles.slide, { width, backgroundColor: sl.bg }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text weight="heavy" style={{ color: "#fff", fontSize: 21, lineHeight: 28 }}>{sl.t}</Text>
                <Text style={{ color: "#ffffffdd", fontSize: 13.5 }}>{sl.s}</Text>
              </View>
              <Text style={{ fontSize: 52 }}>{sl.art}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.pager}><Text weight="bold" style={{ color: "#fff", fontSize: 12 }}>{(page % SLIDES.length) + 1}/{SLIDES.length}</Text></View>
      </View>

      <View style={styles.tipStrip}>
        <Text style={{ fontSize: 26 }}>💡</Text>
        <View style={{ flex: 1 }}>
          <Text weight="bold" style={{ fontSize: 14.5 }}>오늘의 자세 팁</Text>
          <Text style={textStyles.muted}>{tip}</Text>
        </View>
      </View>

      <SecHead title="바로가기" />
      <View style={styles.shortcuts}>
        {([["📸", "폰 촬영", "measure", "photo"], ["💻", "노트북 촬영", "measure", "live"], ["🧘", "스트레칭", "exercise", undefined], ["📊", "주간 리포트", "records", undefined]] as const).map(([e, l, t, r]) => (
          <Pressable key={l} accessibilityRole="button" onPress={() => go(t, r)} style={styles.sc}>
            <Text style={{ fontSize: 32 }}>{e}</Text>
            <Text weight="bold" style={{ fontSize: 13 }}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <SecHead title="최근 측정" right={<Pressable onPress={() => go("records")} hitSlop={8}><Text style={textStyles.muted}>기록 전체 ›</Text></Pressable>} />
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {recs.length === 0 && <View style={styles.row}><Text style={textStyles.muted}>측정하면 여기에 최근 결과가 보여요.</Text></View>}
        {[...recs].reverse().slice(0, 3).map((r, i) => {
          const d = describeCVA(r.cva, r.threshold);
          return (
            <View key={r.id} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[textStyles.num, { fontSize: 18, color: colors[d.kind] }]}>{r.cva.toFixed(1)}°</Text>
                <Text style={textStyles.muted}>{formatDateTime(r.date)}{r.tag !== "none" ? ` · ${TAG_LABEL[r.tag]}` : ""}</Text>
              </View>
              <Pill kind={d.kind}>{d.label}</Pill>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
  bento: { flexDirection: "row", gap: 10 },
  tile: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, gap: 4, overflow: "hidden", minHeight: 150 },
  tall: { padding: 0 },
  h3: { fontSize: 19, letterSpacing: -0.3 },
  desc: { fontSize: 13, color: colors.muted },
  badge: { position: "absolute", top: 14, right: 14, borderWidth: 1.5, borderColor: colors.warn, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 1 },
  scene: { flex: 1, backgroundColor: "#EAF6EF", alignItems: "center", justifyContent: "flex-end", minHeight: 170 },
  tag: { marginTop: 8, alignSelf: "flex-start", borderWidth: 1.5, borderColor: colors.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { color: colors.accent, fontSize: 13 },
  art: { position: "absolute", right: 10, bottom: 8, fontSize: 40 },
  slide: { minHeight: 150, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 22 },
  pager: { position: "absolute", right: 16, bottom: 12, backgroundColor: "#0004", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  tipStrip: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#FFF4E5", borderRadius: 16, padding: 14 },
  shortcuts: { flexDirection: "row", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 16 },
  sc: { flex: 1, alignItems: "center", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
});
