import { expect, test } from "bun:test";
import { changeDefaultPlan, changeWeekLockedDays, changeWeekPlan, completeWeekPlan, DEFAULT_WORK_PLAN,
  emptyWorkPlans, readDayPlan, resolveStoredPlan, resolveStoredTarget, resolveUserLockedDays, resolveWeekPlan } from "./work-plan";
import { readStoredPlans, serializePlans } from "@/lib/plan-storage.js";

const week = "2026-10-12";
const plan = readDayPlan([480, 480, 480, 480, 420, 0, 0])!;
const days = Array.from({ length: 7 }, (_, day) => ({
  date: `2026-10-${12 + day}`, state: "awaiting-entry" as const, recordedSeconds: null,
}));

test("kullanıcı kilidi kaydedilir; otomatik devir korur, Sıfırla kilidi ve özel planı kaldırır", () => {
  const initial = changeWeekPlan(emptyWorkPlans(), week, plan, [], 39 * 3600);
  const locked = changeWeekLockedDays(initial, week, [4], plan);
  const stored = readStoredPlans(serializePlans(locked));
  expect(resolveUserLockedDays(stored, week)).toEqual([4]);
  expect(resolveStoredTarget(stored, week)).toBe(39 * 3600);
  const carried = resolveWeekPlan(days, resolveStoredPlan(stored, week), week, false, 40 * 3600, [], false, [4]);
  expect(carried.displaySeconds[4]).toBe(420 * 60);
  expect(carried.displaySeconds[3]).toBe(540 * 60);
  const reset = changeWeekPlan(stored, week, null);
  expect(resolveUserLockedDays(reset, week)).toEqual([]);
  expect(resolveStoredPlan(reset, week)).toEqual(DEFAULT_WORK_PLAN);
  expect(resolveStoredTarget(reset, week)).toBe(40 * 3600);
  expect(reset).toEqual(emptyWorkPlans());
  expect(changeWeekPlan(reset, week, null)).toEqual(reset);
  const template = readDayPlan([540, 540, 540, 540, 540, 0, 0])!;
  expect(resolveStoredPlan(changeDefaultPlan(stored, template, week), week)[4]).toBe(420);
  expect(resolveStoredPlan(changeWeekPlan(stored, week, DEFAULT_WORK_PLAN), week)[4]).toBe(420);
  const sameForNow = readDayPlan([480, 480, 480, 480, 420, 0, 0])!;
  const afterSameTemplate = changeDefaultPlan(stored, sameForNow, week);
  expect(resolveStoredPlan(changeDefaultPlan(afterSameTemplate, template, week), week)[4]).toBe(420);
});

test("tamamla eşit tur ve son uygun gün seçeneklerinde kilidi atlar", () => {
  const resolved = resolveWeekPlan([], plan, week, false, 39 * 3600, [], false, [4]);
  const equal = completeWeekPlan(plan, DEFAULT_WORK_PLAN, resolved, "equal");
  const last = completeWeekPlan(plan, DEFAULT_WORK_PLAN, resolved, "last");
  expect(equal).toEqual([510, 510, 480, 480, 420, 0, 0]);
  expect(last).toEqual([480, 480, 480, 540, 420, 0, 0]);
  const noCapacity = resolveWeekPlan([], plan, week, false, 39 * 3600, [], false, [0, 1, 2, 3, 4]);
  expect(completeWeekPlan(plan, DEFAULT_WORK_PLAN, noCapacity, "equal")).toBeNull();
  expect(completeWeekPlan(plan, DEFAULT_WORK_PLAN, noCapacity, "last")).toBeNull();
});

test("varsayılan süreli günün kilidi yeniden yüklemede ve sonraki şablonda korunur", () => {
  const locked = readStoredPlans(serializePlans(changeWeekLockedDays(emptyWorkPlans(), week, [4], DEFAULT_WORK_PLAN)));
  const template = readDayPlan([540, 540, 540, 540, 540, 0, 0])!;
  expect(resolveStoredPlan(changeDefaultPlan(locked, template, week), week)[4]).toBe(480);
  expect(changeWeekLockedDays(locked, week, [], DEFAULT_WORK_PLAN)).toEqual(emptyWorkPlans());
});
