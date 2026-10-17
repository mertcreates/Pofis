import { expect, test } from "bun:test";
import { presentReport, type Report } from "../report";
import { DEFAULT_WORK_PLAN, type WorkPlan } from "./work-plan";
import { summarizeWeek } from "./week";
import type { DayState } from "./record-status";

const today = "2026-10-16";
const now = Date.parse(`${today}T15:00:00+03:00`);
const closed = [
  ["08:00:00", "in"],
  ["12:00:00", "out"],
] as const;
const open = [...closed, ["13:00:00", "in"]] as const;
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
  expect(view.days[4].source.exitGoalSeconds).toBe(28800);
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
