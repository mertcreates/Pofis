import { expect, test } from "bun:test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { summaryRecord, summarize } from "./recorded-time.js";
import { dailyDurationState, durationTotals } from "./duration.js";
import { targetProgress, percentage, chartMaximum } from "./progress.js";
import {
  readDayPlan,
  weeklyTarget,
  targetExitAt,
} from "./work-plan";
import { pofiNote } from "./pofi.js";
import { pofiNotebookDates, defaultNotebookDate } from "./notebook-calendar";
import { specialMinuteRemaining, nextSurpriseTap } from "./pofi-surprises";
import { presentReport, type Report } from "../report";
import { summarizeWeek } from "./week";

const today = "2026-10-16";
const at = (clock: string) => new Date(`${today}T${clock}+03:00`);
const passages = [
  { date: today, time: "08:00:00", direction: "in" },
  { date: today, time: "12:00:00", direction: "out" },
  { date: today, time: "13:00:00", direction: "in" },
];

test.each([
  [null, null, "empty", null],
  ["08:00:00", null, "open", null],
  [null, "12:00:00", "uncertain", null],
  ["13:00:00", "12:00:00", "uncertain", null],
  ["25:00:00", "12:00:00", "uncertain", null],
  ["08:00:00", "12:00:00", "recorded", 14400],
])(
  "kayıt sınıflandırması: %s / %s",
  (firstEntry, lastExit, record, seconds) => {
    expect(summaryRecord({ firstEntry, lastExit })).toEqual({
      record,
      seconds,
    });
  },
);

test.each([
  ["15:00:00", false, 3, "live", 25200, 10800],
  ["16:00:00", false, 3, "live", 28800, 14400],
  ["15:00:00", true, 3, "recorded", 14400, 0],
  ["15:00:00", false, 2, "recorded", 14400, 0],
  ["12:30:00", false, 3, "recorded", 14400, 0],
] as const)(
  "tahmin koşulları: %s stale=%s geçiş=%s",
  (clock, stale, count, basis, total, estimated) => {
    const day = summarize(passages, today, today, today).days[0];
    const result = dailyDurationState({
      day,
      dailySeconds: 28800,
      isToday: true,
      now: at(clock),
      stale,
      passages: passages.slice(0, count),
    });
    expect(result.basis).toBe(basis);
    expect(durationTotals(day.duration, result)).toEqual({
      recorded: 14400,
      estimated,
      total,
    });
    const pofi = pofiNote({
      day,
      dailySeconds: 28800,
      workingDay: true,
      isToday: true,
      now: at(clock),
      stale,
      passages: passages.slice(0, count),
      today,
    });
    expect(pofi.basis).toBe(basis);
    expect(pofi.percentage).toBe(
      total === 25200 ? 87 : total === 28800 ? 100 : 50,
    );
  },
);

test("haftalık hedef değişikliği günlük hedef, tahmin, Pofi ve haftalık toplamda birlikte görünür", () => {
  const report: Report = {
    person: { id: "self", name: "Fixture", title: "", unit: "" },
    from: "2026-10-12",
    to: "2026-10-18",
    fetchedAt: at("15:00:00").toISOString(),
    passages: [
      ...[12, 13, 14, 15].flatMap((day) => [
        { date: `2026-10-${day}`, time: "08:00:00", direction: "in" as const },
        { date: `2026-10-${day}`, time: "16:00:00", direction: "out" as const },
      ]),
      ...(passages as Report["passages"]),
    ],
  };
  const shorter = readDayPlan([480, 480, 480, 480, 480, 0, 0])!;
  const longer = readDayPlan([540, 540, 540, 540, 540, 0, 0])!;
  const small = presentReport(report, shorter, at("15:00:00").getTime(), false);
  const large = presentReport(report, longer, at("15:00:00").getTime(), false);
  expect(small.dailySeconds).toBe(28800);
  expect(large.dailySeconds).toBe(46800);
  expect(small.days[4].source.exitGoalSeconds).toBe(28800);
  expect(large.days[4].source.exitGoalSeconds).toBe(46800);
  expect(small.days[4].source.pofi.state).toBe("tired");
  expect(large.days[4].source.pofi.state).toBe("working");
  for (const view of [small, large]) {
    expect(view.days[4].source.total).toBe(25200);
    expect(view.days[4].source.estimated).toBe(10800);
    expect(summarizeWeek(view.days, today).totalSeconds).toBe(140400);
  }
});

