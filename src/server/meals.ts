import { isDateKey } from "@/domain/rules/calendar";
import { getIstanbulDate, getMealDateRange } from "@/lib/meals/dates";
import type { MealMenu } from "@/lib/meals/presentation";
import { readMealMenu } from "@/lib/meals/response";

const SOURCE_URL = "https://istanbul.trt.net.tr/api/get_meal.php";
const CACHE_MS = 60 * 60 * 1000;

export class MealInputError extends Error {}
export class MealSourceError extends Error {}

export function readMealSourceResponse(value: unknown, requestedDate: string): MealMenu | null {
  if (!Array.isArray(value)) throw new MealSourceError("Unexpected meal response");
  if (value.length === 0) return null;
  if (value.length !== 1) throw new MealSourceError("Ambiguous meal response");
  try {
    const menu = readMealMenu(value[0], requestedDate);
    if (!menu) throw new Error("Empty meal record");
    return menu;
  } catch (error) {
    throw new MealSourceError("Invalid meal menu", { cause: error });
  }
}

type MealFetch = (url: URL, init: RequestInit) => Promise<Response>;

export function createMealSource(fetchImpl: MealFetch = fetch, clock: () => number = Date.now) {
  const cache = new Map<string, { checkedAt: number; menu: MealMenu | null }>();
  const inFlight = new Map<string, Promise<MealMenu | null>>();

  return async function getMealForDate(date: string): Promise<MealMenu | null> {
    const now = clock();
    const { minDate, maxDate } = getMealDateRange(getIstanbulDate(new Date(now)));
    if (!isDateKey(date) || date < minDate || date > maxDate) {
      throw new MealInputError("Meal date is outside the available range");
    }

    for (const [key, entry] of cache) {
      if (key < minDate || key > maxDate || now - entry.checkedAt >= CACHE_MS) cache.delete(key);
    }
    const cached = cache.get(date);
    if (cached) return cached.menu;
    const pending = inFlight.get(date);
    if (pending) return pending;

    const request = (async () => {
      const url = new URL(SOURCE_URL);
      url.searchParams.set("date", date);
      let response: Response;
      try {
        response = await fetchImpl(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new MealSourceError(`Meal source returned ${response.status}`);
        const menu = readMealSourceResponse(await response.json(), date);
        const checkedAt = clock();
        const currentRange = getMealDateRange(getIstanbulDate(new Date(checkedAt)));
        if (date >= currentRange.minDate && date <= currentRange.maxDate) {
          cache.set(date, { checkedAt, menu });
        }
        return menu;
      } catch (error) {
        if (error instanceof MealSourceError) throw error;
        throw new MealSourceError("Meal source request failed", { cause: error });
      }
    })().finally(() => inFlight.delete(date));
    inFlight.set(date, request);
    return request;
  };
}

export const getMealForDate = createMealSource();
