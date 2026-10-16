import { loadPlans, PLAN_STORAGE_KEY } from "@/lib/plan-storage.js";
import { readPlanInput, isPlanWeek } from "@/domain/rules/work-plan";
import type { WorkPlan } from "@/domain/rules/work-plan";

export type PlanScope = "live" | "demo";
type PlanStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function workPlanStorage(
  storage: PlanStorage,
  scope: PlanScope,
): PlanStorage {
  if (scope === "live") return storage;
  return {
    getItem: (key) => storage.getItem(`demo:${key}`),
    setItem: (key, value) => storage.setItem(`demo:${key}`, value),
    removeItem: (key) => storage.removeItem(`demo:${key}`),
  };
}

export function readWorkPlans(
  storage: Pick<Storage, "getItem">,
  currentWeek: string,
): Record<string, WorkPlan> {
  const archive = loadPlans(storage);
  if (
    storage.getItem(PLAN_STORAGE_KEY) !== null ||
    storage.getItem("pdks.mesai-plans.v1") !== null
  )
    return archive;
  const raw = storage.getItem("pofis:preferences:v1");
  if (!raw) return archive;
  const old = JSON.parse(raw);
  const plans: Record<string, WorkPlan> = {};
  for (const [week, value] of Object.entries({
    [currentWeek]: old.defaultPlan,
    ...old.overrides,
  })) {
    if (
      !isPlanWeek(week) ||
      !Array.isArray(value) ||
      value.length !== 7 ||
      !value.every(
        (minutes) =>
          typeof minutes === "number" &&
          Number.isFinite(minutes) &&
          minutes >= 0,
      )
    )
      continue;
    const weekdays = value.flatMap((minutes, index) =>
      minutes > 0 ? [index] : [],
    );
    const plan = readPlanInput({
      weekdays,
      hours: value.reduce((sum, minutes) => sum + minutes, 0) / 60,
    });
    if (plan) plans[week] = plan;
  }
  return plans;
}
