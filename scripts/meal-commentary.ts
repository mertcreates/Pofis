import { mealScenarios } from "../src/lib/meals/commentary/catalogue";
import { matchingScenarios } from "../src/lib/meals/commentary/matching";
import { getMealPofiCommentary } from "../src/lib/meals/commentary";
import { presentMeal, type MealMenu } from "../src/lib/meals/presentation";
import { readMealMenu } from "../src/lib/meals/response";

const menus: MealMenu[] = await Bun.file(new URL("../data/meals/history.json", import.meta.url)).json();
for (const menu of menus) readMealMenu(menu, menu.date.slice(0, 10));
const args = process.argv.slice(2);
const command = args[0] ?? "validate";

function option(name: string) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

if (command === "preview") {
  const date = option("--date");
  const accountKey = option("--key");
  if (!date || !accountKey) throw new Error("Kullanım: bun scripts/meal-commentary.ts preview --date YYYY-MM-DD --key örnek");
  const records = menus.filter((m) => m.date.startsWith(`${date}T`));
  if (!records.length) throw new Error(`Arşivde menü yok: ${date}`);
  console.log(JSON.stringify(records.map((menu) => ({
    date,
    dishes: menu.dishes.map((d) => d.name),
    note: getMealPofiCommentary(presentMeal(menu), { date, accountKey }),
  })), null, 2));
} else if (command === "validate") {
  const seenIds = new Set<string>();
  const texts = new Set<string>();
  for (const scenario of mealScenarios) {
    if (seenIds.has(scenario.id)) throw new Error(`Tekrarlanan senaryo: ${scenario.id}`);
    seenIds.add(scenario.id);
    for (const text of scenario.variants) {
      if (!text.trim() || text !== text.trim() || text.length > 160 || texts.has(text)) {
        throw new Error(`Boş, uzun veya tekrarlanan metin: ${scenario.id}`);
      }
      texts.add(text);
    }
  }
  const hits = new Map<string, number>();
  const coverage = menus.map((menu) => {
    const meal = presentMeal(menu);
    const candidates = matchingScenarios(meal, mealScenarios);
    candidates.forEach((s) => hits.set(s.id, (hits.get(s.id) ?? 0) + 1));
    return { date: menu.date.slice(0, 10), meal, candidates };
  });
  const unmatched = mealScenarios.filter((s) => !hits.has(s.id)).map((s) => s.id);
  if (unmatched.length) throw new Error(`Arşivle eşleşmeyen senaryolar: ${unmatched.join(", ")}`);
  const onePerDate = [...new Map(coverage.map((c) => [c.date, c])).values()].sort((a, b) => a.date.localeCompare(b.date));
  const selectedIds = new Set<string>();
  const selectedScenarios = new Set<string>();
  const kinds: Record<string, number> = {};
  let adjacentRepeats = 0;
  let comparisons = 0;
  for (let account = 0; account < 100; account++) {
    let previous = "";
    for (const record of onePerDate) {
      const note = getMealPofiCommentary(record.meal, { date: record.date, accountKey: `preview-account-${account}` });
      if (!note) throw new Error(`Not bulunamayan menü: ${record.date}`);
      selectedIds.add(note.id);
      selectedScenarios.add(note.scenario);
      kinds[note.kind] = (kinds[note.kind] ?? 0) + 1;
      if (previous) comparisons++;
      if (previous === note.id) adjacentRepeats++;
      previous = note.id;
    }
  }
  console.log(JSON.stringify({
    scenarios: mealScenarios.length, notes: texts.size,
    byKind: Object.fromEntries(["pair", "dish", "scene"].map((kind) => [kind, mealScenarios.filter((s) => s.kind === kind).length])),
    days: onePerDate.length, records: menus.length,
    sourceLayouts: coverage.filter((c) => c.meal.kind === "source").length,
    minimumCandidates: Math.min(...coverage.map((c) => c.candidates.length)),
    minimumStructuredMenuNotes: Math.min(...coverage.filter((c) => c.meal.kind === "structured").map((c) =>
      c.candidates.filter((s) => s.kind !== "scene").reduce((sum, s) => sum + s.variants.length, 0))),
    simulation: { accounts: 100, selectedIds: selectedIds.size, selectedScenarios: selectedScenarios.size, kinds, adjacentRepeats, comparisons },
  }, null, 2));
} else {
  throw new Error("Kullanım: bun scripts/meal-commentary.ts validate | preview --date YYYY-MM-DD --key örnek");
}
