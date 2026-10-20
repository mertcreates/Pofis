import type { MealMenu } from "./presentation";

export class MealResponseError extends Error {}

export function readMealMenu(value: unknown, requestedDate: string): MealMenu | null {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MealResponseError("Invalid meal menu");
  }
  const menu = value as Record<string, unknown>;
  if (typeof menu.date !== "string" || !menu.date.startsWith(`${requestedDate}T`)
    || typeof menu.city !== "string" || menu.city.trim().toUpperCase() !== "ISTANBUL"
    || !Array.isArray(menu.dishes)) throw new MealResponseError("Invalid meal menu");

  const dishes = menu.dishes.map((value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new MealResponseError("Invalid meal dish");
    }
    const dish = value as Record<string, unknown>;
    if (typeof dish.name !== "string" || !dish.name.trim()
      || (dish.calorie !== null && (typeof dish.calorie !== "number"
        || !Number.isFinite(dish.calorie) || dish.calorie < 0))) {
      throw new MealResponseError("Invalid meal dish");
    }
    return { name: dish.name, calorie: dish.calorie as number | null };
  });
  return { date: menu.date, city: menu.city, dishes };
}

export function readMealApiResponse(value: unknown, requestedDate: string): MealMenu | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("menu" in value)) {
    throw new MealResponseError("Invalid meal API response");
  }
  return readMealMenu(value.menu, requestedDate);
}
