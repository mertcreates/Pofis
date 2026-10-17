import { expect, test } from "bun:test";
import {
  DEFAULT_WORK_PLAN, changeDefaultPlan, changeWeekPlan, completeWeekPlan, editRequiredMinutes,
  emptyWorkPlans, readDayPlan, resolveStoredPlan, resolveStoredTarget, resolveWeekPlan, resolveLeaveDays,
  type WorkPlans, type PlanDay,
} from "./work-plan";
import { readStoredPlans, serializePlans } from "@/lib/plan-storage.js";

const week = "2026-10-12";
function source(hours: readonly (number | null)[]): PlanDay[] {
  return hours.map((hours, day) => ({ date: `2026-10-${12 + day}`,
    state: hours === null ? "awaiting-entry" : "recorded", recordedSeconds: hours === null ? null : hours * 3600 }));
}
function resolve(plans: WorkPlans, days: PlanDay[], today = "2026-10-15") {
  return resolveWeekPlan(days, resolveStoredPlan(plans, week), today, false,
    resolveStoredTarget(plans, week), plans.weekZeroOpenDays?.[week]);
}

test("otomatik sıfırlanan Cuma kaydetme ve yeniden yüklemeden sonra borç alır", () => {
  const initial = emptyWorkPlans();
  const days = source([12,12,8,null,null,null,null]);
  const before = resolve(initial, days);
  expect(before.displaySeconds.slice(3,5)).toEqual([28800,0]);
  const edit = editRequiredMinutes(DEFAULT_WORK_PLAN, before, [{ day: 3, minutes: 450 }]);
  const saved = readStoredPlans(serializePlans(changeWeekPlan(initial, week, edit.plan,
    before.completed, edit.targetSeconds, edit.leaveDays)));
  expect(resolve(saved, days).eligible[4]).toBe(true);
  const friday = resolve(saved, source([12,12,8,7,null,null,null]), "2026-10-16");
  expect(friday.displaySeconds[4]).toBe(1800);
  expect(friday.unallocatedSeconds).toBe(0);
  expect(friday.projectedWeeklySeconds).toBe(39.5 * 3600);
  expect(saved.weekLeaves).toBeUndefined();
});

test("Tamamla ile sıfıra indirilen gün açık kalır ve sonraki gün yeniden denge alır", () => {
  const initial = changeWeekPlan(emptyWorkPlans(), week, DEFAULT_WORK_PLAN, [], 45 * 3600);
  const days = source([12,12,10,null,null,null,null]);
  const before = resolve(initial, days);
  const completed = completeWeekPlan(DEFAULT_WORK_PLAN, DEFAULT_WORK_PLAN, before, 4)!;
  const saved = readStoredPlans(serializePlans(changeWeekPlan(initial, week, completed, before.completed, 144000)));
  expect(resolve(saved, days).displaySeconds.slice(3,5)).toEqual([21600,0]);
  expect(resolve(saved, days).eligible[4]).toBe(true);
  const friday = resolve(saved, source([12,12,10,5,null,null,null]), "2026-10-16");
  expect(friday.displaySeconds[4]).toBe(3600);
  expect(friday.unallocatedSeconds).toBe(0);
});

test.each([3,4])("iki gün de otomatik sıfırken %s gününe eklenen süre doğru günde kalır", day => {
  const initial = emptyWorkPlans();
  const days = source([16,16,8,null,null,null,null]);
  const before = resolve(initial, days);
  expect(before.displaySeconds.slice(3,5)).toEqual([0,0]);
  const edit = editRequiredMinutes(DEFAULT_WORK_PLAN, before, [{ day, minutes: 30 }]);
  const saved = changeWeekPlan(initial, week, edit.plan, before.completed, edit.targetSeconds, edit.leaveDays);
  const after = resolve(saved, days);
  expect(after.displaySeconds[day]).toBe(1800);
  expect(after.displaySeconds[day === 3 ? 4 : 3]).toBe(0);
  expect(after.eligible.slice(3,5)).toEqual([true,true]);
  expect(after.unallocatedSeconds).toBe(0);
});

test.each([null,0,3,4])("fazla süre seçili gün %s iken de Cuma'dan azaltılır", selected => {
  const days = source([8,8,8,null,null,null,null]);
  const before = resolveWeekPlan(days, DEFAULT_WORK_PLAN, "2026-10-15", false, 41 * 3600);
  expect(completeWeekPlan(DEFAULT_WORK_PLAN, DEFAULT_WORK_PLAN, before, selected))
    .toEqual(DEFAULT_WORK_PLAN);
});

