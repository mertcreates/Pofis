import { expect, test } from "bun:test";
import { readStoredPlans, serializePlans } from "@/lib/plan-storage.js";
import {
  changeDefaultPlan, changeWeekLockedDays, changeWeekPlan, completeWeekPlan, DEFAULT_WORK_PLAN,
  editRequiredMinutes, emptyWorkPlans, planProtectionMarkers, readDayPlan, resolveLeaveDays,
  resolveStoredPlan, resolveStoredTarget, resolveUserLockedDays, resolveWeekPlan, type PlanDay,
} from "./work-plan";
import { planDisplayMinutes } from "./plan-duration";

const week = "2026-10-12";
const today = "2026-10-15";
function source(offset: number): PlanDay[] {
  return Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`, state: day < 3 ? "recorded" : "awaiting-entry",
    recordedSeconds: day < 3 ? 28800 + (day === 2 ? offset : 0) : null,
  }));
}

test.each([
  { name: "eksik", offset: -17, plan: [480,480,480,360,480,0,0],
    expected: { equal: [25200,32417], last: [21600,36017] } },
  { name: "fazla", offset: 3617, plan: [480,480,480,480,480,0,0],
    expected: { equal: [26983,27000], last: [28800,25183] } },
])("$name saniyeli süre iki seçenekte dağıtılır", ({ offset, plan: values, expected }) => {
  const plan = readDayPlan(values)!;
  const resolved = resolveWeekPlan(source(offset), plan, today);
  for (const mode of ["equal", "last"] as const) {
    const next = completeWeekPlan(plan, DEFAULT_WORK_PLAN, resolved, mode)!;
    expect(next.slice(3, 5).map(minutes => Math.round(minutes * 60))).toEqual([...expected[mode]]);
  }
  expect(plan).toEqual(values);
});

test("iki dağıtım günlük kapasite sınırına farklı sırayla ulaşır", () => {
  const plan = readDayPlan([950,960,480,480,480,0,0])!;
  const reference = readDayPlan([960,960,510,510,510,0,0])!;
  const days = source(0).map(day => ({ ...day, state: "awaiting-entry" as const, recordedSeconds: null }));
  const resolved = resolveWeekPlan(days, plan, week);
  expect(completeWeekPlan(plan, reference, resolved, "equal"))
    .toEqual([960,960,510,510,510,0,0]);
  expect(completeWeekPlan(plan, reference, resolved, "last"))
    .toEqual([950,960,480,480,580,0,0]);
});

for (const mode of ["equal", "last"] as const) {
  for (const arrangement of ["normal", "leave", "manual-lock"] as const) {
    test(`${mode}/${arrangement}: saniyeli eksik ve fazla süre kaydetme sonrası hedefe tam ulaşır`, () => {
      for (const offset of [-59, -29, -1, 0, 1, 29, 59]) {
        const days = source(offset);
        const snapshot = JSON.stringify(days);
        const leaves = arrangement === "leave" ? [4] : [];
        const locks = arrangement === "manual-lock" ? [3] : [];
        const plan = leaves.length ? readDayPlan([480,480,480,480,0,0,0])! : DEFAULT_WORK_PLAN;
        const target = leaves.length ? 115200 : 144000;
        const markers = planProtectionMarkers(days, week, today);
        let initial = changeWeekPlan(emptyWorkPlans(), week, plan, markers, target, leaves);
        if (locks.length) initial = changeWeekLockedDays(initial, week, locks, plan);
        const before = resolveWeekPlan(days, plan, today, false, target, [], false, locks);
        const next = completeWeekPlan(plan, DEFAULT_WORK_PLAN, before, mode, leaves)!;
        expect(next).not.toBeNull();
        // Independent arithmetic: 24 hours + offset have elapsed; the rest must reach the reference.
        expect(86400 + offset + Math.round(next[3] * 60) + Math.round(next[4] * 60)).toBe(target);
        expect(next.slice(0, 3)).toEqual([480,480,480]);
        expect(next.slice(5)).toEqual([0,0]);
        if (leaves.length) expect(next[4]).toBe(0);
        if (locks.length) expect(next[3]).toBe(480);
        const stored = readStoredPlans(serializePlans(changeWeekPlan(initial, week, next, markers, target, leaves)));
        const savedPlan = resolveStoredPlan(stored, week);
        const after = resolveWeekPlan(days, savedPlan, today, false, resolveStoredTarget(stored, week), [], false, resolveUserLockedDays(stored, week));
        expect(after.projectedWeeklySeconds).toBe(target);
        expect(after.unallocatedSeconds).toBe(0);
        expect(after.completed.slice(0, 3)).toEqual([28800,28800,28800 + offset]);
        expect(resolveLeaveDays(stored, week)).toEqual(leaves);
        expect(resolveUserLockedDays(stored, week)).toEqual(locks);
        expect(completeWeekPlan(savedPlan, DEFAULT_WORK_PLAN, after, mode, leaves)).toEqual(savedPlan);
        const displayedRemaining = after.displaySeconds.slice(3, 5)
          .reduce((sum, seconds) => sum + planDisplayMinutes(seconds, "required") * 60, 0);
        expect(86400 + offset + displayedRemaining).toBeGreaterThanOrEqual(target);
        expect(86400 + offset + displayedRemaining - target).toBeLessThan(120);
        expect(JSON.stringify(days)).toBe(snapshot);
      }
    });
  }
}

test("saniyeli Tamamla sonucunu tam dakikaya düzenleme hedefi yalnız fark kadar değiştirir", () => {
  const days = source(17);
  const before = resolveWeekPlan(days, DEFAULT_WORK_PLAN, today);
  const plan = completeWeekPlan(DEFAULT_WORK_PLAN, DEFAULT_WORK_PLAN, before, "last")!;
  expect(Math.round(plan[4] * 60)).toBe(28783);
  const resolved = resolveWeekPlan(days, plan, today, false, 144000);
  const edit = editRequiredMinutes(plan, resolved, [{ day: 4, minutes: 480 }]);
  expect(edit.targetSeconds).toBe(144017);
  expect(resolveWeekPlan(days, edit.plan, today, false, edit.targetSeconds).projectedWeeklySeconds).toBe(144017);
});

test("varsayılanı 5x8'e sıfırlama gerçekleşenleri ve özel haftayı korur; miras alan hafta 40'a döner", () => {
  const template = readDayPlan([540,540,540,540,540,0,0])!;
  const days = source(31);
  const markers = planProtectionMarkers(days, week, today);
  const initial = changeDefaultPlan(emptyWorkPlans(), template);
  const inheritedReset = changeDefaultPlan(initial, DEFAULT_WORK_PLAN, week, markers);
  expect(inheritedReset.defaultPlan).toEqual(DEFAULT_WORK_PLAN);
  expect(resolveStoredPlan(inheritedReset, week)).toEqual([540,540,540,480,480,0,0]);
  expect(resolveStoredTarget(inheritedReset, week)).toBe(144000);
  const custom = changeWeekPlan(initial, week, readDayPlan([540,540,540,390,540,0,0])!, markers, 153000);
  const customReset = changeDefaultPlan(custom, DEFAULT_WORK_PLAN, week, markers);
  expect(resolveStoredPlan(customReset, week)).toEqual([540,540,540,390,540,0,0]);
  expect(resolveStoredTarget(customReset, week)).toBe(153000);
  expect(resolveWeekPlan(days, resolveStoredPlan(customReset, week), today, false, 153000).completed.slice(0, 3))
    .toEqual([28800,28800,28831]);
});
