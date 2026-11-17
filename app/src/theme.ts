// 앱 전체 디자인 값 (남색 배경 + 민트 포인트, 거북이 캐릭터 색과 맞춤 + Pretendard)
export const colors = {
  bg: "#0B1B33",
  surface: "#12284A",
  surface2: "#183259",
  ink: "#EAF2FF",
  muted: "#9DB0CE",
  line: "#22406B",
  accent: "#3DDBB8",
  accentSoft: "#143F4C",
  onAccent: "#052B27", // 민트 위 글자
  ok: "#4BE3B0",
  okBg: "#123F3E",
  warn: "#FF8A7A",
  warnBg: "#43232F",
  stage: "#050C18",
  tragus: "#F2C230", // 귀 이주 점
  c7: "#2EC4D6", // C7 점
};

export const fonts = {
  regular: "Pretendard-Regular",
  bold: "Pretendard-SemiBold",
  heavy: "Pretendard-ExtraBold",
};

export const fontFiles = {
  [fonts.regular]: require("../assets/fonts/Pretendard-Regular.otf"),
  [fonts.bold]: require("../assets/fonts/Pretendard-SemiBold.otf"),
  [fonts.heavy]: require("../assets/fonts/Pretendard-ExtraBold.otf"),
};

export const TAG_LABEL = { none: "일반", before: "운동 전", after: "운동 후" } as const;
export type Tag = keyof typeof TAG_LABEL;
