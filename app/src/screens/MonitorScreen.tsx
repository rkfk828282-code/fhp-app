// 실시간 자세 측정 (휴대폰): 노트북 웹캠 측정과 같은 시스템을 앱 안 화면(WebView)으로 띄움
// 서버의 /monitor.html 이 전면 카메라 + 자세 판별(posture.js) + 실시간 게이지·거북이 + 데이터를 그대로 보여 줌
import { useCameraPermissions } from "expo-camera";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Button, Text, textStyles } from "../components/ui";
import { SERVER_URL } from "../config";
import { colors } from "../theme";

export default function MonitorScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [perm, ask] = useCameraPermissions();
  useEffect(() => { if (perm && !perm.granted && perm.canAskAgain) ask(); }, [perm]);

  const head = (
    <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onBack} hitSlop={12}><Text weight="bold" style={{ color: colors.accent }}>‹ 측정</Text></Pressable>
    </View>
  );

  if (!perm) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (!perm.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {head}
        <View style={[styles.center, { padding: 24, gap: 12 }]}>
          <Text weight="bold" style={{ fontSize: 16, textAlign: "center" }}>카메라 권한이 필요해요</Text>
          <Text style={[textStyles.muted, { textAlign: "center" }]}>전면 카메라로 얼굴과 어깨를 보고 거북목을 판별해요. 영상은 휴대폰 안에서만 쓰고 저장하지 않아요.</Text>
          <Button kind="primary" title="카메라 허용하기" onPress={ask} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {head}
      <WebView
        source={{ uri: `${SERVER_URL}/monitor.html?auto=1&app=1` }}
        style={{ flex: 1, backgroundColor: colors.bg }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        startInLoadingState
        renderLoading={() => <View style={styles.center}><ActivityIndicator color={colors.accent} /><Text style={textStyles.muted}>자세 판별 준비 중…</Text></View>}
        renderError={() => (
          <View style={[styles.center, { padding: 24, gap: 8 }]}>
            <Text weight="bold">화면을 불러오지 못했어요</Text>
            <Text style={[textStyles.muted, { textAlign: "center" }]}>인터넷 연결을 확인하고 다시 열어 주세요.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 16, paddingBottom: 6, backgroundColor: colors.bg },
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, gap: 8 },
});
