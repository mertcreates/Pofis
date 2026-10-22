import { ui } from "../lib/ui-text.js";
import { dateKey, sourceTimestamp, weekDates } from "@/domain/rules/calendar";
import { passageDay } from "@/domain/rules/passages.js";
import type { Report } from "@/domain/report";

export const EXTRA_TIME_STEP_MINUTES = 15;
const EXTRA_TIME_STEP_MILLISECONDS = EXTRA_TIME_STEP_MINUTES * 60_000;

function validateExtraMinutes(minutes: number, maximum: number) {
  if (
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > maximum ||
    minutes % EXTRA_TIME_STEP_MINUTES !== 0
  )
    throw new Error(ui.demoMessages.invalidExtraTime);
}

export function demoDays(week: string, capturedAt: number) {
  const lastDate = dateKey(capturedAt);
  return weekDates(week)
    .slice(0, 5)
    .filter((date) => date <= lastDate);
}

export function demoClock(date: string, capturedAt: number) {
  const lastDate = dateKey(capturedAt);
  if (date > lastDate) throw new Error(ui.demoMessages.futureDate);
  if (date === lastDate) return capturedAt;
  const at = sourceTimestamp(date, "23:59:59");
  if (at === null) throw new Error(ui.demoMessages.invalidDay);
  return at;
}

export function advanceDemoClock(now: number, elapsedMilliseconds: number) {
  const dayEnd = sourceTimestamp(dateKey(now), "23:59:59");
  if (dayEnd === null) throw new Error(ui.demoMessages.invalidTime);
  return Math.min(now + Math.max(0, elapsedMilliseconds), dayEnd);
}

export function previewDemoReport(report: Report, date: string): Report {
  if (date < report.from || date > report.to)
    throw new Error(ui.demoMessages.dayOutsideWeek);
  return {
    ...report,
    passages: report.passages.filter((event) => event.date <= date),
    pofiNotes: report.pofiNotes?.filter((note) => note.date <= date),
  };
}

export function previewDemoDay(
  report: Report,
  date: string,
  capturedAt: number,
  extraMinutes = 0,
) {
  const preview = previewDemoReport(report, date);
  const defaultNow = demoClock(date, capturedAt);
  const passages = preview.passages
    .filter((event) => event.date === date)
    .toSorted((a, b) => a.time.localeCompare(b.time));

  if (passages.length === 0) {
    validateExtraMinutes(extraMinutes, 0);
    return {
      report: preview,
      now: defaultNow,
      maxExtraMinutes: 0,
    };
  }

  const last = passages[passages.length - 1];
  const addOpenEntry = last.direction === "out";
  const simulatedPassages = addOpenEntry
    ? [...passages, { date, time: last.time, direction: "in" as const }]
    : passages;
  const dayState = passageDay(simulatedPassages, date, date);

  if (!dayState.hasReliableOpenEntry) {
    validateExtraMinutes(extraMinutes, 0);
    return {
      report: preview,
      now: defaultNow,
      maxExtraMinutes: 0,
    };
  }

  const entryAt = sourceTimestamp(date, last.time);
  const dayEnd = sourceTimestamp(date, "23:59:59");
  if (entryAt === null || dayEnd === null) {
    validateExtraMinutes(extraMinutes, 0);
    return {
      report: preview,
      now: defaultNow,
      maxExtraMinutes: 0,
    };
  }

  const maxExtraMinutes =
    Math.floor((dayEnd - entryAt) / EXTRA_TIME_STEP_MILLISECONDS) *
    EXTRA_TIME_STEP_MINUTES;
  validateExtraMinutes(extraMinutes, maxExtraMinutes);

  if (extraMinutes === 0)
    return {
      report: preview,
      now: defaultNow,
      maxExtraMinutes,
    };

  return {
    report: {
      ...preview,
      passages: addOpenEntry
        ? [
            ...preview.passages,
            { date, time: last.time, direction: "in" as const },
          ]
        : preview.passages,
    },
    now: entryAt + extraMinutes * 60_000,
    maxExtraMinutes,
  };
}
