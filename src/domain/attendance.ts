import type { DayState } from "./rules/record-status";
type Passage = { id: string; at: string; direction: "entry" | "exit" };
type Interval = {
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
  source: {
    workingDay: boolean;
    dailyGoalSeconds: number;
    exitGoalSeconds: number | null;
    total: number;
    recorded: number;
    estimated: number;
    pofi: ReturnType<typeof import("./rules/pofi.js").pofiNote>;
  };
};
