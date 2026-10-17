import {
  readDayPlan, readWeekPlan, readLeaveDays, isPlanWeek, emptyWorkPlans, samePlan,
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
    throw new Error("Kayıtlı mesai planı geçersiz. Kayıt korunuyor.");
  /** @type {import('../domain/rules/work-plan').WorkPlans['weekOverrides']} */
  const weekOverrides = {};
  for (const [week, value] of Object.entries(stored.weekOverrides)) {
    const plan = readWeekPlan(value);
    if (!isPlanWeek(week) || !plan) throw new Error("Kayıtlı haftalık plan geçersiz. Kayıt korunuyor.");
    if (!samePlan(plan, defaultPlan)) weekOverrides[week] = plan;
  }
  if (stored.weekTargets !== undefined && (!stored.weekTargets || typeof stored.weekTargets !== "object" || Array.isArray(stored.weekTargets)))
    throw new Error("Kayıtlı haftalık hedef geçersiz. Kayıt korunuyor.");
  /** @type {Record<string, number>} */
  const weekTargets = {};
  for (const [week, seconds] of Object.entries(stored.weekTargets ?? {})) {
    if (!isPlanWeek(week) || !Number.isSafeInteger(seconds) || seconds < 0)
      throw new Error("Kayıtlı haftalık hedef geçersiz. Kayıt korunuyor.");
    weekTargets[week] = seconds;
  }
  if (stored.weekLeaves !== undefined && (!stored.weekLeaves || typeof stored.weekLeaves !== "object" || Array.isArray(stored.weekLeaves)))
    throw new Error("Kayıtlı izin günleri geçersiz. Kayıt korunuyor.");
  /** @type {NonNullable<import('../domain/rules/work-plan').WorkPlans['weekLeaves']>} */
  const weekLeaves = {};
  for (const [week, value] of Object.entries(stored.weekLeaves ?? {})) {
    const days = readLeaveDays(value);
    if (!isPlanWeek(week) || !days) throw new Error("Kayıtlı izin günleri geçersiz. Kayıt korunuyor.");
    if (days.length) weekLeaves[week] = days;
  }
  if (stored.weekZeroOpenDays !== undefined && (!stored.weekZeroOpenDays || typeof stored.weekZeroOpenDays !== "object" || Array.isArray(stored.weekZeroOpenDays)))
    throw new Error("Kayıtlı açık günler geçersiz. Kayıt korunuyor.");
  /** @type {NonNullable<import('../domain/rules/work-plan').WorkPlans['weekZeroOpenDays']>} */
  const weekZeroOpenDays = {};
  for (const [week, value] of Object.entries(stored.weekZeroOpenDays ?? {})) {
    const days = readLeaveDays(value);
    if (!isPlanWeek(week) || !days || days.some(day => weekLeaves[week]?.includes(day)))
      throw new Error("Kayıtlı açık günler geçersiz. Kayıt korunuyor.");
    const plan = weekOverrides[week] ?? defaultPlan;
    const zeroDays = days.filter(day => plan[day] === 0);
    if (zeroDays.length) weekZeroOpenDays[week] = zeroDays;
  }
  return { defaultPlan, weekOverrides, ...(Object.keys(weekTargets).length ? { weekTargets } : {}),
    ...(Object.keys(weekLeaves).length ? { weekLeaves } : {}),
    ...(Object.keys(weekZeroOpenDays).length ? { weekZeroOpenDays } : {}) };
}

/** @param {import('../domain/rules/work-plan').WorkPlans} plans */
export function serializePlans(plans) {
  return JSON.stringify(readStoredPlans(JSON.stringify(plans)));
}
