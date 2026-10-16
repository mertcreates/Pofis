import { expect, test } from "bun:test";
import { demoData } from "./report";
import { presentReport } from "@/domain/report";
import { DEFAULT_WORK_PLAN } from "@/domain/rules/work-plan";
import { dateKey } from "@/domain/rules/calendar";
import { summarizeWeek } from "@/domain/rules/week";

test("yakalanan 297 hareket dört haftada aynı tarihler ve toplamlarla sunulur", () => {
  const data = demoData();
  expect(dateKey(data.now)).toBe("2026-10-16");
  expect(data.firstWeek).toBe("2026-09-21");
  expect(
    data.reports.map((report) => [report.from, report.passages.length]),
  ).toEqual([
    ["2026-09-21", 74],
    ["2026-09-28", 81],
    ["2026-10-05", 84],
    ["2026-10-12", 58],
  ]);
  const totals = data.reports.map((report) => {
    const { days } = presentReport(report, DEFAULT_WORK_PLAN, data.now, false);
    return summarizeWeek(days, "2026-10-16").recordedSeconds;
  });
  expect(totals).toEqual([132954, 128009, 115660, 108061]);
  for (const report of data.reports) {
    expect(report.person).toEqual({
      id: "self",
      name: "Örnek kullanıcı",
      unit: "",
      title: "",
    });
    expect(
      report.passages.every(
        (event) => event.date >= report.from && event.date <= report.to,
      ),
    ).toBe(true);
    expect(report.pofiNotes).toHaveLength(5);
    expect(
      report.pofiNotes!.every(
        (note) => note.date >= report.from && note.date <= report.to,
      ),
    ).toBe(true);
    for (const event of report.passages)
      expect(Object.keys(event).sort()).toEqual(["date", "direction", "time"]);
  }
});

test("aynı Mesaim hesabı boş günü, eksik saatli ve fazla saatli günü korur", () => {
  const { now, reports } = demoData();
  const current = presentReport(reports[3], DEFAULT_WORK_PLAN, now, false).days;
  expect(current[0].recordedSeconds).toBe(8 * 3600 + 3 * 60 + 31);
  expect(current[2].firstEntry).toBe(Date.parse("2026-10-14T05:57:32+03:00"));
  expect(current[3].recordedSeconds).toBe(4 * 3600 + 51 * 60 + 52);
  expect(current[4].recordedSeconds).toBeNull();
  expect(current[4].state).toBe("awaiting-entry");
  const previous = presentReport(
    reports[2],
    DEFAULT_WORK_PLAN,
    now,
    false,
  ).days;
  expect(previous[4].recordedSeconds).toBeNull();
  expect(previous[4].records).toHaveLength(0);
  expect(summarizeWeek(previous, "2026-10-16").incomplete).toBe(true);
  const september = presentReport(
    reports[1],
    DEFAULT_WORK_PLAN,
    now,
    false,
  ).days;
  expect(
    september[0].intervals.filter((interval) => interval.unmatched),
  ).toHaveLength(3);
  expect(september[0].recordedSeconds).toBe(7 * 3600 + 5 * 60 + 59);
});
