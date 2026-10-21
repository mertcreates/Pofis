import { mkdir, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isDateKey } from "../src/domain/rules/calendar";
import { getIstanbulDate, shiftMealDate } from "../src/lib/meals/dates";
import type { MealMenu } from "../src/lib/meals/presentation";
import { readMealMenu } from "../src/lib/meals/response";

const source = "https://istanbul.trt.net.tr/api/get_meal.php";
const directory = new URL("../data/meals/", import.meta.url);
const menusFile = new URL("history.json", directory);
const collectionFile = new URL("collection.json", directory);
type DayResult = { checkedAt: string } & (
  | { state: "menu" | "empty"; records?: number }
  | { state: "error"; message: string }
);

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("Kullanım: bun scripts/collect-meal-history.ts [--from YYYY-MM-DD] [--to YYYY-MM-DD]");
  console.log("Varsayılan: son altı ay. data/meals/ dizinine kaydeder; tamamlanan günleri tekrar istemez.");
  process.exit(0);
}
const flags = new Map<string, string>();
for (let index = 0; index < args.length; index += 2) {
  const flag = args[index];
  const value = args[index + 1];
  if (!["--from", "--to"].includes(flag) || !isDateKey(value) || flags.has(flag)) {
    throw new Error(`Geçersiz veya eksik seçenek: ${flag}`);
  }
  flags.set(flag, value);
}
const to = flags.get("--to") ?? getIstanbulDate();
const from = flags.get("--from") ?? shiftMealDate(to, { months: -6 });
if (from > to || to > getIstanbulDate()) throw new Error("Geçmişte geçerli bir tarih aralığı seç.");

const menus: MealMenu[] = await Bun.file(menusFile).exists() ? await Bun.file(menusFile).json() : [];
const byDate = new Map<string, MealMenu[]>();
for (const menu of menus) {
  const date = menu.date.slice(0, 10);
  byDate.set(date, [...(byDate.get(date) ?? []), menu]);
}
const previous = await Bun.file(collectionFile).exists() ? await Bun.file(collectionFile).json() : null;
const results: Record<string, DayResult> = previous?.dates ?? {};
const dates: string[] = [];
for (let date = from; date <= to; date = shiftMealDate(date, { days: 1 })) dates.push(date);

function summary() {
  return {
    days: dates.length,
    menus: dates.filter((date) => results[date]?.state === "menu").length,
    records: dates.reduce((count, date) => count + (byDate.get(date)?.length ?? 0), 0),
    multipleRecords: dates.filter((date) => (byDate.get(date)?.length ?? 0) > 1),
    empty: dates.filter((date) => results[date]?.state === "empty").length,
    errors: dates.filter((date) => results[date]?.state === "error").length,
    pending: dates.filter((date) => !results[date]).length,
  };
}

await mkdir(directory, { recursive: true });
async function saveJson(path: URL, value: unknown) {
  const temporary = `${fileURLToPath(path)}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(temporary, path);
      return;
    } catch (error) {
      // Windows can briefly lock the replaced JSON while an indexer reads it.
      const code = (error as NodeJS.ErrnoException).code;
      if (process.platform !== "win32" || !["EPERM", "EACCES"].includes(code ?? "") || attempt >= 4) throw error;
      await Bun.sleep(50 * 2 ** attempt);
    }
  }
}
let saveQueue = Promise.resolve();
function checkpoint() {
  saveQueue = saveQueue.then(async () => {
    await saveJson(menusFile, [...byDate.values()].flat().sort((a, b) => a.date.localeCompare(b.date)));
    await saveJson(collectionFile, { source, from, to, updatedAt: new Date().toISOString(), summary: summary(), dates: results });
  });
  return saveQueue;
}

const pending = dates.filter((date) => !results[date] || results[date].state === "error"
  || (results[date].state === "menu" && !byDate.has(date)));
console.log(`${from} – ${to}: ${dates.length} gün; ${pending.length} istek kaldı.`);
let cursor = 0;
let failuresInARow = 0;
let completed = 0;
let stop = false;
async function worker() {
  while (!stop && cursor < pending.length) {
    const date = pending[cursor++];
    const url = new URL(source);
    url.searchParams.set("date", date);
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      if (!response.ok) {
        if (response.status === 429) stop = true;
        throw new Error(`Kaynak HTTP ${response.status} döndürdü`);
      }
      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) throw new Error("Kaynak menü dizisi döndürmedi");
      const records = payload.map((value) => {
        const menu = readMealMenu(value, date);
        if (!menu) throw new Error("Kaynak dizisinde boş menü kaydı var");
        return menu;
      });
      if (records.length > 0) byDate.set(date, records);
      else byDate.delete(date);
      results[date] = { state: records.length > 0 ? "menu" : "empty", records: records.length, checkedAt: new Date().toISOString() };
      failuresInARow = 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen kaynak hatası";
      results[date] = { state: "error", checkedAt: new Date().toISOString(), message };
      console.error(`${date}: ${message}`);
      failuresInARow++;
      if (failuresInARow >= 3) stop = true;
    }
    completed++;
    await checkpoint();
    if (completed % 10 === 0) console.log(JSON.stringify(summary()));
    await Bun.sleep(250);
  }
}

await Promise.all([worker(), worker()]);
await checkpoint();
console.log(JSON.stringify(summary(), null, 2));
if (stop || summary().errors > 0 || summary().pending > 0) {
  console.error("Toplama tamamlanmadı. Aynı komut kalan veya hatalı günlerden devam eder.");
  process.exitCode = 1;
}
