// 측정 결과를 사람이 읽는 문장으로 요약 (Artifact 시제품과 같은 규칙)
import type { MeasureRecord } from "../store/AppState";
import { describeCVA } from "./cva";

export type SummaryText = { kind: "ok" | "warn"; label: string; th: number; gap: number; diffPrev: number | null; parts: { text: string; bold?: boolean }[]; tips: string[] };

export function summarize(rec: MeasureRecord, prev: MeasureRecord | null, goalCva: number): SummaryText {
  const d = describeCVA(rec.cva, rec.threshold);
  const th = rec.cva - rec.threshold;
  const gap = goalCva - rec.cva;
  const parts: SummaryText["parts"] = [];
  if (th >= 0) {
    parts.push({ text: `CVA ${rec.cva.toFixed(1)}°로 기준(${rec.threshold}°)보다 ${th.toFixed(1)}° 높아 ` }, { text: "기준 범위", bold: true }, { text: "예요. " });
  } else {
    parts.push({ text: `CVA ${rec.cva.toFixed(1)}°로 기준(${rec.threshold}°)보다 ${(-th).toFixed(1)}° 낮아 ` }, { text: "전방머리자세 경향", bold: true }, { text: "이 있어요. " });
  }
  let diffPrev: number | null = null;
  if (prev) {
    diffPrev = rec.cva - prev.cva;
    const who = rec.tag === "after" && prev.tag === "before" ? "운동 전보다" : "지난번보다";
    if (Math.abs(diffPrev) < 0.5) parts.push({ text: `${who} 거의 같아요(${diffPrev >= 0 ? "+" : ""}${diffPrev.toFixed(1)}°). ` });
    else if (diffPrev > 0) parts.push({ text: `${who} ` }, { text: `${diffPrev.toFixed(1)}° 좋아졌어요.`, bold: true }, { text: " " });
    else parts.push({ text: `${who} ${(-diffPrev).toFixed(1)}° 낮아졌어요. ` });
  } else {
    parts.push({ text: "첫 측정이에요. 앞으로 같은 자세로 재면 변화를 볼 수 있어요. " });
  }
  parts.push({ text: gap > 0 ? `목표(${goalCva}°)까지 ${gap.toFixed(1)}° 남았어요.` : `목표(${goalCva}°)를 달성했어요!` });
  const tips = d.kind === "ok"
    ? ["지금 자세를 유지하도록 50분마다 잠깐씩 목을 풀어 주세요.", "모니터와 폰을 눈높이에 두는 습관을 이어 가세요."]
    : ["턱 당기기와 가슴 펴기 운동을 하루 몇 번씩 해 보세요.", "모니터 위쪽 끝을 눈높이에 맞추고, 폰은 들어 올려서 봐요.", "운동 후 다시 재서 \"운동 후\"로 저장하면 효과를 비교할 수 있어요."];
  return { kind: d.kind, label: d.label, th, gap, diffPrev, parts, tips };
}
