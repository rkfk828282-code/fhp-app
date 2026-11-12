// 앱 데이터(측정 기록, 설정)를 폰에 저장하고 화면들에 나눠 주는 곳
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
};

export type Settings = { threshold: number };

type Saved = { version: 1; records: MeasureRecord[]; settings: Settings };

const DEFAULT: Saved = { version: 1, records: [], settings: { threshold: 50 } };
const file = () => new File(Paths.document, "neckcheck-data.json");

type AppState = {
  ready: boolean;
  records: MeasureRecord[];
  settings: Settings;
  addRecord: (r: Omit<MeasureRecord, "id" | "date">) => MeasureRecord;
  deleteRecord: (id: string) => void;
  clearRecords: () => void;
  setThreshold: (v: number) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Saved>(DEFAULT);
  const [ready, setReady] = useState(false);
  const writing = useRef(Promise.resolve());

  // 처음 켤 때 불러오기
  useEffect(() => {
    (async () => {
      try {
        const f = file();
        if (f.exists) {
          const parsed = JSON.parse(await f.text()) as Partial<Saved>;
          setData({
            version: 1,
            records: Array.isArray(parsed.records) ? parsed.records : [],
            settings: { ...DEFAULT.settings, ...(parsed.settings ?? {}) },
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

  const value: AppState = {
    ready,
    records: data.records,
    settings: data.settings,
    addRecord: (r) => {
      const rec: MeasureRecord = { ...r, id: Date.now().toString(36), date: new Date().toISOString() };
      update((d) => ({ ...d, records: [...d.records, rec] }));
      return rec;
    },
    deleteRecord: (id) => update((d) => ({ ...d, records: d.records.filter((x) => x.id !== id) })),
    clearRecords: () => update((d) => ({ ...d, records: [] })),
    setThreshold: (v) => update((d) => ({ ...d, settings: { ...d.settings, threshold: Math.max(30, Math.min(70, v)) } })),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AppStateProvider 안에서만 쓸 수 있어요");
  return v;
}
