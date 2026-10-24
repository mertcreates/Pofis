import { loadPlans, PLAN_STORAGE_KEY } from "@/lib/plan-storage.js";
import type { WorkPlans } from "@/domain/rules/work-plan";

export type PlanScope = "live" | "demo";
type PlanStorage = Pick<Storage, "getItem" | "setItem">;

export function subscribeWorkPlans(scope: PlanScope, receive: (plans: WorkPlans) => void, fail: (error: unknown) => void, {
  storage,
  events = window,
}: { storage?: PlanStorage; events?: Pick<Window, "addEventListener" | "removeEventListener"> } = {}) {
  const key = scope === "demo" ? `demo:${PLAN_STORAGE_KEY}` : PLAN_STORAGE_KEY;
  function read(event?: StorageEvent) {
    try {
      const current = storage ?? localStorage;
      if (event?.storageArea && event.storageArea !== current) return;
      receive(loadPlans(workPlanStorage(current, scope)));
    }
    catch (error) { fail(error); }
  }
  function sync(event: StorageEvent) {
    if (event.key === key || event.key === null) read(event);
  }
  events.addEventListener("storage", sync);
  read();
  return () => events.removeEventListener("storage", sync);
}

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
