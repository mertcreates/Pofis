import { expect, test } from "bun:test";
import { weeklyRuler } from "./weekly-ruler";
import type { DayReport } from "@/domain/attendance";

function day(date: string, target: number, recorded: number, estimated = 0, workingDay = true) {
  return { date, source: { workingDay, dailyGoalSeconds: target, recorded, estimated, total: recorded + estimated } } as DayReport;
}

test("each selected day fills against its own effective target", () => {
  const result = weeklyRuler([day("2026-10-12", 6, 3), day("2026-10-13", 10, 5), day("2026-10-14", 8, 0, 0, false)]);
  expect(result).toHaveLength(2);
  expect(result.map(s => s.filled)).toEqual([0.5, 0.5]);
});

test("a completed day does not fill the next day; live time stays in its own day", () => {
  const result = weeklyRuler([day("2026-10-12", 8, 12), day("2026-10-13", 8, 4, 2), day("2026-10-14", 8, 0)]);
  expect(result.map(s => s.recorded)).toEqual([1, 0.5, 0]);
  expect(result.map(s => s.filled)).toEqual([1, 0.75, 0]);
});

test("zero duration open days remain visible without a fictitious recorded duration", () => {
  const result = weeklyRuler([day("2026-10-12", 0, 0), day("2026-10-13", 0, 1)]);
  expect(result).toHaveLength(2);
  expect(result.map(s => s.filled)).toEqual([0, 1]);
});

test("an empty plan has no daily bars", () => {
  expect(weeklyRuler([day("2026-10-12", 0, 0, 0, false)])).toEqual([]);
});
