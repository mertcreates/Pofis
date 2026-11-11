import { expect, test } from "bun:test";
import { changeDefaultPlan, changeIndependentWeek, changeWeekPlan, DEFAULT_WORK_PLAN, emptyWorkPlans, readIndependentWeek, readWorkPlans, type IndependentWeekPlan } from "./work-plan";
import { loadPlans, savePlans } from "@/lib/plan-storage.js";
import { workPlanStorage } from "@/data/work-plans";
import { resetScheduleDay } from "./week-schedule";

const draft: IndependentWeekPlan = {
  plan: DEFAULT_WORK_PLAN,
  drafts: { 0: { anchor: "exit", entry: "09:00", exit: "16:00" }, 1: { anchor: "entry", entry: "14:0" } },
  leaveChanges: { 4: true },
  completion: { plan: [420, 510, 510, 480, 0, 0, 0], targetSeconds: 115200, leaveDays: [4], zeroOpenDays: [] },
};

test("dağıtım sonrası izinli günü sıfırlamak diğer günleri korur ve geçerli bir taslak kaydeder", () => {
  const reset = resetScheduleDay(draft, 4, { plan: DEFAULT_WORK_PLAN, leaveDays: [], zeroOpenDays: [] }, DEFAULT_WORK_PLAN);
  const saved = changeIndependentWeek(emptyWorkPlans(), { ...reset, plan: draft.plan });
  expect(readWorkPlans(saved).independentWeek).toEqual({ ...draft, leaveChanges: {}, completion: {
    plan: [420, 510, 510, 480, 480, 0, 0], targetSeconds: 144000, leaveDays: [], zeroOpenDays: [],
  } });
});

test("yeni hafta taslağı saat çiftini, eksik saati, izni ve açık dağıtımı yeniden yükler; gerçek planı değiştirmez", () => {
  const original = emptyWorkPlans();
  const changed = changeIndependentWeek(original, draft);
  expect(changed.defaultPlan).toEqual(DEFAULT_WORK_PLAN);
  expect(changed.weekOverrides).toEqual({});
  expect(original.independentWeek).toBeUndefined();
  expect(readWorkPlans(JSON.parse(JSON.stringify(changed))).independentWeek).toEqual(draft);
  expect(changeDefaultPlan(changed, [540,540,540,540,540,0,0], "2026-11-09").independentWeek).toEqual(draft);
  expect(changeWeekPlan(changed, "2026-11-09", null, []).independentWeek).toEqual(draft);
});

test("demo ve canlı taslaklar ayrı saklanır; manuel sıfırlama yeniden yüklemede de korunur", () => {
  const values = new Map<string,string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  savePlans(workPlanStorage(storage, "demo"), changeIndependentWeek(emptyWorkPlans(), draft));
  expect(loadPlans(storage).independentWeek).toBeUndefined();
  expect(loadPlans(workPlanStorage(storage, "demo")).independentWeek).toEqual(draft);
  const reset: IndependentWeekPlan = { plan: DEFAULT_WORK_PLAN, drafts: {}, leaveChanges: {}, completion: null };
  savePlans(workPlanStorage(storage, "demo"), changeIndependentWeek(emptyWorkPlans(), reset));
  expect(loadPlans(workPlanStorage(storage, "demo")).independentWeek).toEqual(reset);
});

test("geçersiz taslak sınırda reddedilir; eski plan biçimi okunmaya devam eder", () => {
  expect(readWorkPlans(emptyWorkPlans())).toEqual(emptyWorkPlans());
  for (const input of [null, { ...draft, drafts: { 5: { anchor: "entry", entry: "09:00" } } },
    { ...draft, drafts: { 0: { anchor: "entry", entry: "24:00" } } },
    { ...draft, leaveChanges: { 0: "true" } }, { ...draft, plan: [1000,480,480,480,480,0,0] },
    { ...draft, completion: { ...draft.completion, zeroOpenDays: [4] } }]) {
    expect(readIndependentWeek(input)).toBeNull();
    expect(() => readWorkPlans({ ...emptyWorkPlans(), independentWeek: input })).toThrow();
  }
});
