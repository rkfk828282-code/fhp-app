// 거북이 캐릭터 (사용자가 준 그림 그대로: assets/turtle/*.png)
// mood: good 바른 자세 / strain 애쓰는 중 / bad 거북목
import { Image } from "react-native";

export type Mood = "good" | "strain" | "bad";

const IMG = {
  good: require("../../assets/turtle/turtle_good.png"),
  strain: require("../../assets/turtle/turtle_strain.png"),
  bad: require("../../assets/turtle/turtle_bad.png"),
  head: require("../../assets/turtle/turtle_head.png"),
};
// 그림 비율 (가로 / 세로)
const RATIO = { good: 210 / 268, strain: 230 / 237, bad: 225 / 202, head: 1 };
const LABEL = { good: "바른 자세 거북이", strain: "목을 펴려고 애쓰는 거북이", bad: "목이 앞으로 나온 거북이", head: "거북이 얼굴" };

/** CVA로 표정 고르기: 기준 이상 = 바른 자세, 기준보다 5° 안쪽 = 애쓰는 중, 그 아래 = 거북목 */
export const moodOf = (cva: number, threshold: number): Mood => (cva >= threshold ? "good" : cva >= threshold - 5 ? "strain" : "bad");
export const MOOD_TEXT: Record<Mood, string> = { good: "목이 쭉 펴졌어요", strain: "조금만 더 펴 볼까요", bad: "거북이처럼 목이 나왔어요" };

export function Turtle({ mood = "good", height = 120 }: { mood?: Mood | "head"; height?: number }) {
  return (
    <Image source={IMG[mood]} accessibilityLabel={LABEL[mood]}
      style={{ height, width: height * RATIO[mood] }} resizeMode="contain" />
  );
}
