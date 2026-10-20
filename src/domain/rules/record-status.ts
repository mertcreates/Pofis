import { dailyRecordState } from "./duration.js";

export type DayState =
  | "future"
  | "non-working"
  | "awaiting-entry"
  | "missing"
  | "uncertain"
  | "ongoing"
  | "open"
  | "outside"
  | "recorded";

export function dailyRecordStatus({
  day,
  passage,
  today,
  workingDay,
  live,
}: {
  day: {
    date: string;
    firstEntry: string | null;
    lastExit: string | null;
    duration: number | null;
  };
  passage: {
    events: readonly unknown[];
    uncertain: boolean;
    openEntry: number | null;
    hasReliableOpenEntry: boolean;
  };
  today: string;
  workingDay: boolean;
  live: boolean;
}): DayState {
  if (day.date > today) return "future";
  const record = dailyRecordState(day);
  if (record !== "uncertain" && day.date === today && passage.hasReliableOpenEntry)
    return live ? "ongoing" : "open";
  if (record === "uncertain" || passage.uncertain) return "uncertain";
  if (record === "empty") {
    if (passage.events.length > 0) return "uncertain";
    if (!workingDay) return "non-working";
    return day.date === today ? "awaiting-entry" : "missing";
  }
  if (passage.openEntry !== null || record === "open") {
    if (day.date < today) return "uncertain";
    return live ? "ongoing" : "open";
  }
  return day.date === today ? "outside" : "recorded";
}
