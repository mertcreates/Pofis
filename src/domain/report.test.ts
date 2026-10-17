import { expect, test } from "bun:test";
import { prepareReport, presentReport, type Report } from "./report";
import { DEFAULT_WORK_PLAN, emptyWorkPlans, changeDefaultPlan, changeWeekPlan, resolveStoredPlan, resolveStoredTarget, completedDaySeconds } from "./rules/work-plan";
import { summarizeWeek } from "@/domain/rules/week";
import { readDayPlan, weeklyTarget } from "@/domain/rules/work-plan";
import { pofiNotesForWeek } from "@/server/pofi-notes.js";

const now = Date.parse("2026-10-16T15:00:00+03:00");

test("kaydedilmiş sıfır açık Cuma borcu ve hedef çıkışı rapora/Pofi'ye taşır", () => {
  const report = fixture();
  report.passages = ["20:00:00", "20:00:00", "16:00:00", "15:00:00"].flatMap((time, day) => [
    { date: `2026-10-${12 + day}`, time: "08:00:00", direction: "in" as const },
    { date: `2026-10-${12 + day}`, time, direction: "out" as const },
  ]);
  const plan = readDayPlan([480,480,480,450,0,0,0])!;
  const target = 39.5 * 3600;
  const awaiting = presentReport(report, plan, now, false, target, [4]);
  expect(awaiting.days[4].state).toBe("awaiting-entry");
  expect(awaiting.days[4].source.workingDay).toBe(true);
  expect(awaiting.days[4].source.dailyGoalSeconds).toBe(1800);
  report.passages.push({ date: "2026-10-16", time: "08:00:00", direction: "in" });
  const running = presentReport(report, plan, Date.parse("2026-10-16T08:15:00+03:00"), false, target, [4]);
  expect(running.days[4].source.exitGoalSeconds).toBe(1800);
  expect(running.days[4].firstEntry! + running.days[4].source.exitGoalSeconds! * 1000)
    .toBe(Date.parse("2026-10-16T08:30:00+03:00"));
  expect(running.days[4].source.pofi.percentage).toBe(50);
  const closed = presentReport({ ...report, passages: report.passages.slice(0,-1) }, plan, now, false, target);
  expect(closed.days[4].state).toBe("non-working");
  expect(closed.days[4].source.exitGoalSeconds).toBeNull();
});

test("Cuma izni 32 saat hedefini ve Perşembe 5:20 çıkış hesabını rapora taşır", () => {
  const report = fixture();
  report.passages = ["17:00:00", "17:00:00", "16:40:00"].flatMap((time, index) => [
    { date: `2026-10-${12 + index}`, time: "08:00:00", direction: "in" as const },
    { date: `2026-10-${12 + index}`, time, direction: "out" as const },
  ]);
  report.passages.push({ date: "2026-10-15", time: "08:00:00", direction: "in" });
  const plans = changeWeekPlan(emptyWorkPlans(), report.from, [480,480,480,480,0,0,0], [], 115200, [4]);
  const result = presentReport(report, resolveStoredPlan(plans, report.from), Date.parse("2026-10-15T10:00:00+03:00"), false, resolveStoredTarget(plans, report.from));
  expect(result.days[3].source.dailyGoalSeconds).toBe(19200);
  expect(result.days[3].firstEntry! + result.days[3].source.exitGoalSeconds! * 1000)
    .toBe(Date.parse("2026-10-15T13:20:00+03:00"));
  expect(result.days[4].source.dailyGoalSeconds).toBe(0);
  expect(result.days[4].state).toBe("future");
  const friday = presentReport(report, resolveStoredPlan(plans, report.from), now, false, resolveStoredTarget(plans, report.from));
  expect(friday.days[4].state).toBe("non-working");
  expect(result.days[4].source.exitGoalSeconds).toBeNull();
});

