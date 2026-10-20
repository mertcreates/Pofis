import type { MealPresentation } from "./presentation";

export function getMealPofiCommentary(meal: MealPresentation): string {
  if (meal.kind === "source") {
    const firstDish = meal.dishes[0]?.name;
    return firstDish ? `${firstDish} ile başladım.` : "Menüyü bir kez daha okudum.";
  }

  const [firstMain, secondMain] = meal.mains;
  if (!firstMain) return "Menüye bir kez daha baktım.";
  if (secondMain) return `${firstMain} ile ${secondMain} arasında kaldım.`;
  if (meal.vegetarian) return `Ben ${firstMain} ve ${meal.vegetarian.name} arasında kaldım.`;
  return `${firstMain} adı gözüme takıldı.`;
}
