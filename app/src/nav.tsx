// 화면 이동 (탭 + 탭 안의 세부 화면)
import { createContext, useContext } from "react";
import type { MeasureRecord } from "./store/AppState";

export type TabKey = "home" | "measure" | "records" | "exercise" | "my";
// home: cva(CVA 설명) / measure: photo, live, summary
export type Route = "main" | "cva" | "photo" | "live" | "summary";
export type MyPanel = "alarm" | "data" | "info" | null;

export type Summary = { rec: MeasureRecord; prev: MeasureRecord | null; side?: string | null };

export type Nav = {
  tab: TabKey;
  route: Route;
  go: (tab: TabKey, route?: Route) => void;
  summary: Summary | null;
  showSummary: (s: Summary) => void;
  myPanel: MyPanel;
  setMyPanel: (p: MyPanel) => void;
  startTag: "none" | "before" | "after"; // 측정 화면을 열 때 미리 고를 측정 시점
  setStartTag: (t: "none" | "before" | "after") => void;
};

export const NavCtx = createContext<Nav | null>(null);
export function useNav() {
  const v = useContext(NavCtx);
  if (!v) throw new Error("NavCtx 안에서만 쓸 수 있어요");
  return v;
}
