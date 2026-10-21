import { expect, test } from "bun:test";
import history from "../../../data/meals/history.json";
import { mealScenarios } from "./commentary/catalogue";
import { matchingScenarios } from "./commentary/matching";
import { getMealPofiCommentary } from "./commentary";
import { presentMeal } from "./presentation";

test("catalogue has unique complete short notes and two or three variants per scenario", () => {
  expect(new Set(mealScenarios.map((s) => s.id)).size).toBe(mealScenarios.length);
  const notes = mealScenarios.flatMap((s) => [...s.variants]);
  expect(notes.length).toBeGreaterThanOrEqual(240);
  expect(new Set(notes).size).toBe(notes.length);
  for (const scenario of mealScenarios) {
    expect(scenario.id).toMatch(/^[a-z][a-z0-9-]+$/u);
    expect([2, 3]).toContain(scenario.variants.length);
    for (const text of scenario.variants) {
      expect(text).toBe(text.trim());
      expect(text.length).toBeLessThanOrEqual(160);
      expect(text).not.toMatch(/[\r\n{}]|VJT\.|SEÇ\.|kcal|kalori|diyet|mesai|senin için|sen de|hak ettin/iu);
      expect(text).toMatch(/[.!?]$/u);
      expect(text.match(/[.!?]+(?:\s|$)/gu)?.length).toBeLessThanOrEqual(2);
    }
  }
});

test("rare pair and role scenarios have independent recorded witnesses", () => {
  for (const [date, expected] of [
    ["2026-04-23", "beans-fresh-beans"],
    ["2026-05-05", "bafra-adana"],
    ["2026-04-22", "manti-extra"],
    ["2026-06-01", "courgette-twice"],
    ["2026-07-25", "corn-twice"],
    ["2026-08-01", "vermicelli-twice"],
    ["2026-08-08", "tomato-twice"],
  ]) {
    const recorded = history.find((m) => m.date.startsWith(date));
    if (!recorded) throw new Error(`Missing archived menu: ${date}`);
    expect(matchingScenarios(presentMeal(recorded), mealScenarios).map((s) => s.id)).toContain(expected);
  }
});

test("matching a dish family cannot invent hidden ingredients or preparation details", () => {
  const source = history.find((m) => m.date.startsWith("2026-10-20"))!;
  const meal = presentMeal(source);
  if (meal.kind !== "structured") throw new Error("Expected structured menu");
  meal.mains = ["Tavuk Suyu Çorba", "Mercimek Köfte"];
  meal.sides = [{ kind: "extras", name: "Yoğurtlu Patlıcan", label: "Diğer seçenekler", items: ["Yoğurtlu Patlıcan"], calorie: null }];
  meal.vegetarian = null;
  const ids = matchingScenarios(meal, mealScenarios).map((s) => s.id);
  expect(ids).not.toContain("chicken");
  expect(ids).not.toContain("chicken-soup");
  expect(ids).not.toContain("kofte");
  expect(ids).not.toContain("pasta-yogurt");
  expect(ids).not.toContain("imam-bayildi");
});

test("all 186 archived records are covered and every authored scenario has a real witness", () => {
  expect(history).toHaveLength(186);
  const witnessed = new Set<string>();
  for (const menu of history) {
    const meal = presentMeal(menu);
    const matches = matchingScenarios(meal, mealScenarios);
    expect(matches.length).toBeGreaterThan(0);
    matches.forEach((s) => witnessed.add(s.id));
    for (const accountKey of ["fixture-alice", "fixture-bob", "fixture-carol"]) {
      const selected = getMealPofiCommentary(meal, { date: menu.date.slice(0, 10), accountKey });
      const scenario = matches.find((s) => s.id === selected?.scenario);
      expect(scenario).toBeDefined();
      expect(scenario?.variants).toContain(selected!.text);
    }
  }
  expect([...witnessed].sort()).toEqual(mealScenarios.map((s) => s.id).sort());
});