test("sıfır açık günü izinli yapmak, yeniden açmak ve sıfırlamak niyeti korur", () => {
  const days = source([12,12,8,null,null,null,null]);
  const initial = emptyWorkPlans();
  const before = resolve(initial, days);
  const edit = editRequiredMinutes(DEFAULT_WORK_PLAN, before, [{ day: 3, minutes: 450 }]);
  const saved = changeWeekPlan(initial, week, edit.plan, before.completed, edit.targetSeconds);
  const close = editRequiredMinutes(edit.plan, resolve(saved, days), [{ day: 4, minutes: 0 }]);
  const leave = changeWeekPlan(saved, week, close.plan, before.completed, close.targetSeconds, close.leaveDays);
  expect(leave.weekZeroOpenDays).toBeUndefined();
  expect(resolveLeaveDays(leave, week)).toEqual([4]);
  expect(resolveStoredTarget(leave, week)).toBe(31.5 * 3600);
  expect(resolve(leave, days).eligible[4]).toBe(false);
  const again = editRequiredMinutes(close.plan, resolve(leave, days), [{ day: 4, minutes: 0 }], DEFAULT_WORK_PLAN, [4]);
  expect(changeWeekPlan(leave, week, again.plan, before.completed, again.targetSeconds, again.leaveDays)).toEqual(leave);
  const reopen = editRequiredMinutes(close.plan, resolve(leave, days), [{ day: 4, minutes: 480 }], DEFAULT_WORK_PLAN, [4]);
  const open = changeWeekPlan(leave, week, reopen.plan, before.completed, reopen.targetSeconds, reopen.leaveDays);
  expect(resolveLeaveDays(open, week)).toEqual([]);
  expect(resolveStoredTarget(open, week)).toBe(39.5 * 3600);
  expect(resolve(open, days).eligible[4]).toBe(true);
  const reset = changeWeekPlan(saved, week, null, before.completed);
  expect(reset.weekZeroOpenDays).toBeUndefined();
  expect(resolveStoredPlan(reset, week)).toEqual(DEFAULT_WORK_PLAN);
  expect(resolveStoredTarget(reset, week)).toBe(144000);
  expect(changeWeekPlan(reset, week, null, before.completed)).toEqual(reset);
});

test("şablondan kapalı gün haftada açılıp otomatik sıfırlanınca şablon değişiminde açık kalır", () => {
  const template = readDayPlan([480,480,480,480,0,0,0])!;
  const days = source([12,12,8,null,null,null,null]);
  const initial = changeDefaultPlan(emptyWorkPlans(), template);
  const opened = changeWeekPlan(initial, week, DEFAULT_WORK_PLAN, [], 40 * 3600);
  const before = resolve(opened, days);
  const edit = editRequiredMinutes(DEFAULT_WORK_PLAN, before, [{ day: 3, minutes: 450 }], template);
  const saved = changeWeekPlan(opened, week, edit.plan, before.completed, edit.targetSeconds);
  expect(saved.weekZeroOpenDays?.[week]).toEqual([4]);
  const changed = changeDefaultPlan(saved, readDayPlan([540,540,540,540,0,0,0])!, week, before.completed);
  expect(changed.weekZeroOpenDays?.[week]).toEqual([4]);
  expect(resolveStoredTarget(changed, week)).toBe(39.5 * 3600);
  const friday = resolve(changed, source([12,12,8,7,null,null,null]), "2026-10-16");
  expect(friday.displaySeconds[4]).toBe(1800);
  expect(friday.exitGoal).toBe(1800);
  const reset = changeWeekPlan(changed, week, null, before.completed);
  expect(reset.weekZeroOpenDays).toBeUndefined();
  expect(resolve(reset, days).eligible[4]).toBe(false);
});

test("kilitlenen sıfır açık günün işareti sıfırlama ve şablon değişiminde korunur", () => {
  const initial: WorkPlans = { defaultPlan: DEFAULT_WORK_PLAN,
    weekOverrides: { [week]: [480,480,480,0,0,0,0] }, weekZeroOpenDays: { [week]: [3,4] }, weekTargets: { [week]: 144000 } };
  const completed = [57600,57600,28800,0,null,null,null];
  const reset = changeWeekPlan(initial, week, null, completed);
  expect(reset.weekZeroOpenDays?.[week]).toEqual([3]);
  expect(resolveStoredPlan(reset, week)[3]).toBe(0);
  const changed = changeDefaultPlan(reset, readDayPlan([540,540,540,540,540,0,0])!, week, completed);
  expect(changed.weekZeroOpenDays?.[week]).toEqual([3]);
  expect(resolveStoredPlan(changed, week)).toEqual([480,480,480,0,540,0,0]);
  expect(resolveStoredTarget(changed, week)).toBe(162000);
});

test("sıfır açık gün belirsizlik, geçmiş tarih ve kısmi rapor sınırlarını izler", () => {
  const plan = readDayPlan([480,480,480,450,0,0,0])!;
  const days = source([12,12,8,7,null,null,null]);
  const today = "2026-10-16";
  const target = 39.5 * 3600;
  expect(resolveWeekPlan(days, plan, today, false, target, [4]).exitGoal).toBe(1800);
  days[4].state = "uncertain";
  expect(resolveWeekPlan(days, plan, today, false, target, [4]).exitGoal).toBeNull();
  expect(resolveWeekPlan(days, plan, today, false, target, [4]).unallocatedSeconds).toBe(1800);
  days[4].state = "awaiting-entry";
  expect(resolveWeekPlan(days, plan, today, true, target, [4]).exitGoal).toBeNull();
  expect(resolveWeekPlan(days, plan, "2026-10-17", false, target, [4]).eligible[4]).toBe(false);
  expect(resolveWeekPlan(days, plan, today, false, 80 * 3600, [4]).displaySeconds[4]).toBe(16 * 3600);
});
