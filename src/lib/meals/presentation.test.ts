import { expect, test } from "bun:test";
import { mealSamples } from "./history-sample";
import { presentMeal, type MealMenu } from "./presentation";

function sample(date: string) {
  const menu = mealSamples.find((menu) => menu.date.startsWith(date));
  if (!menu) throw new Error(`Missing recorded meal sample: ${date}`);
  return menu;
}

const expected = [
  ["2026-10-20", "Patlıcan Musakka", "Lahmacun", "Kuru Fasulye", "Pirinç Pilavı"],
  ["2026-10-19", "Tirit", "Bafra Pidesi", "Bezelye", "Bulgur Pilavı"],
  ["2026-10-16", "Şehzade Kebabı", "Kıymalı Pide", "Sebze Fırın", "Pirinç Pilavı"],
  ["2026-10-15", "Piliç Topkapı", "Lahmacun", "Mantar Kavurma", "Makarna"],
  ["2026-10-14", "Ekşili Köfte", "Kaşarlı Sucuklu Pide", "Yeşil Mercimek", "Makarna"],
  ["2026-10-13", "Etli Kuru Fasulye", "Bafra Pidesi", "Soslu Patlıcan", "Pirinç Pilavı"],
  ["2026-10-12", "Hünkar Beğendi", "Etli Ekmek", "Patates Yemeği", "Bulgur Pilavı"],
  ["2026-10-09", "Tas Kebabı", "Lahmacun", "Ispanak", "Pirinç Pilavı"],
  ["2026-10-08", "Biber Dolma", "Kuşbaşılı Pide", "Patates Bulancar", "Adana Böreği"],
  ["2026-10-07", "İzmir Köfte", "Lahmacun", "İmam Bayıldı", "Pirinç Pilavı"],
  ["2026-10-06", "Tavuk Baget", "Bafra Pidesi", "Sebze Ratatuy", "Spagetti"],
  ["2026-10-05", "Kuzu Sote", "Kaşarlı Sucuklu Pide", "Barbunya", "Bulgur Pilavı"],
  ["2026-10-02", "Patates Musakka", "Kuşbaşılı Kşr.Pide", "Yeşil Mercimek", "Bulgur Pilavı"],
  ["2026-10-01", "Etli Nohut", "Etli Ekmek", "Mevsim Türlü", "Pirinç Pilavı"],
  ["2026-09-30", "Etli Sultan Kebabı", "Sucuklu Kşr.Pide", "Taze Fasulye", "Soslu Makarna"],
  ["2026-09-29", "Tavuk Şiş", "Bafra Pidesi", "Ispanak", "Pirinç Pilavı"],
  ["2026-09-28", "Hünkar Beğendi", "Lahmacun", "Kuru Fasulye", "Şhry.Bulgur Pilavı"],
  ["2026-09-25", "Karışık Izgara", "Etli Ekmek", "Karnıbahar", "Sbzl. Bulgur Pilavı"],
  ["2026-09-24", "Etli Kuru Fasulye", "Bafra Pidesi", "Kabak", "Şhry.Pirinç Pilavı"],
  ["2026-09-23", "Çökertme Kebabı", "Kıymalı Pide", "Ispanak", "Pirinç Pilavı"],
  ["2026-09-22", "Fırında Baget", "Lahmacun", "İmam Bayıldı", "Bulgur Pilavı"],
  ["2026-09-21", "Et Kavurma", "Kuşbaşılı Kşrl. Pide", "Türlü", "Bademli Pirinç Pilavı"],
] as const;

for (const [date, main, alternative, vegetarian, accompaniment] of expected) {
  test(`${date}: main choices, vegetarian dish and shared accompaniment stay separate`, () => {
    const meal = presentMeal(sample(date));
    expect(meal.kind).toBe("structured");
    if (meal.kind !== "structured") throw new Error("Expected structured menu");
    expect(meal.mains).toEqual([main, alternative]);
    expect(meal.vegetarian).toEqual({ name: vegetarian, calorie: null });
    expect(meal.sides.find((side) => side.kind === "accompaniment")).toMatchObject({
      name: accompaniment, calorie: null,
    });
    expect(meal.sides.map((side) => side.kind)).toEqual(["soup", "accompaniment", "dessert", "extras", "salad"]);
  });
}

