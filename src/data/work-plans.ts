import { loadPlans } from "@/lib/plan-storage.js";
import type { WorkPlans } from "@/domain/rules/work-plan";

export type PlanScope = "live" | "demo";
type PlanStorage = Pick<Storage, "getItem" | "setItem">;

export function workPlanStorage(
  storage: PlanStorage,
  scope: PlanScope,
): PlanStorage {
  if (scope === "live") return storage;
  return {
    getItem: (key) => storage.getItem(`demo:${key}`),
    setItem: (key, value) => storage.setItem(`demo:${key}`, value),
  };
}

export function readWorkPlans(
  storage: Pick<Storage, "getItem">,
): WorkPlans {
  return loadPlans(storage);
}