test("seçili gün, eksik kayıt ve son çalışma günü aynı plan sahibinden çözülür", () => {
  const plan = readDayPlan([480, 0, 480, 0, 480, 0, 0])!;
  const summary = summarize(
    [
      { date: "2026-10-12", time: "08:00:00", direction: "in" },
      { date: "2026-10-12", time: "17:00:00", direction: "out" },
      { date: "2026-10-14", time: "08:00:00", direction: "in" },
      { date: "2026-10-14", time: "16:00:00", direction: "out" },
      ...passages,
    ],
    "2026-10-12",
    "2026-10-18",
    today,
  );
  expect(weeklyTarget(plan)).toBe(86400);
  const report: Report = {
    person: { id: "self", name: "Fixture", title: "", unit: "" },
    from: "2026-10-12", to: "2026-10-18", fetchedAt: at("15:00:00").toISOString(),
    passages: summary.days.flatMap(day => day.firstEntry && day.lastExit ? [
      { date: day.date, time: day.firstEntry, direction: "in" as const },
      { date: day.date, time: day.lastExit, direction: "out" as const },
    ] : []),
  };
  const view = presentReport(report, plan, at("15:00:00").getTime(), false);
  expect(view).toMatchObject({
    blocked: false,
  });
  expect(view.days[4].source.exitGoalSeconds).toBe(25200);
  expect(targetExitAt(at("08:00:00").getTime(), 25200)).toBe(
    at("15:00:00").getTime(),
  );
  const missing = presentReport({ ...report, passages: passages as Report["passages"] }, plan, at("15:00:00").getTime(), false);
  expect(missing.blocked).toBe(true);
  expect(missing.days[4].source.exitGoalSeconds).toBe(28800);
});

test("ilerleme ve grafik aynı yuvarlama/ölçek sahibini kullanır", () => {
  expect(targetProgress(28799, 28800)).toEqual({
    percentage: 99,
    remaining: 1,
    excess: 0,
  });
  expect(percentage(29000, 28800)).toBe(101);
  expect(percentage(0, 0)).toBe(100);
  expect(chartMaximum([])).toBe(36000);
  expect(chartMaximum([0])).toBe(36000);
  expect(chartMaximum([45000])).toBe(50400);
});

test("not defteri tarihleri ve sürprizler İstanbul takvimine bağlıdır", () => {
  const dates = pofiNotebookDates("2029-12-08", ["12-08"]);
  expect(dates).toEqual([
    "2029-12-03",
    "2029-12-04",
    "2029-12-05",
    "2029-12-06",
    "2029-12-07",
    "2029-12-08",
  ]);
  expect(defaultNotebookDate("2029-12-08", dates)).toBe("2029-12-08");
  expect(defaultNotebookDate("2029-12-09", dates)).toBe("2029-12-07");
  expect(specialMinuteRemaining(at("12:34:30").getTime())).toBe(30000);
  expect(specialMinuteRemaining(at("12:35:00").getTime())).toBe(0);
  expect([0, 1, 2, 3].map(nextSurpriseTap)).toEqual([1, 2, 3, 3]);
});

test("her kural sahibi belgelenir ve çalışma zamanı UI/sunucu orkestrasyonuna bağımlı olmaz", () => {
  const directory = import.meta.dir;
  const docs = resolve(directory, "../../../docs/rules");
  const modules = readdirSync(directory).filter(
    (file) => /\.(ts|js)$/.test(file) && !file.endsWith(".test.ts"),
  );
  for (const file of modules) {
    const name = file.replace(/\.(ts|js)$/, "");
    expect(existsSync(resolve(docs, `${name}.md`))).toBe(true);
    const source = readFileSync(resolve(directory, file), "utf8");
    const imports = [
      ...source.matchAll(
        /import\s+(?!type\b)([\s\S]*?)\s+from\s+["']([^"']+)["']/g,
      ),
    ];
    for (const [, names, target] of imports) {
      if (/^\{\s*type\b/.test(names.trim())) continue;
      expect(target).not.toMatch(
        /(?:server|components|data|next|react|attendance)/,
      );
    }
  }
  for (const file of readdirSync(docs).filter((name) => name.endsWith(".md"))) {
    const path = resolve(docs, file);
    const links = [
      ...readFileSync(path, "utf8").matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g),
    ];
    for (const [, link] of links)
      expect(existsSync(resolve(dirname(path), link))).toBe(true);
  }
});
