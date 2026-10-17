import { readPlanInput, isPlanWeek } from "../domain/rules/work-plan";

export const PLAN_STORAGE_KEY = "pofis:work-plans:v1";

export function loadPlans(storage) {
  return readStoredPlans(storage.getItem(PLAN_STORAGE_KEY));
}

export function savePlans(storage, plans) {
  storage.setItem(PLAN_STORAGE_KEY, serializePlans(plans));
}

export function readStoredPlans(raw) {
  let stored;
  try {
    stored = JSON.parse(raw);
  } catch {
    // Malformed browser data does not replace the default plan.
    return {};
  }
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};

  const plans = {};
  for (const [week, value] of Object.entries(stored)) {
    if (!isPlanWeek(week) || !value || !Number.isFinite(value.hours)) continue;
    const plan = readPlanInput({
      weekdays: value.weekdays,
      hours: value.hours,
    });
    if (plan) plans[week] = plan;
  }
  return plans;
}

export function serializePlans(plans) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(plans).map(([week, plan]) => [
        week,
        {
          weekdays: plan.goals.weekdays,
          hours: plan.goals.hours,
        },
      ]),
    ),
  );
}
