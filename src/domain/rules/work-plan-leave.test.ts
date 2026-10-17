import { expect, test } from "bun:test";
import {
  DEFAULT_WORK_PLAN, changeDefaultPlan, changeWeekPlan, completeWeekPlan, completedDaySeconds,
  editRequiredMinutes, emptyWorkPlans, readDayPlan, readLeaveDays, referenceWeekTarget,
  resolveLeaveDays, resolveStoredPlan, resolveStoredTarget, resolveWeekPlan, type WorkPlans,
} from "./work-plan";
import type { DayState } from "./record-status";

const week = "2026-10-12";
const today = "2026-10-15";
function source(seconds: readonly (number | null)[] = [32400,32400,31200,null,null,null,null]) {
  return seconds.map((recordedSeconds, day) => ({ date: `2026-10-${12 + day}`,
    state: (recordedSeconds === null ? "awaiting-entry" : "recorded") as DayState, recordedSeconds }));
}
function resolve(plans: WorkPlans, records = source()) {
  return resolveWeekPlan(records, resolveStoredPlan(plans, week), today, false, resolveStoredTarget(plans, week));
}
function edit(plans: WorkPlans, day: number, minutes: number, records = source()) {
  const resolved = resolve(plans, records);
  const changed = editRequiredMinutes(resolveStoredPlan(plans, week), resolved, [{ day, minutes }], plans.defaultPlan, resolveLeaveDays(plans, week));
  return changeWeekPlan(plans, week, changed.plan, resolved.completed, changed.targetSeconds, changed.leaveDays);
}

test("Cuma izni gereken 5:20 yerine şablondaki 8 saati düşürür; devir Perşembeye geçer", () => {
  const initial = emptyWorkPlans();
  expect(resolve(initial).displaySeconds[4]).toBe(19200);
  const changed = edit(initial, 4, 0);
  expect(resolveStoredTarget(changed, week)).toBe(115200);
  expect(resolveLeaveDays(changed, week)).toEqual([4]);
  expect(resolve(changed).displaySeconds).toEqual([32400,32400,31200,19200,0,0,0]);
  expect(resolve(changed).unallocatedSeconds).toBe(0);
  expect(changed.defaultPlan).toEqual(DEFAULT_WORK_PLAN);
  expect(edit(changed, 4, 0)).toEqual(changed);
  const reopened = edit(changed, 4, 480);
  expect(resolveStoredTarget(reopened, week)).toBe(144000);
  expect(resolveLeaveDays(reopened, week)).toEqual([]);
  expect(resolve(reopened).projectedWeeklySeconds).toBe(144000);
  expect(initial).toEqual(emptyWorkPlans());
});

test("9 saatlik şablonda izin 9 saat indirir; toplu izin ve kilit koruması aynı hesabı kullanır", () => {
  const initial = changeDefaultPlan(emptyWorkPlans(), readDayPlan([540,540,540,540,540,0,0])!, week,
    completedDaySeconds(source(), week, today));
  const first = edit(initial, 4, 0);
  expect(resolveStoredTarget(first, week)).toBe(129600);
  expect(resolve(first).displaySeconds.slice(3,5)).toEqual([33600,0]);
  const second = edit(first, 3, 0);
  expect(resolveStoredTarget(second, week)).toBe(97200);
  expect(resolveLeaveDays(second, week)).toEqual([3,4]);
  expect(resolve(second).unallocatedSeconds).toBe(1200);
  expect(() => edit(second, 0, 0)).toThrow("Tamamlanan");
  expect(() => changeWeekPlan(first, week, resolveStoredPlan(first, week), resolve(first).completed, 129600, [0,4]))
    .toThrow("Tamamlanan");
});

test("sıfır gereken süre izin değildir; günü açıkça izinli yapmak şablon karşılığını düşürür", () => {
  const records = source([57600,57600,28800,null,null,null,null]);
  const initial = emptyWorkPlans();
  expect(resolve(initial, records).displaySeconds.slice(3,5)).toEqual([0,0]);
  expect(resolveLeaveDays(initial, week)).toEqual([]);
  const changed = edit(initial, 4, 0, records);
  expect(resolveStoredTarget(changed, week)).toBe(115200);
  expect(resolveLeaveDays(changed, week)).toEqual([4]);
});

