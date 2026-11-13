// CVA(두개척추각) 계산 함수
// 화면 좌표는 아래로 갈수록 y가 커진다는 점에 주의하세요.

export type Point = { x: number; y: number };

/**
 * C7과 귀(이주)를 이은 선이 수평선과 이루는 각도(도 단위)를 돌려줍니다.
 * 사람이 왼쪽을 보든 오른쪽을 보든 같은 값이 나오도록 가로 거리는 절댓값을 씁니다.
 */
export function calcCVA(tragus: Point, c7: Point): number {
  const dx = Math.abs(tragus.x - c7.x); // 가로 거리
  const dy = c7.y - tragus.y; // 세로 거리 (귀가 C7보다 위에 있으면 양수)
  const radians = Math.atan2(dy, dx);
  return (radians * 180) / Math.PI;
}

/** 기준값과 비교한 결과 (진단이 아닌 자가 체크용 표현) */
export function describeCVA(cva: number, threshold: number): { label: string; kind: "ok" | "warn" } {
  return cva >= threshold
    ? { label: "기준 범위", kind: "ok" }
    : { label: "전방머리자세 경향", kind: "warn" };
}
