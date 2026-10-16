export type Passage = { id: string; at: string; direction: "entry" | "exit" };
import type { DayState } from "./rules/record-status";
export type { DayState } from "./rules/record-status";
export type Interval = {
  entry: number | null;
  exit: number | null;
  unmatched?: boolean;
};
export type DayReport = {
  date: string;
  state: DayState;
  records: Passage[];
  intervals: Interval[];
  firstEntry: number | null;
  lastExit: number | null;
  recordedSeconds: number | null;
  liveSeconds: number | null;
  issues: string[];
  source: {
    goalSeconds: number;
    dailyGoalSeconds: number;
    exitGoalSeconds: number | null;
    total: number;
    recorded: number;
    estimated: number;
    stale: boolean;
    pofi: ReturnType<typeof import("./rules/pofi.js").pofiNote>;
  };
};

export function displayedSeconds(day: DayReport): number {
  return day.source.total;
}

export function durationSegments(day: DayReport) {
  return { recorded: day.source.recorded, estimated: day.source.estimated };
}
