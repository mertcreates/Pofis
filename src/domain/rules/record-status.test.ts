import { expect, test } from "bun:test";
import { presentReport, type Report } from "../report";
import { DEFAULT_WORK_PLAN, completedDaySeconds, planProtectionMarkers, resolveWeekPlan,
  editRequiredMinutes, changeDefaultPlan, emptyWorkPlans, resolveStoredPlan, type WorkPlan } from "./work-plan";
import { summarizeWeek } from "./week";
import type { DayState } from "./record-status";
import { passageDay } from "./passages.js";
import { stateLabel } from "../../components/attendance/labels";

const today = "2026-10-16";
const now = Date.parse(`${today}T15:00:00+03:00`);
const closed = [
  ["08:00:00", "in"],
  ["12:00:00", "out"],
] as const;
const open = [...closed, ["13:00:00", "in"]] as const;
test.each([
  { name: "art arda giriş", events: [["08:00:00", "in"], ["09:00:00", "in"], ["12:00:00", "out"]], kind: "repeated-entry", time: "09:00:00" },
  { name: "girişsiz çıkış", events: [["12:00:00", "out"]], kind: "unmatched-exit", time: "12:00:00" },
  { name: "art arda çıkış", events: [["08:00:00", "in"], ["12:00:00", "out"], ["13:00:00", "out"]], kind: "unmatched-exit", time: "13:00:00" },
  { name: "geçmiş açık giriş", events: [["08:00:00", "in"]], kind: "missing-exit", time: "08:00:00" },
] as const)("kayıt sorunu neden ve saatle rapora taşınır: $name", ({ events, kind, time }) => {
  const day = presentReport(fixture("2026-10-15", events), DEFAULT_WORK_PLAN, now, false).days[3];
  expect(day.state).toBe("uncertain");
  expect(day.recordIssues).toEqual([{ kind, time }]);
  expect(day.liveSeconds).toBeNull();
});

test("bugünkü açık giriş ve tutarlı geçmiş çift sorun üretmez", () => {
  expect(passageDay([{ date: today, time: "08:00:00", direction: "in" }], today, today).issues).toEqual([]);
  const day = presentReport(fixture("2026-10-15", closed), DEFAULT_WORK_PLAN, now, false).days[3];
  expect(day.state).toBe("recorded");
  expect(day.recordIssues).toEqual([]);
  expect(day.recordedSeconds).toBe(14400);
});

test("geçmiş ara turnike hatasında ilk giriş ve son çıkış planı kilitler ve devre katılır", () => {
  const report = fixture("2026-10-15", [
    ["08:00:00", "in"], ["09:00:00", "in"], ["12:00:00", "out"], ["13:00:00", "out"],
  ]);
  const day = presentReport(report, DEFAULT_WORK_PLAN, now, false).days[3];
  expect(day.state).toBe("uncertain");
  expect(day.recordedSeconds).toBe(5 * 3600);
  const resolved = resolveWeekPlan([day], DEFAULT_WORK_PLAN, today, true);
  expect(resolved.locked[3]).toBe(true);
  expect(resolved.completed[3]).toBe(5 * 3600);
  expect(planProtectionMarkers([day], report.from, today)[3]).toBe(5 * 3600);
  expect(() => editRequiredMinutes(DEFAULT_WORK_PLAN, resolved, [{ day: 3, minutes: 420 }])).toThrow("Tamamlanan gün değiştirilemez");
});

test("geçmiş girişsiz çıkış günü kilitler, bilinmeyen süre devirde sıfır sayılmaz", () => {
  const report = fixture("2026-10-15", [["12:00:00", "out"]]);
  const day = presentReport(report, DEFAULT_WORK_PLAN, now, false).days[3];
  const resolved = resolveWeekPlan([day], DEFAULT_WORK_PLAN, today, true);
  expect(day.state).toBe("uncertain");
  expect(day.recordedSeconds).toBeNull();
  expect(resolved.locked[3]).toBe(true);
  expect(resolved.completed[3]).toBeNull();
  expect(planProtectionMarkers([day], report.from, today)[3]).toBe(0);
  expect(completedDaySeconds([day], report.from, today)[3]).toBeNull();
  expect(() => editRequiredMinutes(DEFAULT_WORK_PLAN, resolved, [{ day: 3, minutes: 420 }])).toThrow("Tamamlanan gün değiştirilemez");
  const changed = changeDefaultPlan(emptyWorkPlans(), [540, 540, 540, 540, 540, 0, 0], report.from,
    planProtectionMarkers([day], report.from, today));
  expect(resolveStoredPlan(changed, report.from)[3]).toBe(480);
});

test("okunamayan saat ve yön kayıt sorunu üretir", () => {
  for (const event of [{ time: "25:00:00", direction: "in" }, { time: "08:00:00", direction: "unknown" }]) {
    const day = passageDay([{ date: today, ...event }], today, today);
    expect(day.uncertain).toBe(true);
    expect(day.issues[0].kind).toBe("invalid-record");
  }
});
type Events = readonly (readonly [string, "in" | "out"])[];
function fixture(date: string, events: Events): Report {
  return {
    person: { id: "self", name: "Fixture", title: "", unit: "" },
    from: "2026-10-12",
    to: "2026-10-18",
    fetchedAt: new Date(now).toISOString(),
    passages: events.map(([time, direction]) => ({ date, time, direction })),
  };
}

