import { loadPlans, savePlans, PLAN_STORAGE_KEY } from "@/lib/plan-storage.js";
import type { WorkPlans } from "@/domain/rules/work-plan";
import type { ScenarioSeed } from "@/desktop/scenario-contract";

export type PlanScope = "live" | "demo";
type PlanStorage = Pick<Storage, "getItem" | "setItem">;

export function initializeScenarioPlans(storage: PlanStorage, seed: ScenarioSeed) {
  const key = "pofis:scenario:revision";
  if (storage.getItem(key) === seed.revision) return;
  savePlans(storage, seed.plans);
  storage.setItem(key, seed.revision);
}

export function subscribeWorkPlans(scope: PlanScope, receive: (plans: WorkPlans) => void, fail: (error: unknown) => void, {
  storage,
  events = window,
}: { storage?: PlanStorage; events?: Pick<Window, "addEventListener" | "removeEventListener"> } = {}) {
  const key = scope === "demo" ? `demo:${PLAN_STORAGE_KEY}` : PLAN_STORAGE_KEY;
  function read(event?: StorageEvent) {
    try {
      const current = storage ?? localStorage;
      if (!storage && scope === "live" && window.pofisScenario)
        initializeScenarioPlans(current, window.pofisScenario.seed);
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
