// 앱 전체 디자인 값 (Artifact 시제품과 같은 초록 + Pretendard)
export const colors = {
  bg: "#F4F6F5",
  surface: "#FFFFFF",
  ink: "#191F1C",
  muted: "#5E6A64",
  line: "#DBE2DE",
  accent: "#0B9B5A",
  accentSoft: "#E2F5EA",
  ok: "#0A8A50",
  okBg: "#E2F5EA",
  warn: "#B8432F",
  warnBg: "#F8E4DF",
  stage: "#111814",
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
