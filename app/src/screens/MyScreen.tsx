// MY: 설정 바로가기(맨 위) + 프로필 요약 + 배지 + 내 목표 설정
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import appJson from "../../app.json";
import { Button, Card, Chips, KV, PageHead, Pill, SecHead, Text, textStyles } from "../components/ui";
import { SERVER_URL } from "../config";
import { useNav } from "../nav";
import { sortedRecords, streakDays, todayCount, useAppState } from "../store/AppState";
import { colors } from "../theme";
import { formatDateTime } from "../utils/format";
import { askPermission, cancelReminder, scheduleReminder } from "../utils/reminder";
import { INTERVALS } from "../utils/routine";

export default function MyScreen() {
  const insets = useSafeAreaInsets();
  const { records, sessions, settings, setThreshold, setGoal, setReminder, clearAll } = useAppState();
  const { go, myPanel, setMyPanel } = useNav();
  const recs = sortedRecords(records), first = recs[0], last = recs[recs.length - 1];
  const gap = last ? settings.goal.cva - last.cva : null;
  const weekRecs = recs.filter((r) => new Date(r.date).getTime() >= Date.now() - 7 * 864e5);
  const r = settings.reminder;
  const toggle = (p: typeof myPanel) => setMyPanel(myPanel === p ? null : p);

  const badges = [
    { icon: "📸", name: "첫 측정", on: recs.length >= 1 },
    { icon: "🧘", name: "첫 운동", on: sessions.length >= 1 },
    { icon: "🔥", name: "3일 연속", on: streakDays(sessions) >= 3 },
    { icon: "🎯", name: "목표 달성", on: recs.some((x) => x.cva >= settings.goal.cva) },
  ];

  const setInterval_ = async (min: number) => {
    setReminder({ min, startedAt: r.on ? Date.now() : r.startedAt });
    if (r.on) await scheduleReminder(min);
  };
  const toggleReminder = async () => {
    if (r.on) { await cancelReminder(); setReminder({ on: false, startedAt: null }); return; }
    if (!(await askPermission())) { Alert.alert("알림 권한이 필요해요", "설정 → 애플리케이션 → 거북목 체크 → 알림에서 허용해 주세요."); return; }
    await scheduleReminder(r.min);
    setReminder({ on: true, startedAt: Date.now() });
  };
  const confirmClear = () =>
    Alert.alert("기록 모두 지우기", `측정 기록 ${records.length}개, 운동 기록 ${sessions.length}개를 모두 지울까요? 되돌릴 수 없어요.`, [
      { text: "취소", style: "cancel" },
      { text: "모두 지우기", style: "destructive", onPress: clearAll },
    ]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <PageHead icon="my" title="MY" right={<Pill kind="neutral">로그인 준비 중</Pill>} />

      {/* 설정 바로가기 */}
      <View style={styles.shortcuts}>
        {([["⏰", "운동 알림", "alarm"], ["📊", "내 기록", null], ["🗂️", "데이터", "data"], ["ℹ️", "앱 정보", "info"]] as const).map(([e, l, p]) => {
          const on = p !== null && myPanel === p;
          return (
            <Pressable key={l} accessibilityRole="button" accessibilityState={{ expanded: on }} onPress={() => (p ? toggle(p) : go("records"))} style={styles.sc}>
              <Text style={{ fontSize: 32 }}>{e}</Text>
              <Text weight="bold" style={{ fontSize: 13, color: on ? colors.ok : colors.ink }}>{l}</Text>
            </Pressable>
          );
        })}
      </View>

      {myPanel === "alarm" && (
        <Card>
          <Text weight="bold" style={{ fontSize: 16 }}>운동 알림</Text>
          <Text style={textStyles.muted}>몇 분마다 운동 알림을 받을지 골라요. 운동 탭 타이머에 바로 적용돼요.</Text>
          <Chips options={INTERVALS} value={r.min} onChange={setInterval_} format={(m) => `${m}분`} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text>알림</Text>
            <Button title={r.on ? "켜짐 · 끄기" : "꺼짐 · 켜기"} onPress={toggleReminder} style={{ flex: 1, minHeight: 40 }} />
          </View>
        </Card>
      )}
      {myPanel === "data" && (
        <Card>
          <Text weight="bold" style={{ fontSize: 16 }}>데이터</Text>
          <Text style={textStyles.muted}>측정 기록 {records.length}개, 운동 기록 {sessions.length}개가 이 폰에 저장되어 있어요.</Text>
          <Button kind="danger" title="기록 모두 지우기" onPress={confirmClear} disabled={!records.length && !sessions.length} />
        </Card>
      )}
      {myPanel === "info" && (
        <Card>
          <Text weight="bold" style={{ fontSize: 16 }}>앱 정보</Text>
          <Row label="버전" value={appJson.expo.version} />
          <Row label="노트북 연동 주소" value={SERVER_URL.replace("https://", "")} />
        </Card>
      )}

      {/* 프로필 요약 */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={styles.avatar}><Text style={{ fontSize: 24 }}>🙂</Text></View>
          <View style={{ flex: 1 }}>
            <Text weight="bold" style={{ fontSize: 17 }}>나</Text>
            <Text style={textStyles.muted}>{first ? `${formatDateTime(first.date).split(" ")[0]}부터 함께하는 중` : "오늘부터 시작해요"}</Text>
          </View>
        </View>
        <KV items={[
          { label: "최근 CVA", value: last ? `${last.cva.toFixed(1)}°` : "–" },
          { label: "목표까지", value: last ? (gap! > 0 ? `${gap!.toFixed(1)}°` : "달성") : "–" },
          { label: "연속 운동", value: `${streakDays(sessions)}일` },
          { label: "이번 주 측정", value: `${weekRecs.length}회` },
        ]} />
      </Card>

      {/* 배지 */}
      <View style={styles.badgeStrip}>
        <Text style={{ fontSize: 26 }}>🏅</Text>
        <View style={{ flex: 1, gap: 6 }}>
          <Text weight="bold">배지 {badges.filter((b) => b.on).length} / {badges.length}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {badges.map((b) => (
              <View key={b.name} style={[styles.badge, !b.on && { opacity: 0.5 }]}>
                <Text weight={b.on ? "bold" : "regular"} style={{ fontSize: 12.5, color: b.on ? colors.ok : colors.muted }}>{b.icon} {b.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <SecHead title="내 목표 설정" />
      <Card>
        <Stepper title="CVA 목표" desc="이 각도 이상을 목표로 해요" value={`${settings.goal.cva}°`} onMinus={() => setGoal({ cva: settings.goal.cva - 1 })} onPlus={() => setGoal({ cva: settings.goal.cva + 1 })} />
        <Stepper title="하루 운동 목표" desc={`오늘 ${todayCount(sessions)}회 했어요`} value={`${settings.goal.daily}회`} onMinus={() => setGoal({ daily: settings.goal.daily - 1 })} onPlus={() => setGoal({ daily: settings.goal.daily + 1 })} />
        <Stepper title="CVA 기준값" desc="이보다 낮으면 '전방머리자세 경향'" value={`${settings.threshold}°`} onMinus={() => setThreshold(settings.threshold - 1)} onPlus={() => setThreshold(settings.threshold + 1)} />
      </Card>

      <Text style={[textStyles.muted, { textAlign: "center", lineHeight: 20 }]}>
        이 앱은 자가 자세 체크와 기록을 돕는 도구이며 질환을 진단하지 않습니다.{"\n"}통증이나 증상이 있으면 전문가와 상담하세요.
      </Text>
    </ScrollView>
  );
}

function Stepper({ title, desc, value, onMinus, onPlus }: { title: string; desc: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text>{title}</Text>
        <Text style={textStyles.muted}>{desc}</Text>
      </View>
      <Button title="−" onPress={onMinus} style={styles.step} />
      <Text style={[textStyles.num, { fontSize: 20, minWidth: 52, textAlign: "center" }]}>{value}</Text>
      <Button title="+" onPress={onPlus} style={styles.step} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text style={{ flexShrink: 1, textAlign: "right", fontSize: 13 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
  shortcuts: { flexDirection: "row", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 16 },
  sc: { flex: 1, alignItems: "center", gap: 8 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  badgeStrip: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: 16, padding: 14 },
  badge: { backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  step: { minWidth: 44, paddingHorizontal: 0 },
});
