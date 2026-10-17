import {
  readPlanInput, readDayPlan, readWeekPlan, isPlanWeek, emptyWorkPlans, samePlan,
} from "../domain/rules/work-plan";

export const PLAN_STORAGE_KEY = "pofis:work-plans:v2";
const PREVIOUS_STORAGE_KEY = "pofis:work-plans:v1";

/** @param {Pick<Storage, 'getItem'>} storage */
export function loadPlans(storage) {
  const current = storage.getItem(PLAN_STORAGE_KEY);
  if (current !== null) return readStoredPlans(current);
  const previous = storage.getItem(PREVIOUS_STORAGE_KEY);
  if (previous === null) return emptyWorkPlans();
  const stored = JSON.parse(previous);
  if (!stored || typeof stored !== "object" || Array.isArray(stored))
    throw new Error("Kayıtlı mesai planı okunamıyor. Eski kayıt korunuyor.");
  const plans = emptyWorkPlans();
  for (const [week, value] of Object.entries(stored)) {
    if (!isPlanWeek(week)) continue;
    const plan = value && typeof value === "object" ? readPlanInput(value) : null;
    if (!plan) throw new Error("Eski mesai planı yeni 0–16 saat ve yarım saat adımıyla uyumlu değil. Eski kayıt korunuyor.");
    if (!samePlan(plan, plans.defaultPlan)) plans.weekOverrides[week] = plan;
  }
  return plans;
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
  return { defaultPlan, weekOverrides, ...(Object.keys(weekTargets).length ? { weekTargets } : {}) };
}

/** @param {import('../domain/rules/work-plan').WorkPlans} plans */
export function serializePlans(plans) {
  return JSON.stringify(readStoredPlans(JSON.stringify(plans)));
}
