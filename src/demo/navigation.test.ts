import { expect, test } from "bun:test";
import {
  demoClock,
  demoDays,
  previewDemoDay,
  previewDemoReport,
} from "./navigation";
import { demoData } from "./report";
import { presentReport } from "@/domain/report";
import { DEFAULT_WORK_PLAN } from "@/domain/rules/work-plan";
import { dateKey } from "@/domain/rules/calendar";
import { summarizeWeek } from "@/domain/rules/week";

test("demo clock preserves capture time and uses Istanbul day-end for earlier dates", () => {
  const { now } = demoData();
  expect(demoClock("2026-10-16", now)).toBe(now);
  expect(demoClock("2026-10-14", now)).toBe(
    Date.parse("2026-10-14T23:59:59+03:00"),
  );
  expect(dateKey(demoClock("2026-10-14", now))).toBe("2026-10-14");
  expect(() => demoClock("2026-10-17", now)).toThrow();
  expect(() => demoClock("2026-09-31", now)).toThrow();
  const wednesday = Date.parse("2026-10-14T11:24:00+03:00");
  expect(demoDays("2026-10-12", wednesday)).toEqual([
    "2026-10-12",
    "2026-10-13",
    "2026-10-14",
  ]);
});

test("all five demo days share the real report rules without counting later records", () => {
  const { now, reports } = demoData();
  const report = reports[3];
  const original = structuredClone(report);
  const dates = demoDays(report.from, now);
  expect(dates).toEqual([
    "2026-10-12",
    "2026-10-13",
    "2026-10-14",
    "2026-10-15",
    "2026-10-16",
  ]);
  const expected = [29011, 31341, 30197, 17512, null];
  for (const [i, date] of dates.entries()) {
    const preview = previewDemoReport(report, date);
    const { days } = presentReport(
      preview,
      DEFAULT_WORK_PLAN,
      demoClock(date, now),
      false,
    );
    expect(days[i].recordedSeconds).toBe(expected[i]);
    expect(days[i].source.plannedGoalSeconds).toBe(28800);
    // 40 hours minus the four completed captured days = 9:58:59 on Friday.
    expect(days[i].source.goalSeconds).toBe(i === 4 ? 35939 : 28800);
    expect(days[i].liveSeconds).toBeNull();
    expect(
      days
        .filter((day) => day.date > date)
        .every((day) => day.records.length === 0),
    ).toBe(true);
    expect(preview.pofiNotes?.every((note) => note.date <= date)).toBe(true);
  }
  const monday = previewDemoReport(report, "2026-10-12");
  const { days } = presentReport(
    monday,
    DEFAULT_WORK_PLAN,
    demoClock("2026-10-12", now),
    false,
  );
  expect(summarizeWeek(days, "2026-10-12").recordedSeconds).toBe(29011);
  expect(report).toEqual(original);
  expect(() => previewDemoReport(report, "2026-10-09")).toThrow();
});

test("prior demo weeks retain missing and overtime days and their own Pofi notes", () => {
  const { now, reports } = demoData();
  const report = reports[2];
  const missing = presentReport(
    previewDemoReport(report, "2026-10-09"),
    DEFAULT_WORK_PLAN,
    demoClock("2026-10-09", now),
    false,
  );
  expect(missing.days[4].records).toHaveLength(0);
  expect(missing.days[4].recordedSeconds).toBeNull();
  const overtime = presentReport(
    previewDemoReport(report, "2026-10-07"),
    DEFAULT_WORK_PLAN,
    demoClock("2026-10-07", now),
    false,
  );
  expect(overtime.days[2].recordedSeconds).toBe(33358);
  // Captured 13:11:57 / 13:11:58 / 13:29:27 entries are consecutive.
  expect(overtime.days[2].source.pofi.state).toBe("error");
  expect(
    previewDemoReport(report, "2026-10-07").pofiNotes?.map((note) => note.date),
  ).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
});

test("demo extra time simulates an open entry and keeps the captured report unchanged", () => {
  const { now, reports } = demoData();
  const report = reports[3];
  const original = structuredClone(report);
  const date = "2026-10-15";
  const regular = previewDemoDay(report, date, now);
  const simulated = previewDemoDay(report, date, now, 120);
  const day = presentReport(
    simulated.report,
    DEFAULT_WORK_PLAN,
    simulated.now,
    false,
  ).days.find((row) => row.date === date)!;

  expect(simulated.now).toBe(Date.parse("2026-10-15T13:38:46+03:00"));
  expect(simulated.maxExtraMinutes).toBeGreaterThanOrEqual(120);
  expect(simulated.unavailableReason).toBeNull();
  expect(simulated.report.passages).toHaveLength(
    regular.report.passages.length + 1,
  );
  expect(simulated.report.passages.at(-1)).toEqual({
    date,
    time: "11:38:46",
    direction: "in",
  });
  expect(day.state).toBe("ongoing");
  expect(day.recordedSeconds).toBe(17512);
  expect(day.liveSeconds).toBe(24712);
  expect(day.source.estimated).toBe(7200);
  expect(day.intervals.at(-1)).toEqual({
    entry: Date.parse("2026-10-15T11:38:46+03:00"),
    exit: null,
  });
  expect(regular.report).toEqual({
    ...report,
    passages: report.passages.filter((event) => event.date <= date),
    pofiNotes: report.pofiNotes?.filter((note) => note.date <= date),
  });
  expect(report).toEqual(original);
});

test("demo extra time is unavailable for empty and ambiguous days", () => {
  const { now, reports } = demoData();
  const capturedDay = previewDemoDay(reports[3], "2026-10-16", now);
  expect(capturedDay.maxExtraMinutes).toBe(0);
  expect(capturedDay.unavailableReason).toBe("no-records");
  expect(() => previewDemoDay(reports[3], "2026-10-16", now, 15)).toThrow();

  const ambiguousDay = previewDemoDay(reports[2], "2026-10-07", now);
  expect(ambiguousDay.maxExtraMinutes).toBe(0);
  expect(ambiguousDay.unavailableReason).toBe("uncertain");
  expect(() => previewDemoDay(reports[2], "2026-10-07", now, 15)).toThrow();
});
