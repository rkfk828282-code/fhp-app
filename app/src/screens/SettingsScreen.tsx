// 설정 탭: 기준값, 데이터, 앱 정보
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import appJson from "../../app.json";
import { Button, Card, ScreenTitle, Text, textStyles } from "../components/ui";
import { SERVER_URL } from "../config";
import { useAppState } from "../store/AppState";
import { colors } from "../theme";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, setThreshold, records, clearRecords } = useAppState();

  const confirmClear = () =>
    Alert.alert("기록 모두 지우기", `측정 기록 ${records.length}개를 모두 지울까요? 되돌릴 수 없어요.`, [
      { text: "취소", style: "cancel" },
      { text: "모두 지우기", style: "destructive", onPress: clearRecords },
    ]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <ScreenTitle title="설정" />

      <Card>
        <Text weight="bold" style={{ fontSize: 16 }}>판정 기준</Text>
        <View style={styles.field}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text>CVA 기준값</Text>
            <Text style={textStyles.muted}>이보다 낮으면 "전방머리자세 경향"으로 표시</Text>
          </View>
          <View style={styles.stepper}>
            <Button title="−" onPress={() => setThreshold(settings.threshold - 1)} style={styles.stepBtn} />
            <Text style={[textStyles.num, { fontSize: 20, minWidth: 48, textAlign: "center" }]}>{settings.threshold}°</Text>
            <Button title="+" onPress={() => setThreshold(settings.threshold + 1)} style={styles.stepBtn} />
          </View>
        </View>
        <Text style={textStyles.muted}>연구마다 48~50° 정도를 기준으로 많이 씁니다. 이미 저장한 기록은 저장할 때의 기준값으로 판정돼요.</Text>
      </Card>

      <Card>
        <Text weight="bold" style={{ fontSize: 16 }}>데이터</Text>
        <Text style={textStyles.muted}>측정 기록 {records.length}개가 이 폰에 저장되어 있어요.</Text>
        <Button kind="danger" title="기록 모두 지우기" onPress={confirmClear} disabled={records.length === 0} />
      </Card>

      <Card>
        <Text weight="bold" style={{ fontSize: 16 }}>앱 정보</Text>
        <Row label="버전" value={appJson.expo.version} />
        <Row label="노트북 연동 주소" value={SERVER_URL.replace("https://", "")} />
      </Card>

      <Text style={[textStyles.muted, { textAlign: "center", lineHeight: 20 }]}>
        이 앱은 자가 자세 체크와 기록을 돕는 도구이며 질환을 진단하지 않습니다.{"\n"}통증이나 증상이 있으면 전문가와 상담하세요.
      </Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ color: colors.muted, flexShrink: 0 }}>{label}</Text>
      <Text style={{ flexShrink: 1, textAlign: "right", fontSize: 13 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
  field: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: { minWidth: 44, paddingHorizontal: 0 },
});
