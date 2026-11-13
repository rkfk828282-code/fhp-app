// 앱 시작점: 글꼴 → 저장된 데이터 → 탭 화면 (홈 · 측정 · 기록 · 운동 · MY)
import { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TabBar } from "./src/components/TabBar";
import { NavCtx, type MyPanel, type Nav, type Route, type Summary, type TabKey } from "./src/nav";
import { AppStateProvider, useAppState } from "./src/store/AppState";
import { colors, fontFiles, type Tag } from "./src/theme";
import HomeScreen from "./src/screens/HomeScreen";
import CvaInfoScreen from "./src/screens/CvaInfoScreen";
import MeasureHomeScreen from "./src/screens/MeasureHomeScreen";
import PhotoMeasureScreen from "./src/screens/PhotoMeasureScreen";
import LiveSendScreen from "./src/screens/LiveSendScreen";
import SummaryScreen from "./src/screens/SummaryScreen";
import RecordsScreen from "./src/screens/RecordsScreen";
import ExerciseScreen from "./src/screens/ExerciseScreen";
import MyScreen from "./src/screens/MyScreen";

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

function Main() {
  const { ready } = useAppState();
  const [tab, setTab] = useState<TabKey>("home");
  const [route, setRoute] = useState<Route>("main");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [myPanel, setMyPanel] = useState<MyPanel>(null);
  const [startTag, setStartTag] = useState<Tag>("none");

  const go = (t: TabKey, r: Route = "main") => {
    if (!(t === "measure" && r === "photo")) setStartTag("none"); // 운동 전/후 측정이 아니면 일반으로
    setTab(t); setRoute(r);
  };
  const nav: Nav = {
    tab, route, go, summary,
    showSummary: (s) => { setSummary(s); setTab("measure"); setRoute("summary"); },
    myPanel, setMyPanel, startTag, setStartTag,
  };

  // 카메라 화면은 탭바 없이 전체 화면
  const fullScreen = tab === "measure" && (route === "photo" || route === "live");

  // 안드로이드 뒤로가기: 세부 화면 → 탭 첫 화면 → 홈
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (route !== "main") { setRoute("main"); return true; }
      if (tab !== "home") { setTab("home"); return true; }
      return false;
    });
    return () => sub.remove();
  }, [route, tab]);

  if (!ready) return <Loading />;

  return (
    <NavCtx.Provider value={nav}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1 }}>
          {tab === "home" && (route === "cva" ? <CvaInfoScreen /> : <HomeScreen />)}
          {tab === "measure" && route === "main" && <MeasureHomeScreen onPhoto={() => go("measure", "photo")} onLive={() => go("measure", "live")} />}
          {tab === "measure" && route === "photo" && <PhotoMeasureScreen onBack={() => go("measure")} />}
          {tab === "measure" && route === "live" && <LiveSendScreen onBack={() => go("measure")} />}
          {tab === "measure" && route === "summary" && <SummaryScreen />}
          {tab === "records" && <RecordsScreen onMeasure={() => go("measure")} />}
          {tab === "exercise" && <ExerciseScreen />}
          {tab === "my" && <MyScreen />}
        </View>
        {!fullScreen && <TabBar value={tab} onChange={(t) => go(t)} />}
        <StatusBar style={fullScreen ? "light" : "dark"} />
      </View>
    </NavCtx.Provider>
  );
}
