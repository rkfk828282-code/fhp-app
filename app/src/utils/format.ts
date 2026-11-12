// 날짜 표시
const pad = (n: number) => String(n).padStart(2, "0");

/** 2026.11.13 14:05 */
export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 11/13 */
export function formatShortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
