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