const singleMainDays = [
  ["2026-10-18", "Tavuk Baget", "Pirinç Pilavı", 359],
  ["2026-10-17", "Izgara Köfte", "Bulgur Pilavı", 359],
  ["2026-10-11", "Dana Rosto", "Makarna", 121],
  ["2026-10-10", "Tavuk Izgara", "Bulgur Pilavı", 121],
  ["2026-10-04", "Et Sote", "Pirinç Pilavı", 359],
  ["2026-10-03", "Fırında Tavuk Izgara", "Pirinç Pilavı", 359],
  ["2026-09-27", "Fırında Köfte Patates", "Pirinç Pilavı", 359],
  ["2026-09-26", "Tavuk Fajita", "Makarna", 121],
  ["2026-09-20", "Mitite Köfte", "Makarna", 121],
] as const;

for (const [date, main, accompaniment, calorie] of singleMainDays) {
  test(`${date}: a single main does not invent alternative or vegetarian choices`, () => {
    const meal = presentMeal(sample(date));
    if (meal.kind !== "structured") throw new Error("Expected structured menu");
    expect(meal.mains).toEqual([main]);
    expect(meal.vegetarian).toBeNull();
    expect(meal.sharedCalorie).toBeNull();
    expect(meal.sides.find((side) => side.kind === "accompaniment")).toMatchObject({ name: accompaniment, calorie });
  });
}

test("all 31 days from 20 September through 20 October have independent category expectations", () => {
  const expectedDates: string[] = [...expected, ...singleMainDays].map(([date]) => date).sort();
  const calendarDates = Array.from({ length: 31 }, (_, offset) =>
    new Date(Date.UTC(2026, 8, 20 + offset)).toISOString().slice(0, 10));
  expect(expectedDates).toEqual(calendarDates);
  expect(mealSamples.map((menu) => menu.date.slice(0, 10)).sort()).toEqual(calendarDates);
});

test("20 October: calories keep their source scope rather than being copied or divided", () => {
  const menu = sample("2026-10-20");
  const before = structuredClone(menu);
  const meal = presentMeal(menu);
  if (meal.kind !== "structured") throw new Error("Expected structured menu");
  expect(meal.mainCalorie).toBe(350);
  expect(meal.sharedCalorie).toEqual({ name: "Kuru Fasulye - Pirinç Pilavı", calorie: 359 });
  expect(meal.sides.find((side) => side.kind === "soup")).toMatchObject({ name: "Tavuk Suyu Çorba", calorie: 120 });
  expect(meal.sides.find((side) => side.kind === "extras")).toMatchObject({ name: "Cacık · Zeytinyağlı Enginar", calorie: null });
  expect(menu).toEqual(before);
});

test("compound side rows expose separate items for compact display", () => {
  const menu = presentMeal(sample("2026-10-20"));
  if (menu.kind !== "structured") throw new Error("Expected structured menu");
  expect(menu.sides.find((side) => side.kind === "dessert")?.items).toEqual(["Meyve", "İçecek"]);
  expect(menu.sides.find((side) => side.kind === "extras")?.items).toEqual(["Cacık", "Zeytinyağlı Enginar"]);
  expect(menu.sides.find((side) => side.kind === "salad")?.items).toEqual(["Göbek", "Havuç Salata", "Limon"]);

  const unevenSeparator = presentMeal(sample("2026-09-28"));
  if (unevenSeparator.kind !== "structured") throw new Error("Expected structured menu");
  expect(unevenSeparator.sides.find((side) => side.kind === "extras")?.items)
    .toEqual(["Kaşık Salata", "Yoğurtlu Kabak Kızartma"]);
});

