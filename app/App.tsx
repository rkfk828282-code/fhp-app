import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import MeasureScreen from "./src/screens/MeasureScreen";
import LiveSendScreen from "./src/screens/LiveSendScreen";

// 임시 화면 전환 (나중에 하단 탭으로 바꿀 예정)
type Mode = "live" | "measure";

export default function App() {
  const [mode, setMode] = useState<Mode>("live");
  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {mode === "live" ? <LiveSendScreen /> : <MeasureScreen />}
      <View style={styles.switcher}>
        {(["live", "measure"] as Mode[]).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.tab, mode === m && styles.tabOn]}>
            <Text style={[styles.tabText, mode === m && styles.tabTextOn]}>
              {m === "live" ? "노트북 송출" : "폰에서 측정"}
            </Text>
          </Pressable>
        ))}
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: { position: "absolute", top: 12, alignSelf: "center", flexDirection: "row", backgroundColor: "#000000aa", borderRadius: 999, padding: 4, marginTop: 24 },
  tab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
  tabOn: { backgroundColor: "#0b9b5a" },
  tabText: { color: "#c9d3d8", fontWeight: "600", fontSize: 13 },
  tabTextOn: { color: "white" },
});
