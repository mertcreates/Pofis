import { expect, test } from "bun:test";
import {
  recordedRowsFromPassages,
  summaryRecord,
  summarize,
} from "./recorded-time.js";
import { presentReport, type SourcePassage } from "../report";
import { DEFAULT_WORK_PLAN } from "./work-plan";
import { summarizeWeek } from "./week";

const passage = (
  time: string,
  direction: "in" | "out",
  date = "2026-10-16",
): SourcePassage => ({ date, time, direction });

test("turnikeden ilk giriş–son çıkış türetilir; ara çıkışlar düşülmez ve kaynak sırası değişmez", () => {
  const events = [
    passage("16:00:00", "out"),
    passage("13:00:00", "in"),
    passage("08:00:00", "in"),
    passage("12:00:00", "out"),
  ];
  const before = structuredClone(events);
  const rows = recordedRowsFromPassages(events);
  expect(rows).toEqual([
    { date: "2026-10-16", firstEntry: "08:00:00", lastExit: "16:00:00" },
  ]);
  expect(summaryRecord(rows[0])).toEqual({ record: "recorded", seconds: 8 * 3600 });
  expect(events).toEqual(before);
});

test.each([
  [[], "empty", null],
  [[passage("08:00:00", "in")], "open", null],
  [[passage("12:00:00", "out")], "uncertain", null],
  [[passage("07:00:00", "out"), passage("08:00:00", "in")], "open", null],
  [[passage("25:00:00", "in"), passage("12:00:00", "out")], "uncertain", null],
] as const)(
  "boş/açık/eşleşmeyen hareketler kayıtlı sıfır süre uydurmaz: %s",
  (events, record, seconds) => {
    const rows = recordedRowsFromPassages([...events]);
    expect(summaryRecord(rows[0])).toEqual({ record, seconds });
  },
);

test("günler birbirine karışmaz; hareket olmayan ve gelecek günler haftalık toplamı büyütmez", () => {
  const passages = [
    passage("16:00:00", "out", "2026-10-13"),
    passage("08:00:00", "in", "2026-10-12"),
    passage("08:00:00", "in", "2026-10-13"),
    passage("17:00:00", "out", "2026-10-12"),
    passage("08:00:00", "in", "2026-10-18"),
    passage("16:00:00", "out", "2026-10-18"),
  ];
  const rows = recordedRowsFromPassages(passages);
  expect(rows.map((row) => row.date)).toEqual(["2026-10-12", "2026-10-13", "2026-10-18"]);
  const result = summarize(passages, "2026-10-12", "2026-10-18", "2026-10-16");
  expect(result.days.map(day => day.duration)).toEqual([32400, 28800, null, null, null, null, null]);
  const view = presentReport({
    person: { id: "self", name: "Fixture", unit: "", title: "" },
    from: "2026-10-12", to: "2026-10-18", fetchedAt: "2026-10-16T12:00:00Z", passages,
  }, DEFAULT_WORK_PLAN, Date.parse("2026-10-16T15:00:00+03:00"), false);
  expect(summarizeWeek(view.days, "2026-10-16").recordedSeconds).toBe(17 * 3600);
  expect(view.days[6].state).toBe("future");
});

test.each([
  ["2026-10-12", "2026-10-18", false],
  ["2026-10-12", "2026-10-16", true],
  ["2026-10-13", "2026-10-18", true],
  ["2026-10-16", "2026-10-16", true],
  ["2026-12-28", "2027-01-10", false],
  ["2026-12-29", "2027-01-10", true],
  ["2026-12-28", "2027-01-09", true],
  ["2026-10-18", "2026-10-12", false],
] as const)("rapor aralığı %s–%s kısmi hafta=%s", (from, to, partial) => {
  expect(summarize([], from, to, "2026-10-16").partial).toBe(partial);
});