test("Tamamla izinleri korur ve 32 saate ulaşır", () => {
  let plans = edit(emptyWorkPlans(), 4, 0);
  plans = edit(plans, 3, 480);
  expect(resolveStoredTarget(plans, week)).toBe(124800);
  const resolved = resolve(plans);
  const next = completeWeekPlan(resolveStoredPlan(plans, week), plans.defaultPlan, resolved, 3, [4])!;
  expect(next[4]).toBe(0);
  expect(Math.round(next[3] * 60)).toBe(19200);
  const saved = changeWeekPlan(plans, week, next, resolved.completed, referenceWeekTarget(plans.defaultPlan, [4]), [4]);
  expect(resolve(saved).projectedWeeklySeconds).toBe(115200);
  expect(resolveLeaveDays(saved, week)).toEqual([4]);
  expect(resolve(saved).unallocatedSeconds).toBe(0);
});

test("Sıfırla tamamlanmamış izinleri kaldırır ve tam şablon toplamına döner", () => {
  const initial = edit(emptyWorkPlans(), 4, 0);
  const reset = changeWeekPlan(initial, week, null, resolve(initial).completed);
  expect(resolveLeaveDays(reset, week)).toEqual([]);
  expect(resolveStoredTarget(reset, week)).toBe(144000);
  expect(resolve(reset).displaySeconds.slice(3,5)).toEqual([28800,19200]);
  expect(changeWeekPlan(reset, week, null, resolve(reset).completed)).toEqual(reset);
});

test("izinli günün tutarlı kaydı kilitlendiğinde sıfırlama izni ve gerçekleşeni korur", () => {
  const initial = edit(emptyWorkPlans(), 3, 0);
  const completed = [32400,32400,31200,0,null,null,null];
  const reset = changeWeekPlan(initial, week, null, completed);
  expect(resolveLeaveDays(reset, week)).toEqual([3]);
  expect(resolveStoredPlan(reset, week)[3]).toBe(0);
  expect(resolveStoredTarget(reset, week)).toBe(115200);
});

test("şablon değişikliği izin karşılığını günceller; tamamlananlar korunur", () => {
  const initial = edit(emptyWorkPlans(), 4, 0);
  const changed = changeDefaultPlan(initial, readDayPlan([540,540,540,540,540,0,0])!, week, resolve(initial).completed);
  expect(resolveLeaveDays(changed, week)).toEqual([4]);
  expect(resolveStoredPlan(changed, week)).toEqual([480,480,480,540,0,0,0]);
  expect(resolveStoredTarget(changed, week)).toBe(129600);
  expect(resolve(changed).displaySeconds.slice(3,5)).toEqual([33600,0]);
  expect(resolveStoredTarget(edit(changed, 4, 540), week)).toBe(162000);
});

test("özel haftanın izin öncesi hedefi sabittir; yeni şablonun izin karşılığı düşülür", () => {
  const initial = edit(edit(emptyWorkPlans(), 4, 0), 3, 360);
  expect(resolveStoredTarget(initial, week)).toBe(117600);
  const changed = changeDefaultPlan(initial, readDayPlan([540,540,540,540,540,0,0])!, week, resolve(initial).completed);
  expect(resolveStoredTarget(changed, week)).toBe(114000);
  expect(resolveStoredPlan(changed, week)[3]).toBe(360);
  expect(resolve(changed).displaySeconds[3]).toBe(18000);
  expect(resolveStoredTarget(edit(changed, 4, 540), week)).toBe(146400);
});

test("izinler hedefi sıfırın altına indirmez; şablonda kapalı günün izin karşılığı sıfırdır", () => {
  const noRecords = source(Array(7).fill(null));
  const initial = changeWeekPlan(emptyWorkPlans(), week, DEFAULT_WORK_PLAN, [], 3600);
  const changed = edit(initial, 4, 0, noRecords);
  expect(resolveStoredTarget(changed, week)).toBe(0);
  const template = readDayPlan([480,480,480,480,0,0,0])!;
  expect(referenceWeekTarget(template, [4])).toBe(115200);
  expect(referenceWeekTarget(template, [0,1,2,3,4])).toBe(0);
});

test("izin listesi tekil hafta içi indekslerden oluşur", () => {
  expect(readLeaveDays([4,1])).toEqual([1,4]);
  for (const value of [null, {}, [0,0], [-1], [5], [6], [0.5], ["1"], [NaN], Array(1)])
    expect(readLeaveDays(value)).toBeNull();
});