const expectedMonthlySideItems = [
  ["2026-10-20", ["Cacık", "Zeytinyağlı Enginar"], ["Göbek", "Havuç Salata", "Limon"]],
  ["2026-10-19", ["Zeytinyağlı Yaprak Sarma", "Mısır Salata"], ["Havuç", "K.Lahana Salata", "Limon"]],
  ["2026-10-18", ["Cacık", "Soslu Patlıcan"], ["Göbek", "K.Lahana Salata", "Limon"]],
  ["2026-10-17", ["Yoğurt", "Kısır"], ["Göbek", "Havuç Salata", "Limon"]],
  ["2026-10-16", ["Coleslaw", "Enginar"], ["Göbek", "K.Lahana Salata", "Limon"]],
  ["2026-10-15", ["Cacık", "Karışık Turşu"], ["Göbek", "Havuç Salata", "Limon"]],
  ["2026-10-14", ["Kabak Tarator", "Zeytinyağlı Brokoli"], ["Havuç", "Roka Salata", "Limon"]],
  ["2026-10-13", ["Havuç Tarator", "Çiğ Köfte"], ["Göbek", "K.Lahana Salata", "Limon"]],
  ["2026-10-12", ["Acısız Ezme", "Haydari"], ["Göbek", "Havuç Salata", "Limon"]],
  ["2026-10-11", ["Salatalık Turşu", "Yoğurt"], ["Göbek", "K.Lahana Salata", "Limon"]],
  ["2026-10-10", ["Havuç Tarator", "Mısır Salata"], ["Roka", "K.Lahana Salata", "Limon"]],
  ["2026-10-09", ["Haydari", "Zeytinyağlı Karnabahar"], ["Göbek", "K.Lahana Salata", "İçecek"]],
  ["2026-10-08", ["Yoğurt", "Kısır"], ["Göbek", "Havuç Salata", "Limon"]],
  ["2026-10-07", ["Acısız Ezme", "Göbek Salata"], ["Mercimek Köfte", "K.Lahana Salata", "Limon"]],
  ["2026-10-06", ["Kuru Cacık", "Kısır"], ["Roka", "K.Lahana Salata", "Limon"]],
  ["2026-10-05", ["Şehriye Salata", "Babaganuş"], ["Göbek", "Havuç Salata", "Limon"]],
  ["2026-10-04", ["Kısır", "Cacık"], ["Roka", "K.Lahana Salata", "Limon"]],
  ["2026-10-03", ["Biber Borani", "Salatalık Turşusu"], ["Göbek", "Havuç Salata", "Limon"]],
  ["2026-10-02", ["Amerikan Salata", "Zeytinyağlı Brüksel Lahana"], ["Havuç", "K.Lahana Salata", "Limon"]],
  ["2026-10-01", ["Karışık Turşu", "Cacık"], ["Çoban", "Göbek Salata", "Limon"]],
  ["2026-09-30", ["Zeytinyağlı Brokoli", "Yoğurtlu Köz Patlıcan"], ["Göbek", "K.Lahana Salata", "Limon"]],
  ["2026-09-29", ["Mercimek Köfte", "Yoğurtlu Kırmızı Lahana"], ["Göbek", "Roka Salata", "Limon"]],
  ["2026-09-28", ["Kaşık Salata", "Yoğurtlu Kabak Kızartma"], ["Göbek", "Havuç Salata", "Limon"]],
  ["2026-09-27", ["Şehriye Salata", "Havuç Tarator"], ["Göbek", "K.Lahana Salata", "Limon"]],
  ["2026-09-26", ["Kısır", "Haydari"], ["Göbek", "Havuç Salata", "Limon"]],
  ["2026-09-25", ["Ezme", "Mantı", "K.Lahana"], ["Göbek Salata", "Limon"]],
  ["2026-09-24", ["Kaşık Salata", "Cacık"], ["Göbek", "Havuç Salata", "Limon"]],
  ["2026-09-23", ["Çiğ Köfte", "Biber Turşusu", "Yğrt.Kabak Kızartma"], ["Göbek Salata", "Limon"]],
  ["2026-09-22", ["Patates Salatası", "Yoğurtlu Köz Biber"], ["Göbek", "K.Lahana Salata", "Limon"]],
  ["2026-09-21", ["Mercimek Köfte", "Ispanak Borani"], ["Göbek", "Havuç Salata", "Limon"]],
  ["2026-09-20", ["Zeytinyağlı Kereviz", "Yoğurt"], ["Göbek", "K.Lahana Salata", "Limon"]],
] as const;

