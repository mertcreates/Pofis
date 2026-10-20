import { expect, test } from "bun:test";
import { mealSamples } from "./history-sample";
import { getMealPofiCommentary } from "./commentary";
import { presentMeal } from "./presentation";

function sample(date: string) {
  const menu = mealSamples.find((entry) => entry.date.startsWith(date));
  if (!menu) throw new Error(`Missing recorded meal sample: ${date}`);
  return presentMeal(menu);
}

test("commentary for two main choices uses the selected menu names", () => {
  expect(getMealPofiCommentary(sample("2026-10-20")))
    .toBe("Patlıcan Musakka ile Lahmacun arasında kaldım.");
});

test("commentary for a single main uses that date's menu name", () => {
  expect(getMealPofiCommentary(sample("2026-10-17")))
    .toBe("Izgara Köfte adı gözüme takıldı.");
});

test("commentary for a vegetarian alternative includes both menu names", () => {
  expect(getMealPofiCommentary({
    kind: "structured",
    mains: ["Izgara Köfte"],
    mainCalorie: null,
    vegetarian: { name: "Kuru Fasulye", calorie: null },
    sides: [],
    sharedCalorie: null,
  })).toBe("Ben Izgara Köfte ve Kuru Fasulye arasında kaldım.");
});

test("unrecognized source menus receive a safe menu-level comment", () => {
  const menu = mealSamples.find((entry) => entry.date.startsWith("2026-10-20"));
  if (!menu) throw new Error("Missing recorded meal sample: 2026-10-20");
  const unknownLayout = { ...menu, dishes: [...menu.dishes].reverse() };
  expect(getMealPofiCommentary(presentMeal(unknownLayout)))
    .toBe("Göbek - Havuç Salata - Limon ile başladım.");
});
