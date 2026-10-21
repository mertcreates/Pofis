import { expect, test } from "bun:test";
import { mealSamples } from "./history-sample";
import { mealScenarios } from "./commentary/catalogue";
import { matchingScenarios } from "./commentary/matching";
import { presentMeal, type MealPresentation } from "./presentation";

function sample(date: string) {
  const menu = mealSamples.find((entry) => entry.date.startsWith(date));
  if (!menu) throw new Error(`Missing recorded meal sample: ${date}`);
  return presentMeal(menu);
}

function candidates(meal: MealPresentation) {
  return matchingScenarios(meal, mealScenarios).map((s) => s.id);
}

test("20 October: shared rice, lahmacun/lemon and artichoke/cacik are independent opportunities", () => {
  const ids = candidates(sample("2026-10-20"));
  expect(ids).toContain("beans-rice");
  expect(ids).toContain("lahmacun-lemon");
  expect(ids).toContain("artichoke-cacik");
  expect(ids).not.toContain("bafra-adana");
  expect(ids).not.toContain("beans-fresh-beans");
});

test("17 October: no vegetarian or multiple-choice story is invented", () => {
  const ids = candidates(sample("2026-10-17"));
  expect(ids).toContain("kofte");
  expect(ids).toContain("single-main");
  expect(ids).not.toContain("consider-choices");
  expect(ids).not.toContain("shared-side");
});

test("observed Hasanpas spelling and sucuklu pide each match their own dish notes", () => {
  const meal: MealPresentation = {
    kind: "structured", mains: ["Hasanpaş kÖFTE", "Sucuklu Pide"],
    mainCalorie: null, vegetarian: null, sides: [], sharedCalorie: null,
  };
  expect(candidates(meal)).toContain("kofte");
  expect(candidates(meal)).toContain("pide");
});

test("rice counts as an accompaniment; vegetarian beans remain a main alternative", () => {
  const meal: MealPresentation = {
    kind: "structured",
    mains: ["Bilinmeyen ana yemek"],
    mainCalorie: null,
    vegetarian: { name: "Kuru Fasulye", calorie: null },
    sides: [{ kind: "accompaniment", label: "Yanına", name: "Pirinç Pilavı", items: ["Pirinç Pilavı"], calorie: null }],
    sharedCalorie: null,
  };
  const before = structuredClone(meal);
  expect(candidates(meal)).toContain("beans-rice");
  expect(candidates(meal)).toContain("consider-choices");
  expect(meal).toEqual(before);
});

test("unrecognized layouts only allow menu-level scenes, even when names are familiar", () => {
  const menu = mealSamples.find((entry) => entry.date.startsWith("2026-10-20"));
  if (!menu) throw new Error("Missing recorded meal sample: 2026-10-20");
  const unknownLayout = { ...menu, dishes: [...menu.dishes].reverse() };
  const matches = matchingScenarios(presentMeal(unknownLayout), mealScenarios);
  expect(matches.length).toBeGreaterThan(0);
  expect(matches.every((s) => s.kind === "scene" && ["menu", "source"].includes(s.when))).toBe(true);
});

test("exact aliases handle Turkish case and abbreviation spacing without substring guesses", () => {
  const meal = sample("2026-10-20");
  if (meal.kind !== "structured") throw new Error("Expected structured sample");
  const rice = meal.sides.find((s) => s.kind === "accompaniment")!;
  rice.items = ["  ŞHR. PİRİNÇ   PİLAVI  "];
  expect(candidates(meal)).toContain("beans-rice");
  rice.items = ["Pirinç pilavı görünümlü yeni yemek"];
  expect(candidates(meal)).not.toContain("beans-rice");
});

test("dish roles and distinct items protect special stories", () => {
  const meal = sample("2026-10-20");
  if (meal.kind !== "structured") throw new Error("Expected structured sample");
  meal.mains = ["Mantı"];
  expect(candidates(meal)).not.toContain("manti-extra");
  const side = meal.sides.find((s) => s.kind === "accompaniment")!;
  side.items = ["Bademli Pirinç Pilavı"];
  expect(matchingScenarios(meal, [{ id: "two-rices", kind: "pair", requires: [{ food: "rice" }, { food: "almondRice" }], variants: ["Bir.", "İki."] }])).toEqual([]);
});