test("cold-side and salad items match all 31 captured menu rows", () => {
  expect(expectedMonthlySideItems.map(([date]) => date as string).sort()).toEqual(
    Array.from({ length: 31 }, (_, offset) => new Date(Date.UTC(2026, 8, 20 + offset)).toISOString().slice(0, 10)),
  );

  for (const [date, extras, salad] of expectedMonthlySideItems) {
    const meal = presentMeal(sample(date));
    if (meal.kind !== "structured") throw new Error(`Expected structured menu: ${date}`);
    expect(meal.sides.find((side) => side.kind === "extras")?.items).toEqual([...extras]);
    expect(meal.sides.find((side) => side.kind === "salad")?.items).toEqual([...salad]);
  }
});

test("unknown or empty source layouts retain all source rows without guessing", () => {
  const menu = sample("2026-10-20");
  const reordered = { ...menu, dishes: [...menu.dishes].reverse() };
  expect(presentMeal(reordered)).toEqual({ kind: "source", dishes: reordered.dishes });
  const extraRow = { ...menu, dishes: [...menu.dishes, { name: "Yeni yemek", calorie: 0 }] };
  expect(presentMeal(extraRow)).toEqual({ kind: "source", dishes: extraRow.dishes });
  expect(presentMeal({ ...menu, dishes: [] })).toEqual({ kind: "source", dishes: [] });
});

test("absent accompaniment and null or zero calories stay distinct", () => {
  const menu: MealMenu = structuredClone(sample("2026-10-20"));
  menu.dishes[1].calorie = null;
  menu.dishes[2] = { name: "VJT. Kuru Fasulye", calorie: 0 };
  const meal = presentMeal(menu);
  if (meal.kind !== "structured") throw new Error("Expected structured menu");
  expect(meal.mainCalorie).toBeNull();
  expect(meal.vegetarian).toEqual({ name: "Kuru Fasulye", calorie: 0 });
  expect(meal.sharedCalorie).toBeNull();
  expect(meal.sides.some((side) => side.kind === "accompaniment")).toBe(false);
});

test("ambiguous extra markers or separators preserve the source row", () => {
  for (const [index, name] of [
    [1, "Ana yemek (SEÇ.) Alternatif (SEÇ.) Başka yemek"],
    [1, "Ana yemek (SEÇ.) "],
    [2, "VJT.Kuru Fasulye - Pirinç Pilavı - Başka yemek"],
  ] as const) {
    const menu = structuredClone(sample("2026-10-20"));
    menu.dishes[index].name = name;
    expect(presentMeal(menu)).toEqual({ kind: "source", dishes: menu.dishes });
  }

  const emptySideItem = structuredClone(sample("2026-10-20"));
  emptySideItem.dishes[4].name = "Cacık - - Enginar";
  expect(presentMeal(emptySideItem)).toEqual({ kind: "source", dishes: emptySideItem.dishes });
});

test("all monthly calorie values keep one source owner, including null values", () => {
  for (const menu of mealSamples) {
    const original = structuredClone(menu);
    const meal = presentMeal(menu);
    if (meal.kind !== "structured") throw new Error(`Unclassified recorded menu: ${menu.date}`);
    expect(meal.mainCalorie).toBe(menu.dishes[1].calorie);
    for (const [kind, sourceIndex] of [["soup", 0], ["dessert", 3], ["extras", 4], ["salad", 5]] as const) {
      expect(meal.sides.find((side) => side.kind === kind)?.calorie).toBe(menu.dishes[sourceIndex].calorie);
    }
    const accompaniment = meal.sides.find((side) => side.kind === "accompaniment")!;
    if (meal.vegetarian) {
      expect(meal.vegetarian.calorie).toBeNull();
      expect(accompaniment.calorie).toBeNull();
      expect(meal.sharedCalorie?.calorie).toBe(menu.dishes[2].calorie);
    } else {
      expect(accompaniment.calorie).toBe(menu.dishes[2].calorie);
    }
    expect(menu).toEqual(original);
  }
});

