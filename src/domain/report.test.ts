import { expect, test } from "bun:test";
import { prepareReport, presentReport, type Report } from "./report";
import { DEFAULT_WORK_PLAN } from "./rules/work-plan";
import { durationSegments } from "./attendance";
import { summarizeWeek } from "@/domain/rules/week";
import { readPlanInput } from "@/domain/rules/work-plan";
import { pofiNotesForWeek } from "@/server/pofi-notes.js";

const now = Date.parse("2026-10-16T15:00:00+03:00");
function fixture(): Report {
  return {
    person: { id: "self", name: "Fixture Person", title: "", unit: "" },
    from: "2026-10-12",
    to: "2026-10-18",
    fetchedAt: new Date(now).toISOString(),
    passages: [
      ...[12, 13, 14, 15].flatMap((day) => [
        { date: `2026-10-${day}`, time: "08:00:00", direction: "in" as const },
        { date: `2026-10-${day}`, time: "16:00:00", direction: "out" as const },
      ]),
      { date: "2026-10-16", time: "08:00:00", direction: "in" },
      { date: "2026-10-16", time: "12:00:00", direction: "out" },
      { date: "2026-10-16", time: "13:00:00", direction: "in" },
    ],
  };
}
test("prepared report ticks only today's duration and keeps stable records, intervals and plan", () => {
  const read = prepareReport(fixture(), DEFAULT_WORK_PLAN, "2026-10-16", false);
  const before = read(now);
  const after = read(now + 1000);
  expect(after.days[4].recordedSeconds).toBe(14400);
  expect(after.days[4].liveSeconds).toBe(25201);
  expect(after.days[4].source.estimated).toBe(10801);
  expect(after.days[4].source.exitGoalSeconds).toBe(28800);
  expect(after.days[4].records).toBe(before.days[4].records);
  expect(after.days[4].intervals).toBe(before.days[4].intervals);
  expect(after.plan).toBe(before.plan);
  for (const i of [0, 1, 2, 3, 5, 6])
    expect(after.days[i]).toBe(before.days[i]);
});
test("closed, stale and historical reports reuse the presentation across ticks", () => {
  const closed = fixture();
  closed.passages.pop();
  for (const [report, today, stale] of [
    [closed, "2026-10-16", false],
    [fixture(), "2026-10-16", true],
    [fixture(), "2026-10-23", false],
  ] as const) {
    const read = prepareReport(report, DEFAULT_WORK_PLAN, today, stale);
    const at = Date.parse(`${today}T15:00:00+03:00`);
    expect(read(at + 1000)).toBe(read(at));
  }
});
test("prepared reports refresh with plan, source, freshness and Istanbul date changes", () => {
  const report = fixture();
  const stale = prepareReport(report, DEFAULT_WORK_PLAN, "2026-10-16", true);
  expect(stale(now).days[4].liveSeconds).toBeNull();
  const fresh = prepareReport(report, DEFAULT_WORK_PLAN, "2026-10-16", false);
  expect(fresh(now).days[4].liveSeconds).toBe(25200);
  const changedPlan = {
    goals: { hours: 35, days: 5, weekdays: [0, 1, 2, 3, 4] },
  };
  expect(
    prepareReport(report, changedPlan, "2026-10-16", false)(now).dailySeconds,
  ).toBe(25200);
  const closed = {
    ...report,
    passages: [
      ...report.passages,
      { date: "2026-10-16", time: "15:00:00", direction: "out" as const },
    ],
  };
  expect(
    prepareReport(closed, DEFAULT_WORK_PLAN, "2026-10-16", false)(now).days[4]
      .recordedSeconds,
  ).toBe(25200);
  const midnight = Date.parse("2026-10-17T00:00:00+03:00");
  expect(() => fresh(midnight)).toThrow();
  const nextDay = prepareReport(
    report,
    DEFAULT_WORK_PLAN,
    "2026-10-17",
    false,
  )(midnight);
  expect(nextDay.days[4].liveSeconds).toBeNull();
  expect(nextDay.days[4].state).toBe("uncertain");
  expect(nextDay.days[4].recordedSeconds).toBe(14400);
  expect(nextDay.days[4].source.pofi.state).toBe("error");
});
test("a tick before the last entry becomes live once the clock catches up", () => {
  const read = prepareReport(fixture(), DEFAULT_WORK_PLAN, "2026-10-16", false);
  expect(
    read(Date.parse("2026-10-16T12:59:59+03:00")).days[4].liveSeconds,
  ).toBeNull();
  expect(
    read(Date.parse("2026-10-16T13:00:00+03:00")).days[4].liveSeconds,
  ).toBe(18000);
  expect(
    read(Date.parse("2026-10-16T16:00:00+03:00")).days[4].source.pofi.state,
  ).toBe("working");
});
test("turnikeden 4 saat kayıtlı + 3 saat tahmin = 7 saat; mola düşülmez, haftada tekrar sayılmaz", () => {
  const { days } = presentReport(fixture(), DEFAULT_WORK_PLAN, now, false);
  expect(durationSegments(days[4])).toEqual({
    recorded: 4 * 3600,
    estimated: 3 * 3600,
  });
  expect(summarizeWeek(days, "2026-10-16").totalSeconds).toBe(39 * 3600);
  expect(days[4].source!.exitGoalSeconds).toBe(8 * 3600);
});
test("son hareket çıkış olduğunda veya rapor eskidiğinde canlı tahmin durur", () => {
  const report = fixture();
  report.passages.pop();
  expect(
    presentReport(report, DEFAULT_WORK_PLAN, now, false).days[4].liveSeconds,
  ).toBeNull();
  const stale = presentReport(fixture(), DEFAULT_WORK_PLAN, now, true).days[4];
  expect(stale.liveSeconds).toBeNull();
  expect(stale.recordedSeconds).toBe(4 * 3600);
});
test("eksik seçili gün çıkış hedefini engeller, son gün fazla/eksik süreyi devralır", () => {
  const report = fixture();
  report.passages[1].time = "17:00:00";
  expect(
    presentReport(report, DEFAULT_WORK_PLAN, now, false).days[4].source!
      .exitGoalSeconds,
  ).toBe(7 * 3600);
  report.passages = report.passages.filter(
    (event) => event.date !== "2026-10-12",
  );
  expect(
    presentReport(report, DEFAULT_WORK_PLAN, now, false).days[4].source!
      .exitGoalSeconds,
  ).toBeNull();
});
test("aynı günün hareketleri bir güne birleşir; belirsiz geçiş canlı tahmin üretmez", () => {
  const report = fixture();
  const view = presentReport(report, DEFAULT_WORK_PLAN, now, false);
  expect(view.days).toHaveLength(7);
  expect(view.days[4].records).toHaveLength(3);
  const uncertain = fixture();
  uncertain.passages[9].direction = "in";
  const day = presentReport(uncertain, DEFAULT_WORK_PLAN, now, false).days[4];
  expect(day.liveSeconds).toBeNull();
  expect(day.source!.pofi.state).toBe("error");
});
test("Pofi tahmini hedefte çalışmayı sürdürür; kayıtlı hedefte tamamlanır; yüzde 80 yorgun", () => {
  const report = fixture();
  expect(
    presentReport(
      report,
      DEFAULT_WORK_PLAN,
      Date.parse("2026-10-16T16:00:00+03:00"),
      false,
    ).days[4].source!.pofi.state,
  ).toBe("working");
  expect(
    presentReport(report, DEFAULT_WORK_PLAN, now, false).days[4].source!.pofi
      .state,
  ).toBe("tired");
  report.passages.pop();
  report.passages[9].time = "16:00:00";
  expect(
    presentReport(report, DEFAULT_WORK_PLAN, now, false).days[4].source!.pofi
      .state,
  ).toBe("completed");
});
test("arşiv plan sınırları 0.25–24 saat/gün; seçili gün şartı ve ondalık hedef", () => {
  expect(readPlanInput({ weekdays: [], hours: 40 })).toBeNull();
  expect(readPlanInput({ weekdays: [0], dailyHours: 24 })).not.toBeNull();
  expect(readPlanInput({ weekdays: [0], dailyHours: 24.01 })).toBeNull();
  expect(readPlanInput({ weekdays: [0, 0], hours: 8 })).toBeNull();
  expect(
    readPlanInput({ weekdays: [0, 1], dailyHours: 0.25 })!.goals.hours,
  ).toBe(0.5);
});
test("notlar kişi bazında sabit, mevcut haftayla sınırlı, 8 Aralık ortak", () => {
  const notes = pofiNotesForWeek("2026-10-16", "fixture-person");
  expect(notes.map((note) => note.date)).toEqual([
    "2026-10-12",
    "2026-10-13",
    "2026-10-14",
    "2026-10-15",
    "2026-10-16",
  ]);
  expect(pofiNotesForWeek("2026-10-16", "fixture-person")).toEqual(notes);
  expect(pofiNotesForWeek("2026-10-16", "another-person")).not.toEqual(notes);
  expect(
    pofiNotesForWeek("2026-12-08", "a").find(
      (note) => note.date === "2026-12-08",
    ),
  ).toEqual(
    pofiNotesForWeek("2026-12-08", "b").find(
      (note) => note.date === "2026-12-08",
    ),
  );
  expect(() => pofiNotesForWeek("2026-10-16", "")).toThrow();
});
