import { expect, test } from "bun:test";
import { getMealPofiCommentary } from "./commentary";
import { mealSamples } from "./history-sample";
import { presentMeal, type MealPresentation } from "./presentation";

const context = { date: "2026-10-20", accountKey: "fixture-alice" };
const menu = presentMeal(mealSamples.find((m) => m.date.startsWith(context.date))!);

test("matched meal pairs take priority over single dishes and scenes for every account", () => {
  for (let n = 0; n < 40; n++) {
    expect(getMealPofiCommentary(menu, { ...context, accountKey: `fixture-${n}` })?.kind).toBe("pair");
  }
});

test("main dishes including vegetarian alternatives take priority over drinks and sides", () => {
  for (const primary of [
    { mains: ["Hasanpaş kÖFTE", "Sucuklu Pide"], vegetarian: { name: "Mücver", calorie: null } },
    { mains: ["Bilinmeyen yemek"], vegetarian: { name: "Kuru Fasulye", calorie: null } },
  ]) {
    const meal: MealPresentation = {
      kind: "structured", ...primary, mainCalorie: null, sharedCalorie: null,
      sides: [{ kind: "dessert", label: "Tatlı / İçecek", name: "Sütlaç · İçecek", items: ["Sütlaç", "İçecek"], calorie: null }],
    };
    for (let n = 0; n < 40; n++) {
      const note = getMealPofiCommentary(meal, { ...context, accountKey: `fixture-${n}` });
      expect(note?.kind).toBe("dish");
      expect(primary.vegetarian.name === "Kuru Fasulye" ? ["beans"] : ["kofte", "pide"]).toContain(note!.scenario);
    }
  }
});

test("other recognized foods precede drinks; drinks remain available before generic scenes", () => {
  const meal: MealPresentation = {
    kind: "structured", mains: ["Bilinmeyen yemek"], vegetarian: null, mainCalorie: null, sharedCalorie: null,
    sides: [{ kind: "dessert", label: "Tatlı / İçecek", name: "Sütlaç · İçecek", items: ["Sütlaç", "İçecek"], calorie: null }],
  };
  for (let n = 0; n < 40; n++) {
    const accountKey = `fixture-${n}`;
    expect(getMealPofiCommentary(meal, { ...context, accountKey })?.scenario).toBe("sutlac");
    const drinksOnly = structuredClone(meal);
    if (drinksOnly.kind === "structured") drinksOnly.sides[0].items = ["İçecek"];
    expect(getMealPofiCommentary(drinksOnly, { ...context, accountKey })?.scenario).toBe("drink");
  }
});

test("meal commentary requires a real date and an account key", () => {
  expect(() => getMealPofiCommentary(menu, { ...context, accountKey: " " })).toThrow();
  expect(() => getMealPofiCommentary(menu, { ...context, date: "2026-02-30" })).toThrow();
});

test("one account and selected date keep the same complete note across reloads", () => {
  const first = getMealPofiCommentary(menu, context);
  expect(first?.text).toBeTruthy();
  expect(getMealPofiCommentary(structuredClone(menu), context)).toEqual(first);
});

test("account and selected date both contribute to variation", () => {
  const users = Array.from({ length: 40 }, (_, n) =>
    getMealPofiCommentary(menu, { ...context, accountKey: `fixture-${n}` })?.id);
  const dates = Array.from({ length: 20 }, (_, n) =>
    getMealPofiCommentary(menu, { ...context, date: `2026-10-${String(n + 1).padStart(2, "0")}` })?.id);
  expect(new Set(users).size).toBeGreaterThan(5);
  expect(new Set(dates).size).toBeGreaterThan(5);
});

test("unknown layouts receive complete safe scenes without exposing raw source names", () => {
  const source: MealPresentation = { kind: "source", dishes: [{ name: "Bilinmeyen Yemek - İçecek", calorie: null }] };
  for (let n = 0; n < 30; n++) {
    const note = getMealPofiCommentary(source, { ...context, accountKey: `fixture-${n}` });
    expect(note?.kind).toBe("scene");
    expect(note?.text).not.toContain("Bilinmeyen");
    expect(note?.text).not.toContain("İçecek");
  }
});

test("an empty menu has no fictional meal note", () => {
  expect(getMealPofiCommentary({ kind: "source", dishes: [] }, context)).toBeNull();
});

test("a valid calendar date before the Unix epoch still resolves a complete variant", () => {
  const note = getMealPofiCommentary({
    kind: "structured", mains: ["Lahmacun"], mainCalorie: null,
    vegetarian: null, sides: [], sharedCalorie: null,
  }, { date: "0000-01-01", accountKey: "epoch-fixture-13217" });
  expect(note?.text).toBeTruthy();
  expect(note?.id).not.toEndWith(":v0");
});

test("a scenario selected on adjacent dates advances its complete variant", () => {
  const simple: MealPresentation = {
    kind: "structured", mains: ["Lahmacun"], mainCalorie: null,
    vegetarian: null, sides: [], sharedCalorie: null,
  };
  const notes = Array.from({ length: 28 }, (_, n) => getMealPofiCommentary(simple, {
    ...context, date: `2026-02-${String(n + 1).padStart(2, "0")}`,
  }));
  let comparisons = 0;
  for (let n = 1; n < notes.length; n++) {
    const previous = notes[n - 1];
    const note = notes[n];
    if (previous && note && previous.scenario === note.scenario) {
      comparisons++;
      expect(note.id).not.toBe(previous.id);
    }
  }
  expect(comparisons).toBeGreaterThan(10);
});
