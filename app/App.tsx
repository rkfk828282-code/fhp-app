// 앱 시작점: 글꼴 불러오기 → 저장된 데이터 불러오기 → 탭 화면
import { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TabBar, type TabKey } from "./src/components/TabBar";
import { AppStateProvider, useAppState } from "./src/store/AppState";
import { colors, fontFiles } from "./src/theme";
import MeasureHomeScreen from "./src/screens/MeasureHomeScreen";
import PhotoMeasureScreen from "./src/screens/PhotoMeasureScreen";
import LiveSendScreen from "./src/screens/LiveSendScreen";
import RecordsScreen from "./src/screens/RecordsScreen";
import ExerciseScreen from "./src/screens/ExerciseScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

export default function App() {
  const [fontsLoaded] = useFonts(fontFiles);
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        {fontsLoaded ? <Main /> : <Loading />}
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

// 측정 탭 안에서 이동하는 화면 (첫 화면 / 폰 촬영 / 노트북 송출)
type MeasureRoute = "home" | "photo" | "live";

function Main() {
  const { ready } = useAppState();
  const [tab, setTab] = useState<TabKey>("measure");
  const [route, setRoute] = useState<MeasureRoute>("home");
  const fullScreen = tab === "measure" && route !== "home"; // 카메라 화면에서는 탭 숨김

  // 안드로이드 뒤로가기 버튼: 카메라 화면 → 측정 첫 화면 → 측정 탭
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (fullScreen) { setRoute("home"); return true; }
      if (tab !== "measure") { setTab("measure"); return true; }
      return false;
    });
    return () => sub.remove();
  }, [fullScreen, tab]);

  if (!ready) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        {tab === "measure" && route === "home" && (
          <MeasureHomeScreen onPhoto={() => setRoute("photo")} onLive={() => setRoute("live")} />
        )}
        {tab === "measure" && route === "photo" && (
          <PhotoMeasureScreen onBack={() => setRoute("home")} onSaved={() => { setRoute("home"); setTab("records"); }} />
        )}
        {tab === "measure" && route === "live" && <LiveSendScreen onBack={() => setRoute("home")} />}
        {tab === "records" && <RecordsScreen onMeasure={() => { setTab("measure"); setRoute("home"); }} />}
        {tab === "exercise" && <ExerciseScreen />}
        {tab === "settings" && <SettingsScreen />}
      </View>
      {!fullScreen && <TabBar value={tab} onChange={(t) => { setTab(t); setRoute("home"); }} />}
      <StatusBar style={fullScreen ? "light" : "dark"} />
    </View>
  );
}
