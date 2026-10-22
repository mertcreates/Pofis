import { ui } from "../ui-text.js";
import type { MealMenu } from "./presentation";

export class MealResponseError extends Error {}

export function readMealMenu(value: unknown, requestedDate: string): MealMenu | null {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MealResponseError(ui.mealErrors.invalidMenu);
  }
  const menu = value as Record<string, unknown>;
  if (typeof menu.date !== "string" || !menu.date.startsWith(`${requestedDate}T`)
    || typeof menu.city !== "string" || menu.city.trim().toUpperCase() !== "ISTANBUL"
    || !Array.isArray(menu.dishes)) throw new MealResponseError(ui.mealErrors.invalidMenu);

  const dishes = menu.dishes.map((value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new MealResponseError(ui.mealErrors.invalidDish);
    }
    const dish = value as Record<string, unknown>;
    if (typeof dish.name !== "string" || !dish.name.trim()
      || (dish.calorie !== null && (typeof dish.calorie !== "number"
        || !Number.isFinite(dish.calorie) || dish.calorie < 0))) {
      throw new MealResponseError(ui.mealErrors.invalidDish);
    }
    return { name: dish.name, calorie: dish.calorie as number | null };
  });
  return { date: menu.date, city: menu.city, dishes };
}

export interface MealMenuResponse {
  menu: MealMenu | null;
  commentary: string | null;
}

export function readMealApiResponse(value: unknown, requestedDate: string): MealMenuResponse {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("menu" in value)) {
    throw new MealResponseError(ui.mealErrors.invalidResponse);
  }
  const menu = readMealMenu(value.menu, requestedDate);
  const commentary = "commentary" in value ? value.commentary : undefined;
  if (commentary !== null && (typeof commentary !== "string" || !commentary.trim() || commentary.length > 160)) {
    throw new MealResponseError(ui.mealErrors.invalidCommentary);
  }
  if ((!menu || menu.dishes.length === 0) && commentary !== null) {
    throw new MealResponseError(ui.mealErrors.commentaryWithoutMenu);
  }
  return { menu, commentary };
}
