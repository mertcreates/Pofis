import type { MealPresentation } from "../presentation";
import { identifyFood, type FoodId } from "./foods";
import type { FoodReference, MealRole, MealScenario, SceneCondition } from "./types";

type FoodItem = { role: MealRole; foods: ReadonlySet<FoodId> };

export function matchingScenarios(meal: MealPresentation, scenarios: readonly MealScenario[]): MealScenario[] {
  if (meal.kind === "source") {
    return meal.dishes.length === 0 ? [] : scenarios.filter((scenario) =>
      scenario.kind === "scene" && (scenario.when === "menu" || scenario.when === "source"));
  }
  const items: FoodItem[] = [
    ...meal.mains.map((name) => ({ role: "main" as const, foods: identifyFood(name) })),
    ...(meal.vegetarian ? [{ role: "vegetarian" as const, foods: identifyFood(meal.vegetarian.name) }] : []),
    ...meal.sides.flatMap((side) => side.items.map((name) => ({ role: side.kind, foods: identifyFood(name) }))),
  ];
  if (!items.length) return [];

  const conditions: Record<SceneCondition, boolean> = {
    menu: true,
    source: false,
    alternatives: meal.mains.length + Number(Boolean(meal.vegetarian)) > 1,
    "single-main": meal.mains.length === 1 && !meal.vegetarian,
    "shared-side": meal.mains.length + Number(Boolean(meal.vegetarian)) > 1 && meal.sides.some((s) => s.kind === "accompaniment"),
    soup: meal.sides.some((s) => s.kind === "soup"),
  };

  function matches(reference: FoodReference, item: FoodItem) {
    return (!reference.role || reference.role === item.role) && item.foods.has(reference.food);
  }

  // Each requirement needs its own item: one Bafra pide cannot also be a second pide.
  function hasDistinctItems(references: readonly FoodReference[], used: readonly number[] = []): boolean {
    const reference = references[used.length];
    if (!reference) return true;
    return items.some((item, index) => !used.includes(index) && matches(reference, item)
      && hasDistinctItems(references, [...used, index]));
  }

  return scenarios.filter((scenario) => scenario.kind === "scene"
    ? conditions[scenario.when]
    : hasDistinctItems(scenario.requires));
}