const repeatedPassages: Events = [
  ["06:16:23", "in"], ["06:37:01", "out"],
  ["06:37:52", "in"], ["07:06:43", "out"],
  ["07:11:54", "in"], ["08:36:57", "out"],
  ["08:39:02", "in"], ["10:30:02", "out"],
  ["10:34:05", "in"], ["12:03:28", "out"],
  ["12:48:51", "in"], ["12:48:54", "in"],
  ["12:57:14", "out"], ["12:57:27", "out"],
  ["13:24:46", "in"],
];

test("ara tekrarlar korunurken son güvenilir giriş canlı mesaiyi sürdürür", () => {
  const report = fixture(today, repeatedPassages);
  const view = presentReport(report, DEFAULT_WORK_PLAN, now, false);
  const day = view.days[4];
  expect(day.state).toBe("ongoing");
  expect(day.recordedSeconds).toBe(24064);
  expect(day.liveSeconds).toBe(31417);
  expect(day.source.estimated).toBe(7353);
  expect(day.source.total).toBe(31417);
  expect(day.source.pofi.state).toBe("working");
  expect(day.source.pofi.basis).toBe("live");
  expect(day.recordIssues).toEqual([
    { kind: "repeated-entry", time: "12:48:54" },
    { kind: "unmatched-exit", time: "12:57:27" },
  ]);
  expect(stateLabel(day)).toContain("Mesai devam ediyor");
  expect(stateLabel(day)).toContain("12:48:54");
  expect(stateLabel(day)).toContain("12:57:27");
  expect(day.intervals.at(-1)).toEqual({ entry: Date.parse(`${today}T13:24:46+03:00`), exit: null });
  expect(summarizeWeek([day], today).incomplete).toBe(true);
  expect(summarizeWeek([day], today).totalSeconds).toBe(31417);
  const next = presentReport(report, DEFAULT_WORK_PLAN, now + 1000, false).days[4];
  expect(next.liveSeconds).toBe(31418);
  expect(next.source.estimated).toBe(7354);
});

test.each([
  { name: "eski rapor", stale: true, clock: "15:00:00", state: "open" },
  { name: "girişten önceki saat", stale: false, clock: "13:00:00", state: "open" },
  { name: "ertesi gün", stale: false, clock: "15:00:00", nextDay: true, state: "uncertain" },
  { name: "son giriş tekrarlı", stale: false, clock: "15:00:00", extra: [["13:24:49", "in"]], state: "uncertain" },
  { name: "son hareket çıkış", stale: false, clock: "15:00:00", extra: [["14:00:00", "out"]], state: "uncertain" },
] as const)("ara tekrarlar sonrası güven sınırı: $name", (scenario) => {
  const events: Events = [...repeatedPassages, ...(scenario.extra ?? [])];
  const day = presentReport(fixture(today, events), DEFAULT_WORK_PLAN,
    Date.parse(`${"nextDay" in scenario ? "2026-10-17" : today}T${scenario.clock}+03:00`), scenario.stale).days[4];
  expect(day.state).toBe(scenario.state);
  expect(day.liveSeconds).toBeNull();
  expect(day.recordedSeconds).toBe("extra" in scenario && scenario.name === "son hareket çıkış" ? 27817 : 24064);
  expect(day.recordIssues.length).toBeGreaterThanOrEqual(2);
  if (scenario.state === "uncertain") expect(day.source.pofi.state).toBe("error");
});

test("okunamayan hareket varken sonraki açık giriş canlı süreyi açmaz", () => {
  const report = fixture(today, open);
  report.passages.push({ date: today, time: "12:30:00", direction: "unknown" as "in" });
  const day = presentReport(report, DEFAULT_WORK_PLAN, now, false).days[4];
  expect(day.state).toBe("uncertain");
  expect(day.liveSeconds).toBeNull();
  expect(day.source.pofi.state).toBe("error");
});

