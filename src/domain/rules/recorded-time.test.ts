import { expect, test } from "bun:test";
import {
  recordedRowsFromPassages,
  summaryRecord,
  summarize,
} from "./recorded-time.js";
import { presentReport, type SourcePassage } from "../report";
import { DEFAULT_WORK_PLAN } from "./work-plan";
import { durationSegments } from "../attendance";

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
  [[passage("07:00:00", "out"), passage("08:00:00", "in")], "uncertain", null],
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
  ];
  const rows = recordedRowsFromPassages(passages);
  expect(rows.map((row) => row.date)).toEqual(["2026-10-12", "2026-10-13"]);
  const result = summarize(passages, "2026-10-12", "2026-10-18", "2026-10-16");
  expect(result.weeks[0].seconds).toBe(17 * 3600);
  expect(result.days).toHaveLength(7);
  expect(result.days[2].duration).toBeNull();
  expect(result.days[6].status).toBe("future");
});

test("tek kaynak 4 saat kayıtlı + 3 saat tahmin üretir; son çıkış ve eski rapor tahmini durdurur", () => {
  const passages = [
    passage("08:00:00", "in"),
    passage("12:00:00", "out"),
    passage("13:00:00", "in"),
  ];
  const report = {
    person: { id: "self", name: "Fixture", unit: "", title: "" },
    from: "2026-10-12",
    to: "2026-10-18",
    fetchedAt: "2026-10-16T12:00:00Z",
    passages,
  };
  const now = Date.parse("2026-10-16T15:00:00+03:00");
  const day = presentReport(report, DEFAULT_WORK_PLAN, now, false).days[4];
  expect(durationSegments(day)).toEqual({ recorded: 4 * 3600, estimated: 3 * 3600 });
  expect(day.records).toHaveLength(3);
  expect(day.source!.dailyGoalSeconds).toBe(8 * 3600);
  expect(presentReport(report, DEFAULT_WORK_PLAN, now, true).days[4].liveSeconds).toBeNull();
  report.passages = passages.slice(0, 2);
  expect(presentReport(report, DEFAULT_WORK_PLAN, now, false).days[4].liveSeconds).toBeNull();
});
