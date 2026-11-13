// 앱 데이터(측정 기록, 운동 기록, 목표, 알림 설정)를 폰에 저장하고 화면들에 나눠 주는 곳
// 나중에 Cloudflare D1 서버와 동기화할 때도 이 파일만 고치면 됩니다.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { File, Paths } from "expo-file-system";
import type { Tag } from "../theme";

export type MeasureRecord = {
  id: string;
  date: string; // ISO 날짜
  cva: number; // 도(°)
  threshold: number; // 저장 당시 기준값
  tag: Tag; // 일반 / 운동 전 / 운동 후
  roll?: number; // 찍을 때 폰 좌우 기울기
  source?: "phone" | "laptop";
};

export type Session = { id: string; day: string; at: string }; // 운동 1회 완료
export type Goal = { cva: number; daily: number };
export type Reminder = { on: boolean; min: number; startedAt: number | null };
export type Settings = { threshold: number; goal: Goal; reminder: Reminder };

type Saved = { version: 2; records: MeasureRecord[]; sessions: Session[]; settings: Settings };

const DEFAULT: Saved = {
  version: 2,
  records: [],
  sessions: [],
  settings: { threshold: 50, goal: { cva: 52, daily: 3 }, reminder: { on: false, min: 50, startedAt: null } },
};
const file = () => new File(Paths.document, "neckcheck-data.json");

type AppState = {
  ready: boolean;
  records: MeasureRecord[];
  sessions: Session[];
  settings: Settings;
  addRecord: (r: Omit<MeasureRecord, "id" | "date">) => MeasureRecord;
  deleteRecord: (id: string) => void;
  clearAll: () => void;
  setThreshold: (v: number) => void;
  setGoal: (g: Partial<Goal>) => void;
  setReminder: (r: Partial<Reminder>) => void;
  addSession: () => void;
};

const Ctx = createContext<AppState | null>(null);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Saved>(DEFAULT);
  const [ready, setReady] = useState(false);
  const writing = useRef(Promise.resolve());

  // 처음 켤 때 불러오기 (예전 버전 파일도 읽을 수 있게 빈 칸은 기본값으로)
  useEffect(() => {
    (async () => {
      try {
        const f = file();
        if (f.exists) {
          const p = JSON.parse(await f.text()) as Partial<Saved> & { settings?: Partial<Settings> };
          const s: Partial<Settings> = p.settings ?? {};
          setData({
            version: 2,
            records: Array.isArray(p.records) ? p.records : [],
            sessions: Array.isArray(p.sessions) ? p.sessions : [],
            settings: {
              threshold: s.threshold ?? DEFAULT.settings.threshold,
              goal: { ...DEFAULT.settings.goal, ...(s.goal ?? {}) },
              reminder: { ...DEFAULT.settings.reminder, ...(s.reminder ?? {}) },
            },
          });
        }
      } catch {
        // 파일이 깨졌으면 빈 상태로 시작
      }
      setReady(true);
    })();
  }, []);

  // 바뀔 때마다 저장 (한 번에 하나씩 순서대로)
  const persist = useCallback((next: Saved) => {
    writing.current = writing.current.then(() => file().write(JSON.stringify(next))).catch(() => {});
  }, []);

  const update = useCallback((fn: (d: Saved) => Saved) => {
    setData((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const set = (fn: (s: Settings) => Settings) => update((d) => ({ ...d, settings: fn(d.settings) }));

  const value: AppState = {
    ready,
    records: data.records,
    sessions: data.sessions,
    settings: data.settings,
    addRecord: (r) => {
      const rec: MeasureRecord = { ...r, id: Date.now().toString(36), date: new Date().toISOString() };
      update((d) => ({ ...d, records: [...d.records, rec] }));
      return rec;
    },
    deleteRecord: (id) => update((d) => ({ ...d, records: d.records.filter((x) => x.id !== id) })),
    clearAll: () => update((d) => ({ ...d, records: [], sessions: [] })),
    setThreshold: (v) => set((s) => ({ ...s, threshold: clamp(v, 30, 70) })),
    setGoal: (g) => set((s) => {
      const goal = { ...s.goal, ...g };
      return { ...s, goal: { cva: clamp(goal.cva, 40, 65), daily: clamp(goal.daily, 1, 10) } };
    }),
    setReminder: (r) => set((s) => ({ ...s, reminder: { ...s.reminder, ...r } })),
    addSession: () => {
      const now = new Date();
      update((d) => ({ ...d, sessions: [...d.sessions, { id: now.getTime().toString(36), day: dayKey(now), at: now.toISOString() }] }));
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AppStateProvider 안에서만 쓸 수 있어요");
  return v;
}

/* ===== 날짜·운동 계산 도우미 ===== */
const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayCount = (sessions: Session[]) => sessions.filter((x) => x.day === dayKey()).length;
export function streakDays(sessions: Session[]) {
  const days = new Set(sessions.map((x) => x.day));
  let n = 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // 오늘 아직 안 했으면 어제부터 셈
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export const sortedRecords = (records: MeasureRecord[]) => [...records].sort((a, b) => a.date.localeCompare(b.date));
