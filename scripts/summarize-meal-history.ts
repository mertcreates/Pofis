import { writeFile } from "node:fs/promises";
import type { MealMenu } from "../src/lib/meals/presentation";
import { readMealMenu } from "../src/lib/meals/response";

const directory = new URL("../data/meals/", import.meta.url);
const menus: MealMenu[] = await Bun.file(new URL("history.json", directory)).json();
const days = new Map<string, MealMenu[]>();
for (const menu of menus) {
  const date = menu.date.slice(0, 10);
  readMealMenu(menu, date);
  days.set(date, [...(days.get(date) ?? []), menu]);
}

const frequencies = new Map<string, { name: string; dates: Set<string>; sourceNames: Set<string> }>();
for (const [date, records] of days) {
  for (const menu of records) {
    if (menu.dishes.length !== 6) throw new Error(`${date}: altı satırlı kaynak biçimi değişti`);
    menu.dishes.forEach((dish, row) => {
      // Main dish names can include an accompaniment (e.g. "Et Tantuni - Lavaş").
      // Inventory keeps that name together, matching the existing menu parser.
      const parts = row === 1
        ? dish.name.split(/\(\s*SEÇ\.?\s*\)/iu)
        : dish.name.replace(/^\s*VJT\.\s*/iu, "").split(/\s+-\s*|\s*-\s+/u);
      for (const part of parts) {
        const sourceName = part.trim().replace(/\s+/gu, " ");
        if (!sourceName) throw new Error(`${date}: boş yemek adı`);
        const name = sourceName.replace(/ZYT\.\s*/giu, "Zeytinyağlı ");
        const key = name.normalize("NFC").toLocaleLowerCase("tr-TR");
        const item = frequencies.get(key) ?? { name, dates: new Set<string>(), sourceNames: new Set<string>() };
        item.dates.add(date);
        item.sourceNames.add(sourceName);
        frequencies.set(key, item);
      }
    });
  }
}

const dates = [...days.keys()].sort();
const items = [...frequencies.values()].map((item) => ({
  name: item.name,
  count: item.dates.size,
  sourceNames: [...item.sourceNames].sort((a, b) => a.localeCompare(b, "tr")),
})).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr"));
const summary = {
  source: "history.json",
  from: dates[0],
  to: dates.at(-1),
  menuDays: days.size,
  menuRecords: menus.length,
  multipleMenuDates: [...days].filter(([, records]) => records.length > 1).map(([date]) => date).sort(),
  counting: "Bir öğe aynı tarihin bütün menü kayıtlarında toplam bir kez sayılır. Sayı, öğenin bulunduğu farklı gün sayısıdır.",
  normalization: "Boşluk ve Türkçe büyük/küçük harf farkları birleştirilir; VJT./SEÇ. işaretleri ayrılır; ZYT. açılır. Diğer kısaltma, eğik çizgi ve yazım farkları korunur. Meyve/İçecek gibi genel kaynak adları da sayılır.",
  distinctItems: items.length,
  items,
};
await writeFile(new URL("frequencies.json", directory), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ from: summary.from, to: summary.to, days: summary.menuDays, records: summary.menuRecords, distinctItems: summary.distinctItems, top20: items.slice(0, 20) }, null, 2));
