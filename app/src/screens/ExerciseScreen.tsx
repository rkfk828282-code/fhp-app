// 운동 탭: 다음 알림까지 남은 시간 + 운동 순서 안내(원형 카운트다운)
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Vibration, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import Svg, { Circle } from "react-native-svg";
import { Bar, Button, Card, PageHead, Pill, SecHead, Text, textStyles } from "../components/ui";
import { useNav } from "../nav";
import { streakDays, todayCount, useAppState } from "../store/AppState";
import { colors } from "../theme";
import { askPermission, cancelReminder, scheduleReminder, secondsToNext } from "../utils/reminder";
import { ROUTINE, ROUTINE_SEC } from "../utils/routine";

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function ExerciseScreen() {
  const insets = useSafeAreaInsets();
  const { sessions, settings, setReminder, addSession } = useAppState();
  const { go, setMyPanel, setStartTag } = useNav();
  const r = settings.reminder;
  const [mode, setMode] = useState<"idle" | "run" | "done">("idle");
  const [step, setStep] = useState(0);
  const [left, setLeft] = useState(ROUTINE[0].sec);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(Date.now());
  const last = useRef(Date.now());

  // 0.25초마다: 운동 카운트다운, 다음 알림까지 남은 시간
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (mode === "run" && !paused) {
        const dt = (t - last.current) / 1000;
        setLeft((l) => l - dt);
      }
      last.current = t;
    }, 250);
    return () => clearInterval(id);
  }, [mode, paused]);

  // 시간이 다 되면 다음 동작으로
  useEffect(() => {
    if (mode === "run" && left <= 0) goStep(step + 1);
  }, [left, mode]);

  // 운동하는 동안 화면이 꺼지지 않게 (켠 적이 있을 때만 끔)
  useEffect(() => {
    if (mode !== "run") return;
    activateKeepAwakeAsync("exercise").catch(() => {});
    return () => { Promise.resolve(deactivateKeepAwake("exercise")).catch(() => {}); };
  }, [mode]);

  function goStep(i: number) {
    if (i >= ROUTINE.length) { setMode("done"); addSession(); Vibration.vibrate([0, 120, 80, 120]); return; }
    const k = Math.max(0, i);
    setStep(k); setLeft(ROUTINE[k].sec); last.current = Date.now(); Vibration.vibrate(80);
  }
  const start = () => { setMode("run"); setPaused(false); goStep(0); };

  const toggleReminder = async () => {
    if (r.on) { await cancelReminder(); setReminder({ on: false, startedAt: null }); return; }
    const ok = await askPermission();
    if (!ok) { Alert.alert("알림 권한이 필요해요", "설정 → 애플리케이션 → 거북목 체크 → 알림에서 허용해 주세요."); return; }
    await scheduleReminder(r.min);
    setReminder({ on: true, startedAt: Date.now() });
  };

  /* ① 운동 중 */
  if (mode === "run") {
    const st = ROUTINE[step], R = 92, C = 2 * Math.PI * R, frac = Math.max(0, left) / st.sec;
    return (
      <View style={[styles.wrap, { flex: 1, paddingTop: insets.top + 16 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 44 }}>
          <Pressable onPress={() => setMode("idle")} hitSlop={10}><Text weight="bold" style={{ color: colors.accent }}>‹ 그만하기</Text></Pressable>
          <Text style={textStyles.muted}>{step + 1} / {ROUTINE.length}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {ROUTINE.map((_, i) => <View key={i} style={[styles.stepBar, i < step && { backgroundColor: colors.accent, opacity: 0.45 }, i === step && { backgroundColor: colors.accent }]} />)}
        </View>
        <Card style={{ alignItems: "center", paddingVertical: 22 }}>
          <Text style={{ fontSize: 40 }}>{st.art}</Text>
          <Text weight="heavy" style={{ fontSize: 22 }}>{st.name}</Text>
          <Text style={[textStyles.muted, { textAlign: "center", fontSize: 14, lineHeight: 22 }]}>{st.how}</Text>
          <View style={{ alignItems: "center", justifyContent: "center", marginVertical: 4 }}>
            <Svg width={220} height={220} viewBox="0 0 220 220">
              <Circle cx={110} cy={110} r={R} stroke={colors.accentSoft} strokeWidth={14} fill="none" />
              <Circle cx={110} cy={110} r={R} stroke={colors.accent} strokeWidth={14} fill="none" strokeLinecap="round"
                strokeDasharray={`${C} ${C}`} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 110 110)" />
            </Svg>
            <View style={StyleSheet.absoluteFill}>
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text style={[textStyles.num, { fontSize: 46 }]}>{Math.max(0, Math.ceil(left))}</Text>
                <Text style={textStyles.muted}>초 남음</Text>
              </View>
            </View>
          </View>
          <Text style={textStyles.muted}>{step + 1 < ROUTINE.length ? `다음: ${ROUTINE[step + 1].name}` : "마지막 동작이에요"}</Text>
        </Card>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title="이전" disabled={step === 0} onPress={() => goStep(step - 1)} style={{ flex: 1 }} />
          <Button kind="primary" big title={paused ? "계속하기" : "일시정지"} onPress={() => setPaused((p) => !p)} style={{ flex: 1.6 }} />
          <Button title="다음" onPress={() => goStep(step + 1)} style={{ flex: 1 }} />
        </View>
      </View>
    );
  }

  /* ② 완료 */
  if (mode === "done") {
    return (
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 28 }]}>
        <Card style={{ alignItems: "center", paddingVertical: 28 }}>
          <Text style={{ fontSize: 52 }}>🎉</Text>
          <Text weight="heavy" style={{ fontSize: 22 }}>오늘 {todayCount(sessions)}번째 운동 완료!</Text>
          <Text style={textStyles.muted}>연속 {streakDays(sessions)}일째 · 목표 하루 {settings.goal.daily}회</Text>
        </Card>
        <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
          <Text weight="bold" style={{ color: colors.ok }}>운동 효과를 기록해 보세요</Text>
          <Text style={{ fontSize: 13.5, lineHeight: 21 }}>지금 바로 측정해서 "운동 후"로 저장하면, 기록 탭에서 운동 전·후 차이를 볼 수 있어요.</Text>
          <Button kind="primary" title="운동 후 측정하기" onPress={() => { setMode("idle"); setStartTag("after"); go("measure", "photo"); }} />
        </Card>
        <Button title="운동 탭으로" onPress={() => setMode("idle")} />
      </ScrollView>
    );
  }

  /* ③ 기본 화면 */
  const done = todayCount(sessions);
  const secLeft = r.on && r.startedAt ? secondsToNext(r.startedAt, r.min, now) : 0;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <PageHead icon="exercise" title="자가운동" right={<Pill kind={r.on ? "ok" : "neutral"}>{r.on ? "알림 켜짐" : "알림 꺼짐"}</Pill>} />
      <Card style={{ gap: 10 }}>
        <Text style={[textStyles.muted, { textAlign: "center", fontSize: 12 }]}>다음 운동까지</Text>
        <Text style={[textStyles.num, { textAlign: "center", fontSize: r.on ? 52 : 34, color: r.on ? colors.ink : colors.muted, letterSpacing: r.on ? -0.5 : 2 }]}>
          {r.on ? mmss(secLeft) : "OFF"}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => { setMyPanel("alarm"); go("my"); }} style={styles.interval}>
          <Text style={{ fontSize: 14 }}>⏰ <Text weight="bold" style={{ color: colors.ok, fontSize: 14 }}>{r.min}분</Text>마다 알림 <Text style={[textStyles.muted, { fontSize: 13 }]}>· MY에서 변경 ›</Text></Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title={r.on ? "알림 끄기" : "알림 켜기"} onPress={toggleReminder} style={{ flex: 1 }} />
          <Button kind="primary" title="시작" onPress={start} style={{ flex: 1.4 }} />
        </View>
        <Text style={textStyles.muted}>화면을 꺼도 정해진 간격마다 폰 알림으로 알려 줘요.</Text>
      </Card>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={{ flex: 1, gap: 4 }}>
          <Text weight="heavy" style={{ fontSize: 19 }}>오늘</Text>
          <Text style={textStyles.muted}>목표 {settings.goal.daily}회</Text>
          <Text style={[textStyles.num, { fontSize: 32, marginTop: 4 }]}>{done}<Text style={[textStyles.muted, { fontSize: 14 }]}> / {settings.goal.daily}회</Text></Text>
          <Bar pct={(done / settings.goal.daily) * 100} />
        </Card>
        <Card style={{ flex: 1, gap: 4 }}>
          <Text weight="heavy" style={{ fontSize: 19 }}>연속</Text>
          <Text style={textStyles.muted}>하루라도 하면 이어져요</Text>
          <Text style={[textStyles.num, { fontSize: 32, marginTop: 4 }]}>{streakDays(sessions)}<Text style={[textStyles.muted, { fontSize: 14 }]}>일</Text></Text>
          <Text style={{ position: "absolute", right: 10, bottom: 6, fontSize: 36 }}>🔥</Text>
        </Card>
      </View>

      <SecHead title="운동 순서" right={<Text style={textStyles.muted}>총 {Math.round((ROUTINE_SEC / 60) * 10) / 10}분</Text>} />
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {ROUTINE.map((x, i) => (
          <View key={x.name} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
            <View style={styles.num}><Text weight="bold" style={{ color: colors.ok }}>{i + 1}</Text></View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text weight="bold">{x.name}</Text>
              <Text style={textStyles.muted}>{x.how}</Text>
            </View>
            <Text style={textStyles.muted}>{x.sec}초</Text>
          </View>
        ))}
      </Card>
      <Button title="운동 전 측정 먼저 하기" onPress={() => { setStartTag("before"); go("measure", "photo"); }} />
      <Text style={[textStyles.muted, { textAlign: "center" }]}>통증이 있으면 바로 멈추세요. 운동 목록은 전문가 지도에 맞게 바꿀 수 있어요.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
  stepBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line },
  interval: { alignSelf: "center", backgroundColor: colors.bg, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
});