test("şablon değişikliği miras alınan haftanın hedefini rapora ve Cuma çıkışına taşır", () => {
  const report = fixture();
  const thursday = Date.parse("2026-10-15T15:00:00+03:00");
  report.passages = ["17:00:00", "17:00:00", "16:40:17"].flatMap((time, index) => [
    { date: `2026-10-${12 + index}`, time: "08:00:00", direction: "in" as const },
    { date: `2026-10-${12 + index}`, time, direction: "out" as const },
  ]);
  const before = presentReport(report, DEFAULT_WORK_PLAN, thursday, false);
  const changed = changeDefaultPlan(emptyWorkPlans(), readDayPlan([540,540,540,540,540,0,0])!, report.from,
    completedDaySeconds(before.days, report.from, "2026-10-15"));
  const after = presentReport(report, resolveStoredPlan(changed, report.from), thursday, false, resolveStoredTarget(changed, report.from));
  expect(resolveStoredTarget(changed, report.from)).toBe(162000);
  expect(after.days.slice(0,3).map(day => day.recordedSeconds)).toEqual([32400,32400,31217]);
  expect(after.days[3].source.dailyGoalSeconds).toBe(32400);
  expect(after.days[4].source.dailyGoalSeconds).toBe(33583);
  report.passages.push({ date: "2026-10-15", time: "08:00:00", direction: "in" },
    { date: "2026-10-15", time: "17:00:00", direction: "out" },
    { date: "2026-10-16", time: "08:00:00", direction: "in" });
  const friday = presentReport(report, resolveStoredPlan(changed, report.from), now, false, resolveStoredTarget(changed, report.from));
  expect(friday.days[4].source.dailyGoalSeconds).toBe(33583);
  expect(friday.days[4].source.exitGoalSeconds).toBe(33583);
  expect(friday.days[4].firstEntry! + friday.days[4].source.exitGoalSeconds! * 1000)
    .toBe(Date.parse("2026-10-16T17:19:43+03:00"));
});

test("hafta sonu kayıtları raporda ve gerçekleşen toplamda kalır; plan hedefi hafta içidir", () => {
  const report = fixture();
  report.passages = [8,8,8,8,8,2,1].flatMap((hours, index) => [
    { date: `2026-10-${12 + index}`, time: "08:00:00", direction: "in" as const },
    { date: `2026-10-${12 + index}`, time: `${String(8 + hours).padStart(2, "0")}:00:00`, direction: "out" as const },
  ]);
  const result = presentReport(report, DEFAULT_WORK_PLAN, Date.parse("2026-10-19T09:00:00+03:00"), false);
  expect(result.days).toHaveLength(7);
  expect(result.days.slice(5).map(day => day.recordedSeconds)).toEqual([7200,3600]);
  expect(result.days.slice(5).map(day => day.source.dailyGoalSeconds)).toEqual([0,0]);
  expect(summarizeWeek(result.days, "2026-10-19").totalSeconds).toBe(43 * 3600);
  expect(result.days.reduce((sum, day) => sum + day.source.dailyGoalSeconds, 0)).toBe(40 * 3600);
});

test("tamamlanan günlerden sonra güncel 14:50 planı hedef çıkışa taşınır", () => {
  const report = fixture();
  report.passages = ["16:03:00", "16:42:00", "16:25:00"].flatMap((time, index) => [
    { date: `2026-10-${12 + index}`, time: "08:00:00", direction: "in" as const },
    { date: `2026-10-${12 + index}`, time, direction: "out" as const },
  ]);
  report.passages.push({ date: "2026-10-15", time: "08:00:00", direction: "in" });
  const result = presentReport(report, [480,480,390,890,0,0,0], Date.parse("2026-10-15T15:00:00+03:00"), false, 144000);
  expect(result.days[3].source.exitGoalSeconds).toBe(53400);
  expect(result.days[3].firstEntry! + result.days[3].source.exitGoalSeconds! * 1000)
    .toBe(Date.parse("2026-10-15T22:50:00+03:00"));
});
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
test.each([
  ["2026-10-12", "2026-10-18", 26100, 26100],
  ["2026-10-12", "2026-10-16", 28800, null],
  ["2026-10-13", "2026-10-18", 28800, null],
] as const)("rapor sınırları %s–%s devir ve çıkış hedefini belirler", (from, to, dailyGoal, exitGoal) => {
  const report = fixture();
  report.from = from;
  report.to = to;
  report.passages = report.passages.filter(passage => passage.date >= from && passage.date <= to);
  report.passages.find(passage => passage.date === "2026-10-15" && passage.direction === "out")!.time = "16:45:00";
  const view = presentReport(report, DEFAULT_WORK_PLAN, now, false);
  const friday = view.days.find(day => day.date === "2026-10-16")!;
  expect(friday.source.dailyGoalSeconds).toBe(dailyGoal);
  expect(friday.source.exitGoalSeconds).toBe(exitGoal);
  expect(friday.source.total).toBe(25200);
  expect(friday.state).toBe("ongoing");
});

