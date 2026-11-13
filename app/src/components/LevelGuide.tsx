// 폰 기울기 표시 (수평 가이드)
// 옆모습을 찍을 때 폰을 세로로 똑바로 세워야 각도 오차가 줄어듭니다.
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./ui";
import { Accelerometer } from "expo-sensors";

export const LEVEL_TOLERANCE = 2; // 이 각도(°) 이내면 "수평 OK"

export type Tilt = { roll: number; pitch: number };

export function useTilt(): Tilt {
  const [tilt, setTilt] = useState<Tilt>({ roll: 0, pitch: 0 });

  useEffect(() => {
    Accelerometer.setUpdateInterval(100); // 0.1초마다 갱신
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      // roll: 화면 평면에서 좌우로 기운 정도 → CVA 값에 그대로 오차로 들어감
      const roll = (Math.atan2(x, Math.abs(y)) * 180) / Math.PI;
      // pitch: 앞뒤로 숙이거나 젖힌 정도
      const pitch = (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI;
      setTilt({ roll, pitch });
    });
    return () => sub.remove();
  }, []);

  return tilt;
}

export function isLevel(t: Tilt) {
  return Math.abs(t.roll) <= LEVEL_TOLERANCE && Math.abs(t.pitch) <= LEVEL_TOLERANCE;
}

export function LevelGuide({ tilt }: { tilt: Tilt }) {
  const ok = isLevel(tilt);
  return (
    <View style={[styles.box, { backgroundColor: ok ? "#0B9B5Acc" : "#B8432Fcc" }]}>
      <Text weight="bold" style={styles.text}>
        {ok ? "수평 OK" : "똑바로 세워 주세요"}
      </Text>
      <Text style={styles.small}>
        좌우 {tilt.roll.toFixed(1)}° · 앞뒤 {tilt.pitch.toFixed(1)}°
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, alignItems: "center" },
  text: { color: "white", fontSize: 15 },
  small: { color: "white", fontSize: 12, marginTop: 2 },
});
