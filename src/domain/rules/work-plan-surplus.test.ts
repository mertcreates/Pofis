import { expect, test } from "bun:test";
import {
  DEFAULT_WORK_PLAN, changeWeekPlan, completeWeekPlan, editRequiredMinutes, emptyWorkPlans,
  resolveStoredPlan, resolveStoredTarget, resolveWeekPlan, type PlanDay,
} from "./work-plan";
import { readStoredPlans, serializePlans } from "@/lib/plan-storage.js";

const week = "2026-10-12";
const today = "2026-10-15";
function source(hours: readonly (number | null)[]): PlanDay[] {
  return hours.map((hours, day) => ({ date: `2026-10-${12 + day}`,
    state: hours === null ? "awaiting-entry" : "recorded", recordedSeconds: hours === null ? null : hours * 3600 }));
}

test.each([0.5, 8, 20])("%s saat fazla çalışma kalan günlerin planını azaltmaz; fark ayrı kalır", surplus => {
  const days = source([8 + surplus, 8, 8, null, null, null, null]);
  const result = resolveWeekPlan(days, DEFAULT_WORK_PLAN, today);
  expect(result.targets).toEqual([28800,28800,28800,28800,28800,0,0]);
  expect(result.displaySeconds.slice(3,5)).toEqual([28800,28800]);
  expect(result.exitGoal).toBe(28800);
  expect(result.unallocatedSeconds).toBe(-surplus * 3600);
  expect(result.projectedWeeklySeconds).toBe((40 + surplus) * 3600);
  expect(result.projectedWeeklySeconds + result.unallocatedSeconds).toBe(result.weeklySeconds);
  expect(DEFAULT_WORK_PLAN).toEqual([480,480,480,480,480,0,0]);
});

test("net fark saniye hassasiyetinde hesaplanır; eksik çalışma dağıtımı sürer", () => {
  const days = source([9,7,8,null,null,null,null]);
  days[0].recordedSeconds! += 17;
  const surplus = resolveWeekPlan(days, DEFAULT_WORK_PLAN, today);
  expect(surplus.unallocatedSeconds).toBe(-17);
  expect(surplus.targets[4]).toBe(28800);
  days[0].recordedSeconds = 8 * 3600;
  const shortfall = resolveWeekPlan(days, DEFAULT_WORK_PLAN, today);
  expect(shortfall.targets.slice(3,5)).toEqual([28800,32400]);
  expect(shortfall.unallocatedSeconds).toBe(0);
  expect(shortfall.projectedWeeklySeconds).toBe(144000);
});

test("Cuma izinliyken fazla süre Perşembeden düşülmez; eksik süre Perşembeye eklenir", () => {
  const plan = [480,480,480,480,0,0,0] as const;
  const days = source([9,8,8,null,null,null,null]);
  const surplus = resolveWeekPlan(days, plan, today);
  expect(surplus.targets[3]).toBe(28800);
  expect(surplus.targets[4]).toBe(0);
  expect(surplus.unallocatedSeconds).toBe(-3600);
  days[0].recordedSeconds = 7 * 3600;
  expect(resolveWeekPlan(days, plan, today).targets[3]).toBe(32400);
});

test("elle süre düzenleme ve yeniden yükleme fazla süreyi plana işlemez", () => {
  const days = source([9,8,8,null,null,null,null]);
  const before = resolveWeekPlan(days, DEFAULT_WORK_PLAN, today);
  const edit = editRequiredMinutes(DEFAULT_WORK_PLAN, before, [{ day: 3, minutes: 450 }]);
  const saved = readStoredPlans(serializePlans(changeWeekPlan(emptyWorkPlans(), week, edit.plan,
    before.completed, edit.targetSeconds, edit.leaveDays)));
  expect(resolveStoredPlan(saved, week)).toEqual([480,480,480,450,480,0,0]);
  expect(resolveStoredTarget(saved, week)).toBe(39.5 * 3600);
  const after = resolveWeekPlan(days, resolveStoredPlan(saved, week), today, false, resolveStoredTarget(saved, week));
  expect(after.targets.slice(3,5)).toEqual([27000,28800]);
  expect(after.unallocatedSeconds).toBe(-3600);
});

test("kullanıcının Tamamla eylemi fazla süreyi açıkça azaltabilir; kaydetme sonucu korunur", () => {
  const days = source([9,8,8,null,null,null,null]);
  const before = resolveWeekPlan(days, DEFAULT_WORK_PLAN, today, false, 41 * 3600);
  const next = completeWeekPlan(DEFAULT_WORK_PLAN, DEFAULT_WORK_PLAN, before, 3)!;
  expect(next).toEqual([480,480,480,480,420,0,0]);
  const saved = changeWeekPlan(emptyWorkPlans(), week, next, before.completed, 144000);
  const after = resolveWeekPlan(days, resolveStoredPlan(saved, week), today, false, resolveStoredTarget(saved, week));
  expect(after.projectedWeeklySeconds).toBe(144000);
  expect(after.unallocatedSeconds).toBe(0);
});

test("kaydedilmiş sıfır açık gün fazla çalışmayla kapanmaz; sonraki eksik kayıtta borç alır", () => {
  const plan = [480,480,480,450,0,0,0] as const;
  const days = source([12,12,8,8,null,null,null]);
  const surplus = resolveWeekPlan(days, plan, "2026-10-16", false, 39.5 * 3600, [4]);
  expect(surplus.workingDays[4]).toBe(true);
  expect(surplus.targets[4]).toBe(0);
  expect(surplus.unallocatedSeconds).toBe(-1800);
  days[3].recordedSeconds = 7 * 3600;
  expect(resolveWeekPlan(days, plan, "2026-10-16", false, 39.5 * 3600, [4]).targets[4]).toBe(1800);
});

test.each([false, true])("otomatik azaltma anahtarı %s: aynı girdi seçilen politikaya uyar", autoReduce => {
  const days = source([9,8,8,null,null,null,null]);
  const result = resolveWeekPlan(days, DEFAULT_WORK_PLAN, today, false, 144000, [], autoReduce);
  expect(result.targets.slice(3,5)).toEqual([28800,autoReduce ? 25200 : 28800]);
  expect(result.unallocatedSeconds).toBe(autoReduce ? 0 : -3600);
  expect(result.projectedWeeklySeconds + result.unallocatedSeconds).toBe(144000);
  const partial = resolveWeekPlan(days, DEFAULT_WORK_PLAN, today, true, 144000, [], autoReduce);
  expect(partial.targets[4]).toBe(28800);
  expect(partial.exitGoal).toBeNull();
});

test("Sıfırla fazla süreyi ayrı tutar; kilitli gerçekleşenler ve saklanan günlük plan korunur", () => {
  const days = source([9,8,8,null,null,null,null]);
  const before = resolveWeekPlan(days, DEFAULT_WORK_PLAN, today);
  const edited = changeWeekPlan(emptyWorkPlans(), week, [480,480,480,450,450,0,0], before.completed);
  const reset = changeWeekPlan(edited, week, null, before.completed);
  const result = resolveWeekPlan(days, resolveStoredPlan(reset, week), today, false, resolveStoredTarget(reset, week));
  expect(result.displaySeconds).toEqual([32400,28800,28800,28800,28800,0,0]);
  expect(result.unallocatedSeconds).toBe(-3600);
  expect(resolveStoredPlan(reset, week)).toEqual(DEFAULT_WORK_PLAN);
  expect(resolveStoredTarget(reset, week)).toBe(144000);
});
