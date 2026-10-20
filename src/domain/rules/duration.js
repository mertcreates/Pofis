import { summaryRecord } from "./recorded-time.js";
import { dateKey, clockSeconds, secondsOf } from "./calendar";
import { targetProgress } from "./progress.js";
import { passageDay } from "./passages.js";

export function dailyRecordState(day) {
  const { record } = summaryRecord(day);
  if (
    record === "recorded" &&
    (!Number.isFinite(day.duration) || day.duration < 0)
  )
    return "uncertain";
  return record;
}

export function dailyDurationState({
  day,
  dailySeconds,
  isToday,
  now,
  stale = false,
  passages,
}) {
  const record = dailyRecordState(day);
  let fallback = { seconds: null, basis: "unknown" };
  if (record === "recorded") {
    fallback = {
      seconds: day.duration,
      basis: "recorded",
      ...targetProgress(day.duration, dailySeconds),
    };
  }
  if (!["open", "recorded"].includes(record) || !isToday || stale || !now)
    return fallback;
  const passage = passageDay(passages, day.date, day.date);
  if (!passage.hasReliableOpenEntry) return fallback;
  const seconds = liveElapsedSeconds(day.date, day.firstEntry, now);
  if (seconds === null) return fallback;
  if (
    (record === "recorded" && seconds < day.duration) ||
    secondsOf(day.firstEntry) + seconds < passage.openEntry
  )
    return fallback;
  return { seconds, basis: "live", ...targetProgress(seconds, dailySeconds) };
}

function liveElapsedSeconds(date, firstEntry, now) {
  const start = secondsOf(firstEntry);
  if (start === null || date !== dateKey(now)) return null;
  const elapsed = clockSeconds(now) - start;
  return elapsed < 0 ? null : elapsed;
}

export function durationTotals(recordedSeconds, duration) {
  const recorded = recordedSeconds ?? 0;
  const total = duration.basis === "live" ? duration.seconds : recorded;
  return { recorded, estimated: Math.max(0, total - recorded), total };
}