test("recorded one-sided separators and three-item rows keep every named item", () => {
  for (const [date, kind, name] of [
    ["2026-09-28", "extras", "Kaşık Salata · Yoğurtlu Kabak Kızartma"],
    ["2026-09-22", "extras", "Patates Salatası · Yoğurtlu Köz Biber"],
    ["2026-09-23", "extras", "Çiğ Köfte · Biber Turşusu · Yğrt.Kabak Kızartma"],
    ["2026-09-25", "extras", "Ezme · Mantı · K.Lahana"],
    ["2026-10-07", "salad", "Mercimek Köfte · K.Lahana Salata · Limon"],
    ["2026-10-09", "salad", "Göbek · K.Lahana Salata · İçecek"],
  ] as const) {
    const meal = presentMeal(sample(date));
    if (meal.kind !== "structured") throw new Error("Expected structured menu");
    expect(meal.sides.find((side) => side.kind === kind)?.name).toBe(name);
  }
});

test("category markers determine choices independently of weekday or dish vocabulary", () => {
  const menu = structuredClone(sample("2026-10-18"));
  menu.dishes[1] = { name: "Yeni Ana Yemek ( seç. ) Yeni Alternatif", calorie: 0 };
  menu.dishes[2] = { name: "  vjt. Yeni Sebze- Yeni Eşlikçi  ", calorie: null };
  const meal = presentMeal(menu);
  if (meal.kind !== "structured") throw new Error("Expected structured menu");
  expect(meal.mains).toEqual(["Yeni Ana Yemek", "Yeni Alternatif"]);
  expect(meal.vegetarian).toEqual({ name: "Yeni Sebze", calorie: null });
  expect(meal.sides.find((side) => side.kind === "accompaniment")).toMatchObject({ name: "Yeni Eşlikçi", calorie: null });
  expect(meal.sharedCalorie).toBeNull();
  expect(meal.mainCalorie).toBe(0);
});

test("compound names keep their internal hyphen", () => {
  const menu = structuredClone(sample("2026-10-20"));
  menu.dishes[2] = { name: "VJT.Sebze-Yemeği - Yan-Yemek", calorie: null };
  menu.dishes[4].name = "Yoğurtlu-Salata - Ezme";
  const meal = presentMeal(menu);
  if (meal.kind !== "structured") throw new Error("Expected structured menu");
  expect(meal.vegetarian?.name).toBe("Sebze-Yemeği");
  expect(meal.sides.find((side) => side.kind === "accompaniment")?.name).toBe("Yan-Yemek");
  expect(meal.sides.find((side) => side.kind === "extras")?.name).toBe("Yoğurtlu-Salata · Ezme");
  expect(meal.sides.find((side) => side.kind === "extras")?.items).toEqual(["Yoğurtlu-Salata", "Ezme"]);
});

test("missing names and misplaced category markers fall back without losing the source", () => {
  const original = sample("2026-10-20");
  const swapped = structuredClone(original);
  [swapped.dishes[1], swapped.dishes[2]] = [swapped.dishes[2], swapped.dishes[1]];
  expect(presentMeal(swapped)).toEqual({ kind: "source", dishes: swapped.dishes });
  for (let index = 0; index < 6; index++) {
    const blank = structuredClone(original);
    blank.dishes[index].name = " ";
    expect(presentMeal(blank)).toEqual({ kind: "source", dishes: blank.dishes });
  }
  for (const index of [0, 3, 4, 5]) {
    const misplaced = structuredClone(original);
    misplaced.dishes[index].name += " VJT.Sebze";
    expect(presentMeal(misplaced)).toEqual({ kind: "source", dishes: misplaced.dishes });
  }
});
