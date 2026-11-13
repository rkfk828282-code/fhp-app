// CVA 설명 (홈 배너 2번째)
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, PageHead, Text, textStyles } from "../components/ui";
import { useNav } from "../nav";
import { useAppState } from "../store/AppState";
import { colors } from "../theme";
import { NeckArt } from "./HomeScreen";

export default function CvaInfoScreen() {
  const insets = useSafeAreaInsets();
  const { go } = useNav();
  const { settings } = useAppState();
  const P = ({ children }: { children: React.ReactNode }) => <Text style={styles.p}>{children}</Text>;
  const B = ({ children }: { children: React.ReactNode }) => <Text weight="bold" style={styles.p}>{children}</Text>;
  const H = ({ children }: { children: React.ReactNode }) => <Text weight="bold" style={styles.h3}>{children}</Text>;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <PageHead icon="home" title="CVA가 뭐예요?" onIcon={() => go("home")} />
      <Card style={{ alignItems: "center", backgroundColor: "#F3FAF6" }}>
        <NeckArt size={180} />
        <Text style={textStyles.muted}><Text style={{ color: colors.tragus }}>●</Text> 귀 이주   <Text style={{ color: colors.c7 }}>●</Text> C7   두 선 사이 각도 = CVA</Text>
      </Card>
      <Card>
        <Text weight="heavy" style={{ fontSize: 18, lineHeight: 26 }}>CVA는 목이 앞으로 얼마나 나왔는지 보는 각도예요</Text>
        <P><B>CVA(두개척추각, Craniovertebral Angle)</B>는 옆에서 봤을 때 <B>목 뒤 C7</B>(고개를 숙이면 가장 튀어나오는 뼈)에서 그은 <B>수평선</B>과, C7에서 <B>귀 이주</B>(귓구멍 바로 앞 작은 돌기)까지 이은 <B>선</B> 사이의 각도예요.</P>
        <H>각도가 작을수록 머리가 앞으로 나와 있어요</H>
        <P>머리가 몸 위에 바르게 있으면 귀가 C7보다 위쪽에 있어서 각도가 커지고, 머리가 앞으로 나올수록 귀가 앞·아래로 가서 각도가 작아져요. 이렇게 머리가 앞으로 나온 자세를 흔히 <B>거북목(전방머리자세)</B>이라고 불러요.</P>
        <H>몇 도면 괜찮은가요?</H>
        <P>연구에 따라 다르지만, <B>약 48~50°보다 작으면</B> 전방머리자세 경향으로 보는 경우가 많아요. 이 앱은 기본 기준값을 {settings.threshold}°로 두고, MY 탭에서 바꿀 수 있어요.</P>
        <H>정확하게 재려면</H>
        <View style={{ gap: 4 }}>
          {["카메라를 어깨 높이에서 몸과 직각으로 두고 옆에서 찍어요", "편하게 정면을 보고 선(또는 앉은) 자세에서 찍어요", "귀 이주와 C7에 작은 스티커를 붙이면 점을 정확히 찍기 쉬워요", "매번 같은 자세·같은 시간대에 재면 변화를 비교하기 좋아요"].map((t) => <P key={t}>•  {t}</P>)}
        </View>
        <Text style={textStyles.muted}>이 앱의 결과는 자가 자세 체크·기록용이며 질환을 진단하지 않아요. 통증이나 저림이 있으면 전문가와 상담하세요.</Text>
      </Card>
      <Button kind="primary" big title="지금 내 CVA 재보기" onPress={() => go("measure")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
  p: { fontSize: 14.5, lineHeight: 24 },
  h3: { fontSize: 15.5, color: colors.ok, marginTop: 6 },
});
