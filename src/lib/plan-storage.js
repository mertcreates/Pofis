import { ui } from "./ui-text.js";
import {
  readDayPlan, readWeekPlan, readLeaveDays, readWeekTimes, isPlanWeek, emptyWorkPlans, samePlan,
} from "../domain/rules/work-plan";

export const PLAN_STORAGE_KEY = "pofis:work-plans:v1";

/** @param {Pick<Storage, 'getItem'>} storage */
export function loadPlans(storage) {
  const stored = storage.getItem(PLAN_STORAGE_KEY);
  return stored === null ? emptyWorkPlans() : readStoredPlans(stored);
}

/** @param {Pick<Storage, 'setItem'>} storage
 * @param {import('../domain/rules/work-plan').WorkPlans} plans */
export function savePlans(storage, plans) {
  storage.setItem(PLAN_STORAGE_KEY, serializePlans(plans));
}

/** @param {string} raw
 * @returns {import('../domain/rules/work-plan').WorkPlans} */
export function readStoredPlans(raw) {
  const stored = JSON.parse(raw);
  const defaultPlan = readDayPlan(stored?.defaultPlan);
  if (!defaultPlan || !stored.weekOverrides || typeof stored.weekOverrides !== "object" || Array.isArray(stored.weekOverrides))
    throw new Error(ui.planStorageErrors.plan);
  /** @type {import('../domain/rules/work-plan').WorkPlans['weekOverrides']} */
  const weekOverrides = {};
  for (const [week, value] of Object.entries(stored.weekOverrides)) {
    const plan = readWeekPlan(value);
    if (!isPlanWeek(week) || !plan) throw new Error(ui.planStorageErrors.week);
    if (!samePlan(plan, defaultPlan)) weekOverrides[week] = plan;
  }
  if (stored.weekTargets !== undefined && (!stored.weekTargets || typeof stored.weekTargets !== "object" || Array.isArray(stored.weekTargets)))
    throw new Error(ui.planStorageErrors.target);
  /** @type {Record<string, number>} */
  const weekTargets = {};
  for (const [week, seconds] of Object.entries(stored.weekTargets ?? {})) {
    if (!isPlanWeek(week) || !Number.isSafeInteger(seconds) || seconds < 0)
      throw new Error(ui.planStorageErrors.target);
    weekTargets[week] = seconds;
  }
  if (stored.weekLeaves !== undefined && (!stored.weekLeaves || typeof stored.weekLeaves !== "object" || Array.isArray(stored.weekLeaves)))
    throw new Error(ui.planStorageErrors.leave);
  /** @type {NonNullable<import('../domain/rules/work-plan').WorkPlans['weekLeaves']>} */
  const weekLeaves = {};
  for (const [week, value] of Object.entries(stored.weekLeaves ?? {})) {
    const days = readLeaveDays(value);
    if (!isPlanWeek(week) || !days) throw new Error(ui.planStorageErrors.leave);
    if (days.length) weekLeaves[week] = days;
  }
  if (stored.weekZeroOpenDays !== undefined && (!stored.weekZeroOpenDays || typeof stored.weekZeroOpenDays !== "object" || Array.isArray(stored.weekZeroOpenDays)))
    throw new Error(ui.planStorageErrors.openDays);
  /** @type {NonNullable<import('../domain/rules/work-plan').WorkPlans['weekZeroOpenDays']>} */
  const weekZeroOpenDays = {};
  for (const [week, value] of Object.entries(stored.weekZeroOpenDays ?? {})) {
    const days = readLeaveDays(value);
    if (!isPlanWeek(week) || !days || days.some(day => weekLeaves[week]?.includes(day)))
      throw new Error(ui.planStorageErrors.openDays);
    const plan = weekOverrides[week] ?? defaultPlan;
    const zeroDays = days.filter(day => plan[day] === 0);
    if (zeroDays.length) weekZeroOpenDays[week] = zeroDays;
  }
  if (stored.weekLockedDays !== undefined && (!stored.weekLockedDays || typeof stored.weekLockedDays !== "object" || Array.isArray(stored.weekLockedDays)))
    throw new Error(ui.planStorageErrors.lockedDays);
  const weekLockedDays = {};
  for (const [week, value] of Object.entries(stored.weekLockedDays ?? {})) {
    const days = readLeaveDays(value);
    const lockedPlan = readWeekPlan(stored.weekOverrides[week]);
    if (!isPlanWeek(week) || !days || !lockedPlan || days.some(day => weekLeaves[week]?.includes(day)))
      throw new Error(ui.planStorageErrors.lockedDays);
    if (days.length) {
      weekLockedDays[week] = days;
      weekOverrides[week] = lockedPlan;
    }
  }
  if (stored.weekTimes !== undefined && (!stored.weekTimes || typeof stored.weekTimes !== "object" || Array.isArray(stored.weekTimes)))
    throw new Error(ui.planStorageErrors.times);
  const weekTimes = {};
  for (const [week, value] of Object.entries(stored.weekTimes ?? {})) {
    const times = readWeekTimes(value);
    if (!isPlanWeek(week) || !times) throw new Error(ui.planStorageErrors.times);
    if (Object.keys(times).length) weekTimes[week] = times;
  }
  return { defaultPlan, weekOverrides, ...(Object.keys(weekTargets).length ? { weekTargets } : {}),
    ...(Object.keys(weekLeaves).length ? { weekLeaves } : {}),
    ...(Object.keys(weekZeroOpenDays).length ? { weekZeroOpenDays } : {}),
    ...(Object.keys(weekLockedDays).length ? { weekLockedDays } : {}),
    ...(Object.keys(weekTimes).length ? { weekTimes } : {}) };
}

/** @param {import('../domain/rules/work-plan').WorkPlans} plans */
export function serializePlans(plans) {
  return JSON.stringify(readStoredPlans(JSON.stringify(plans)));
}