test("dağıtılamayan borç elle azaltılan güne yeniden uygulanır; toplam ve bakiye korunur", () => {
  const records = source([7200,7200,7200,null,null,null,null]);
  const initial = emptyWorkPlans();
  expect(resolve(initial, records).unallocatedSeconds).toBe(7200);
  const changed = edit(initial, 3, 900, records);
  const result = resolve(changed, records);
  expect(result.weeklySeconds).toBe(140400);
  expect(result.displaySeconds.slice(3,5)).toEqual([57600,57600]);
  expect(result.unallocatedSeconds).toBe(3600);
  expect(result.projectedWeeklySeconds + result.unallocatedSeconds).toBe(140400);
});

test("dağıtılamayan fazla süre elle artırılan güne yeniden uygulanır", () => {
  const records = source([57600,57600,57600,null,null,null,null]);
  const changed = edit(emptyWorkPlans(), 3, 30, records);
  const result = resolve(changed, records);
  expect(result.weeklySeconds).toBe(145800);
  expect(result.displaySeconds.slice(3,5)).toEqual([0,0]);
  expect(result.unallocatedSeconds).toBe(-27000);
});

test("Tamamla diğer günlerin kapasitesi tükenince seçili güne de ekler", () => {
  const plan = readDayPlan([480,480,240,960,960,0,0])!;
  const template = readDayPlan([480,480,480,960,960,0,0])!;
  const resolved = resolveWeekPlan(source([28800,28800,null,null,null,null,null]), plan, "2026-10-14");
  expect(completeWeekPlan(plan, template, resolved, 2)).toEqual(template);
});

test("Tamamla azaltmada diğer günler sıfırlanınca seçili güne geçer; gerçek kapasite açığında sonuç üretmez", () => {
  const plan = readDayPlan([480,480,480,60,480,0,0])!;
  const records = source([28800,28800,28800,null,null,null,null]);
  const resolved = resolveWeekPlan(records, plan, today, false, 33 * 3600);
  const template = readDayPlan([360,360,360,360,360,0,0])!;
  const next = completeWeekPlan(plan, template, resolved, 4)!;
  expect(next.slice(3,5)).toEqual([0,360]);
  expect(resolveWeekPlan(records, next, today, false, 30 * 3600).projectedWeeklySeconds).toBe(30 * 3600);
  const impossible = completeWeekPlan(plan, readDayPlan([240,240,240,240,240,0,0])!, resolved, 4);
  expect(impossible).toBeNull();
  expect(plan).toEqual([480,480,480,60,480,0,0]);
  expect(completeWeekPlan(plan, readDayPlan([960,960,960,960,960,0,0])!, resolved, 4)).toBeNull();
});

test("sıfırda korunan özel hedef yeni izin karşılığında tekrar tekrar artmaz", () => {
  const initial: WorkPlans = { defaultPlan: DEFAULT_WORK_PLAN, weekOverrides: { [week]: [480,480,480,60,0,0,0] },
    weekLeaves: { [week]: [4] }, weekTargets: { [week]: 3600 } };
  expect(resolveStoredTarget(initial, week)).toBe(0);
  const nine = readDayPlan([540,540,540,540,540,0,0])!;
  const changed = changeDefaultPlan(initial, nine, week);
  expect(changed.weekTargets?.[week]).toBe(3600);
  expect(changeDefaultPlan(changed, nine, week)).toEqual(changed);
  const reopenedTemplate = changeDefaultPlan(changed, readDayPlan([540,540,540,540,0,0,0])!, week);
  expect(resolveStoredTarget(reopenedTemplate, week)).toBe(3600);
});

test("gerçek değişiklik içermeyen düzenleme planı korur; kilitli ve geçersiz girdi yine reddedilir", () => {
  const resolved = resolve(emptyWorkPlans());
  expect(editRequiredMinutes(DEFAULT_WORK_PLAN, resolved, [])).toEqual({ plan: DEFAULT_WORK_PLAN, targetSeconds: 144000, leaveDays: [] });
  expect(() => editRequiredMinutes(DEFAULT_WORK_PLAN, resolved, [{ day: 0, minutes: 480 }])).toThrow("Tamamlanan");
  expect(() => editRequiredMinutes(DEFAULT_WORK_PLAN, resolved, [{ day: 5, minutes: 0 }])).toThrow("Geçersiz");
});