const cases: {
  name: string;
  date: string;
  events: Events;
  state: DayState;
  stale?: boolean;
  plan?: WorkPlan;
}[] = [
  { name: "bugün boş", date: today, events: [], state: "awaiting-entry" },
  { name: "geçmiş boş", date: "2026-10-15", events: [], state: "missing" },
  { name: "gelecek boş", date: "2026-10-17", events: [], state: "future" },
  {
    name: "gelecek kayıtlı",
    date: "2026-10-17",
    events: closed,
    state: "future",
  },
  { name: "bugün kapalı", date: today, events: closed, state: "outside" },
  {
    name: "geçmiş kapalı",
    date: "2026-10-15",
    events: closed,
    state: "recorded",
  },
  { name: "bugün açık", date: today, events: open, state: "ongoing" },
  {
    name: "bugün yalnız giriş",
    date: today,
    events: [["08:00:00", "in"]],
    state: "ongoing",
  },
  {
    name: "eski raporda açık",
    date: today,
    events: open,
    stale: true,
    state: "open",
  },
  {
    name: "eski raporda yalnız giriş",
    date: today,
    events: [["08:00:00", "in"]],
    stale: true,
    state: "open",
  },
  {
    name: "eski raporda kapalı",
    date: today,
    events: closed,
    stale: true,
    state: "outside",
  },
  {
    name: "saatten ileride açık giriş",
    date: today,
    events: [...closed, ["16:00:00", "in"]],
    state: "open",
  },
  {
    name: "geçmiş günün sonunda açık",
    date: "2026-10-15",
    events: open,
    state: "uncertain",
  },
  {
    name: "geçmiş yalnız giriş",
    date: "2026-10-15",
    events: [["08:00:00", "in"]],
    state: "uncertain",
  },
  {
    name: "yalnız çıkış",
    date: today,
    events: [["12:00:00", "out"]],
    state: "uncertain",
  },
  {
    name: "ilk giriş öncesi çıkış",
    date: today,
    events: [["07:00:00", "out"], ...closed],
    state: "uncertain",
  },
  {
    name: "tekrarlanan giriş",
    date: today,
    events: [
      ["08:00:00", "in"],
      ["09:00:00", "in"],
      ["12:00:00", "out"],
    ],
    state: "uncertain",
  },
  {
    name: "tekrarlanan çıkış",
    date: today,
    events: [...closed, ["13:00:00", "out"]],
    state: "uncertain",
  },
  {
    name: "yeni geçerli çift önceki belirsizliği silmez",
    date: today,
    events: [
      ["07:00:00", "out"],
      ...closed,
      ["13:00:00", "in"],
      ["14:00:00", "out"],
    ],
    state: "uncertain",
  },
  {
    name: "kaynak sırası tarihe göre düzenlenir",
    date: today,
    events: [...closed].reverse(),
    state: "outside",
  },
];
const offPlan: WorkPlan = [480, 480, 480, 480, 0, 0, 0];
for (const date of [today, "2026-10-15"]) {
  const plan: WorkPlan = date === today ? offPlan : [480, 0, 0, 0, 0, 0, 0];
  cases.push(
    {
      name: `${date} plan dışı boş`,
      date,
      events: [],
      state: "non-working",
      plan,
    },
    {
      name: `${date} plan dışı kapalı`,
      date,
      events: closed,
      state: date === today ? "outside" : "recorded",
      plan,
    },
    {
      name: `${date} plan dışı bozuk`,
      date,
      events: [["12:00:00", "out"]],
      state: "uncertain",
      plan,
    },
  );
}
test.each(cases)(
  "kayıt durumu: $name",
  ({ date, events, state, stale, plan }) => {
    const view = presentReport(
      fixture(date, events),
      plan ?? DEFAULT_WORK_PLAN,
      now,
      stale ?? false,
    );
    const day = view.days.find((day) => day.date === date)!;
    expect(day.state).toBe(state);
    expect(day.liveSeconds !== null).toBe(state === "ongoing");
  },
);

test.each(["12:00:00", "16:00:00", "17:00:00"])(
  "hedefin altı/eşiti/üstü kayıt bütünlüğünü değiştirmez: %s",
  (exit) => {
    const report = fixture("2026-10-15", [
      ["08:00:00", "in"],
      [exit, "out"],
    ]);
    expect(
      presentReport(report, DEFAULT_WORK_PLAN, now, false).days[3].state,
    ).toBe("recorded");
  },
);

test("belirsiz geçmiş kayıt tablo, haftalık bütünlük ve çıkış hedefinde aynı sonucu kullanır", () => {
  const report = fixture("2026-10-15", open);
  report.passages.push(
    ...["2026-10-12", "2026-10-13", "2026-10-14", today].flatMap((date) =>
      (
        [
          ["08:00:00", "in"],
          ["16:00:00", "out"],
        ] as const
      ).map(([time, direction]) => ({ date, time, direction })),
    ),
  );
  const view = presentReport(report, DEFAULT_WORK_PLAN, now, false);
  expect(view.days[3].state).toBe("uncertain");
  expect(view.days[3].recordedSeconds).toBe(14400);
  expect(view.days[3].source.pofi.state).toBe("error");
  expect(view.blocked).toBe(true);
  expect(view.days[4].source.exitGoalSeconds).toBe(43200);
  expect(summarizeWeek(view.days, today).incomplete).toBe(true);
  expect(summarizeWeek(view.days, today).recordedSeconds).toBe(129600);
});

test("eksik gün devamsızlık ya da sıfır süre sayılmaz; plan dışı boş gün haftayı eksik yapmaz", () => {
  const view = presentReport(fixture(today, []), DEFAULT_WORK_PLAN, now, false);
  expect(view.days[3].recordedSeconds).toBeNull();
  expect(view.days[3].state).toBe("missing");
  const off = presentReport(
    fixture(today, []),
    offPlan,
    Date.parse("2026-10-17T00:00:00+03:00"),
    false,
  );
  expect(off.days[4].state).toBe("non-working");
  expect(summarizeWeek([off.days[4]], "2026-10-17").incomplete).toBe(false);
});
