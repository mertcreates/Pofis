import { expect, test } from "bun:test";
import { readMealApiResponse, MealResponseError } from "./response";

const date = "2026-10-20";
const menu = { date: `${date}T00:00:00`, city: "ISTANBUL", dishes: [{ name: "Yeni yemek", calorie: null }] };

test("API response keeps selected menu and server commentary together", () => {
  expect(readMealApiResponse({ menu, commentary: "Peçeteyi katladım." }, date)).toEqual({ menu, commentary: "Peçeteyi katladım." });
  expect(readMealApiResponse({ menu: null, commentary: null }, date)).toEqual({ menu: null, commentary: null });
});

test("invalid commentary, wrong dates and notes without a menu cannot become loaded state", () => {
  for (const invalid of [
    { menu }, { menu, commentary: " " }, { menu, commentary: 5 },
    { menu, commentary: "x".repeat(161) },
    { menu: null, commentary: "Yemek varmış." },
    { menu: { ...menu, dishes: [] }, commentary: "Yemek varmış." },
    { menu: { ...menu, date: "2026-10-19T00:00:00" }, commentary: "Peçeteyi katladım." },
  ]) expect(() => readMealApiResponse(invalid, date)).toThrow(MealResponseError);
});
