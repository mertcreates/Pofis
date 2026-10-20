export interface MealDish {
  name: string;
  calorie: number | null;
}

export interface MealMenu {
  date: string;
  city: string;
  dishes: MealDish[];
}

export type MealSideKind = "soup" | "accompaniment" | "dessert" | "extras" | "salad";

export interface MealSide extends MealDish {
  kind: MealSideKind;
  label: string;
  items: string[];
}

export type MealPresentation = {
  kind: "structured";
  mains: string[];
  mainCalorie: number | null;
  vegetarian: MealDish | null;
  sides: MealSide[];
  sharedCalorie: MealDish | null;
} | {
  kind: "source";
  dishes: MealDish[];
};

function displayItem(name: string) {
  return name.trim().replace(/ZYT\.\s*/giu, "Zeytinyağlı ");
}

function parseMenuItems(name: string): string[] | null {
  // Kaynakta hem " - " hem "- " var. Sözcük içindeki tireyi koru.
  const items = name.trim().split(/\s+-\s*|\s*-\s+/u).map((item) => item.trim());
  if (items.some((item) => !item)) return null;
  return items.map(displayItem);
}

function displayItems(items: string[]) {
  return items.join(" · ");
}

// Gözlenen altı satırlı TRT formatı. Tanınmayan düzeni kaynak haliyle göster.
export function presentMeal(menu: MealMenu): MealPresentation {
  const [soup, main, third, dessert, cold, salad] = menu.dishes;
  const source: MealPresentation = { kind: "source", dishes: menu.dishes };
  if (menu.dishes.length !== 6 || menu.dishes.some((dish) => !dish.name.trim())
    || !/çorba/iu.test(soup.name)
    || !dessert.name.toLocaleLowerCase("tr-TR").includes("içecek")
    || !/salata|limon/iu.test(salad.name)) return source;

  // İşaretler beklenen satırda değilse sıra üzerinden kategori atama.
  if (/VJT\./iu.test(main.name) || /SEÇ/iu.test(third.name)
    || [soup, dessert, cold, salad].some((dish) => /VJT\.|\(\s*SEÇ/iu.test(dish.name))) return source;

  const soupItems = parseMenuItems(soup.name);
  const dessertItems = parseMenuItems(dessert.name);
  const coldItems = parseMenuItems(cold.name);
  const saladItems = parseMenuItems(salad.name);
  if (soupItems === null || dessertItems === null || coldItems === null || saladItems === null) return source;

  const mains = main.name.trim().split(/\(\s*SEÇ\.?\s*\)/iu).map((name) => name.trim());
  if (mains.length > 2 || mains.some((name) => !name)) return source;

  const thirdName = third.name.trim();
  const isVegetarian = /^VJT\.\s*/iu.test(thirdName);
  if (/VJT\./iu.test(thirdName) && !isVegetarian) return source;
  const thirdNames = parseMenuItems(thirdName.replace(/^VJT\.\s*/iu, ""));
  if (!thirdNames || (isVegetarian && thirdNames.length > 2)) return source;

  const vegetarian = isVegetarian ? {
    name: thirdNames[0],
    calorie: thirdNames.length === 1 ? third.calorie : null,
  } : null;
  const accompaniment = isVegetarian ? thirdNames.slice(1) : thirdNames;
  const sharedCalorie = isVegetarian && accompaniment.length > 0 && third.calorie !== null
    ? { name: thirdName.replace(/^VJT\.\s*/iu, ""), calorie: third.calorie }
    : null;

  return {
    kind: "structured",
    mains,
    mainCalorie: main.calorie,
    vegetarian,
    sharedCalorie,
    sides: [
      { ...soup, name: displayItems(soupItems), items: soupItems, kind: "soup", label: "Çorba" },
      ...(accompaniment.length > 0 ? [{
        kind: "accompaniment" as const,
        label: "Yanına",
        name: displayItems(accompaniment),
        calorie: isVegetarian ? null : third.calorie,
        items: accompaniment,
      }] : []),
      { ...dessert, name: displayItems(dessertItems), items: dessertItems, kind: "dessert", label: "Tatlı / İçecek" },
      { ...cold, name: displayItems(coldItems), items: coldItems, kind: "extras", label: "Diğer seçenekler" },
      { ...salad, name: displayItems(saladItems), items: saladItems, kind: "salad", label: "Salata" },
    ],
  };
}