test("prepared report ticks only today's duration and keeps stable records, intervals and goals", () => {
  const read = prepareReport(fixture(), DEFAULT_WORK_PLAN, "2026-10-16", false);
  const before = read(now);
  const after = read(now + 1000);
  expect(after.days[4].recordedSeconds).toBe(14400);
  expect(after.days[4].liveSeconds).toBe(25201);
  expect(after.days[4].source.estimated).toBe(10801);
  expect(after.days[4].source.exitGoalSeconds).toBe(28800);
  expect(after.days[4].records).toBe(before.days[4].records);
  expect(after.days[4].intervals).toBe(before.days[4].intervals);
  expect(after.days[4].source.dailyGoalSeconds).toBe(28800);
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
  const changedPlan = readDayPlan([420, 420, 420, 420, 420, 0, 0])!;
  expect(
    prepareReport(report, changedPlan, "2026-10-16", false)(now).days[4].source.dailyGoalSeconds,
  ).toBe(10800);
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
  expect(days[4].source).toMatchObject({
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
test("eksik seçili gün borç üretmez, son gün geçerli fazla/eksik süreyi devralır", () => {
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
  ).toBe(8 * 3600);
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
test.each([
  { name: "giriş yok", clock: "10:00:00", exit: null, empty: true, state: "idle" },
  { name: "canlı yüzde 25", clock: "10:00:00", exit: null, state: "working" },
  { name: "canlı yüzde 80", clock: "14:24:00", exit: null, state: "tired" },
  { name: "canlı yüzde 100", clock: "16:00:00", exit: null, state: "working" },
  { name: "canlı yüzde 114", clock: "17:07:12", exit: null, state: "working" },
  { name: "canlı yüzde 115", clock: "17:12:00", exit: null, state: "overworked" },
  { name: "canlı yüzde 125", clock: "18:00:00", exit: null, state: "overworked" },
  { name: "kayıtlı yüzde 100", clock: "18:00:00", exit: "16:00:00", state: "completed" },
  { name: "kayıtlı yüzde 114", clock: "18:00:00", exit: "17:07:12", state: "completed" },
  { name: "kayıtlı yüzde 115", clock: "18:00:00", exit: "17:12:00", state: "overworked" },
  { name: "son hareket çıkış, hedef öncesi", clock: "15:00:00", exit: "12:00:00", state: "break", message: "Kupam için masada yer açtım." },
  { name: "saniyeli çıkış kaydı", clock: "15:00:00", exit: "12:00:01", state: "break", message: "Kupam için masada yer açtım." },
  { name: "belirsiz geçiş", clock: "18:00:00", exit: null, uncertain: true, state: "error" },
  { name: "eski raporda fazla mesai tahmini yok", clock: "18:00:00", exit: null, stale: true, state: "working" },
])("Pofi tüm durumları ortak rapordan seçer: $name", (scenario) => {
  const report = fixture();
  if (scenario.empty) report.passages = report.passages.slice(0, 8);
  if (scenario.exit) {
    report.passages = report.passages.slice(0, 9);
    report.passages.push({ date: "2026-10-16", time: scenario.exit, direction: "out" });
  }
  if (scenario.uncertain) report.passages[9].direction = "in";
  const pofi = presentReport(
    report,
    DEFAULT_WORK_PLAN,
    Date.parse(`2026-10-16T${scenario.clock}+03:00`),
    scenario.stale ?? false,
  ).days[4].source.pofi;
  expect(pofi.state).toBe(scenario.state);
  expect(pofi.asset).toBe(`/pofi/states/${scenario.state}.webp`);
  if (scenario.message) expect(pofi.message).toBe(scenario.message);
  if (scenario.state === "overworked") {
    expect(pofi.title).toBe("Hedefin üzerinde.");
    expect(pofi.message).toBe("Farkı bir kenara not ettim.");
  }
});

test("plan sınırları 0–16 saat/gün ve yarım saat adımlarıdır; tüm günler kapatılabilir", () => {
  expect(readDayPlan([960, 0, 0, 0, 0, 0, 0])).not.toBeNull();
  expect(readDayPlan([990, 0, 0, 0, 0, 0, 0])).toBeNull();
  expect(readDayPlan([480, 0, 0, 0, 0, 480, 0])).toBeNull();
  expect(readDayPlan([15, 15, 0, 0, 0, 0, 0])).toBeNull();
  expect(weeklyTarget(readDayPlan([0, 0, 0, 0, 0, 0, 0])!)).toBe(0);
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

test("45 dakika devirde günlük ve haftalık hedef aynı saniyede tamamlanır; hedef çıkış ve tablo ortak hedefi kullanır", () => {
  const report = fixture();
  report.passages[1].time = "16:30:00";
  report.passages[3].time = "16:15:00";
  report.passages = report.passages.filter(event => event.date !== "2026-10-16");
  report.passages.push({ date: "2026-10-16", time: "08:00:00", direction: "in" });
  const before = presentReport(report, DEFAULT_WORK_PLAN, Date.parse("2026-10-16T15:14:59+03:00"), false);
  const at = presentReport(report, DEFAULT_WORK_PLAN, Date.parse("2026-10-16T15:15:00+03:00"), false);
  expect(before.days[4].source.dailyGoalSeconds).toBe(26100);
  expect(before.days[4].source.total).toBe(26099);
  expect(summarizeWeek(before.days, "2026-10-16").totalSeconds).toBe(143999);
  expect(at.days[4].source.total).toBe(26100);
  expect(at.days[4].source.exitGoalSeconds).toBe(26100);
  expect(at.days[4].source.dailyGoalSeconds).toBe(26100);
  expect(summarizeWeek(at.days, "2026-10-16").totalSeconds).toBe(144000);
  expect(at.days[4].source.pofi.percentage).toBe(100);
  expect(at.days[4].source.pofi.state).toBe("working");
  expect(at.days.map(day => day.source.dailyGoalSeconds)).toEqual([28800, 28800, 28800, 28800, 26100, 0, 0]);
  expect(DEFAULT_WORK_PLAN).toEqual([480, 480, 480, 480, 480, 0, 0]);
});

test("tamamlanan gün özel hedefini korur; geçmiş raporda özgün plan kullanılır", () => {
  const plan = readDayPlan([480, 480, 450, 510, 450, 0, 0])!;
  const report = fixture();
  report.passages.pop();
  report.passages.at(-1)!.time = "15:30:00";
  const current = presentReport(report, plan, now, false);
  expect(current.days.map(day => day.source.dailyGoalSeconds)).toEqual([28800, 28800, 27000, 30600, 27000, 0, 0]);
  expect(current.days[4].source.dailyGoalSeconds).toBe(27000);
  const historical = presentReport(report, plan, Date.parse("2026-10-23T15:00:00+03:00"), false);
  expect(historical.days[4].source.dailyGoalSeconds).toBe(27000);
});

test("devirle sıfırlanan hedef Pofi için tanımlı yüzde üretir; kayıt durumunu korur", () => {
  const report = fixture();
  for (const index of [1, 3, 5, 7]) report.passages[index].time = "18:00:00";
  const live = presentReport(report, DEFAULT_WORK_PLAN, now, false).days[4];
  expect(live.source.dailyGoalSeconds).toBe(0);
  expect(live.source.exitGoalSeconds).toBe(0);
  expect(live.source.pofi.percentage).toBe(100);
  expect(live.source.pofi.state).toBe("working");
  report.passages.pop();
  const closed = presentReport(report, DEFAULT_WORK_PLAN, now, false).days[4];
  expect(closed.source.pofi.percentage).toBe(100);
  expect(closed.source.pofi.state).toBe("completed");
});

test("özel planın eksiği yalnız Cuma çıkışını uzatır; ara çıkış hedefi ötelemez", () => {
  const report = fixture();
  report.passages = [
    { date: "2026-10-12", time: "08:00:00", direction: "in" },
    { date: "2026-10-12", time: "13:30:00", direction: "out" },
    { date: "2026-10-13", time: "08:00:00", direction: "in" },
    { date: "2026-10-13", time: "18:00:00", direction: "out" },
    ...["2026-10-14", "2026-10-15"].flatMap(date => [
      { date, time: "08:00:00", direction: "in" as const },
      { date, time: "16:00:00", direction: "out" as const },
    ]),
    { date: "2026-10-16", time: "08:00:00", direction: "in" },
    { date: "2026-10-16", time: "12:00:00", direction: "out" },
    { date: "2026-10-16", time: "13:00:00", direction: "in" },
  ];
  const plan = readDayPlan([360, 600, 480, 480, 480, 0, 0])!;
  const tuesday = presentReport(report, plan, Date.parse("2026-10-13T15:00:00+03:00"), false);
  expect(tuesday.days[1].source.exitGoalSeconds).toBe(36000);
  const friday = presentReport(report, plan, now, false);
  expect(friday.days.map(day => day.source.dailyGoalSeconds)).toEqual([21600, 36000, 28800, 28800, 30600, 0, 0]);
  expect(plan).toEqual([360, 600, 480, 480, 480, 0, 0]);
  expect(friday.days[4].source.exitGoalSeconds).toBe(30600);
  expect(friday.days[4].firstEntry! + friday.days[4].source.exitGoalSeconds! * 1000).toBe(Date.parse("2026-10-16T16:30:00+03:00"));
  expect(friday.days[4].source.total).toBe(25200);
});
