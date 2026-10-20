import { expect, test } from "bun:test";
import { createMealSource, MealInputError, MealSourceError, readMealSourceResponse } from "./meals";

const date = "2026-10-20";
const record = {
  date: `${date}T00:00:00`,
  city: "ISTANBUL",
  dishes: [{ name: "Tavuk Suyu Çorba", calorie: 120 }],
};
const response = () => new Response(JSON.stringify([record]), { status: 200 });

test("same date is fetched once within an hour, then refreshed", async () => {
  let now = Date.parse("2026-10-20T09:00:00Z");
  const requests: string[] = [];
  const source = createMealSource(async (url) => {
    requests.push(url.toString());
    return response();
  }, () => now);

  const first = await source(date);
  expect(first?.dishes[0]).toEqual({ name: "Tavuk Suyu Çorba", calorie: 120 });
  expect(await source(date)).toBe(first);
  expect(requests).toEqual([`https://istanbul.trt.net.tr/api/get_meal.php?date=${date}`]);

  now += 60 * 60 * 1000;
  await source(date);
  expect(requests).toHaveLength(2);
});

test("concurrent requests share one source call and empty days are cached", async () => {
  let calls = 0;
  const source = createMealSource(async () => {
    calls++;
    await Promise.resolve();
    return new Response("[]", { status: 200 });
  }, () => Date.parse("2026-10-20T09:00:00Z"));

  expect(await Promise.all([source(date), source(date)])).toEqual([null, null]);
  expect(await source(date)).toBeNull();
  expect(calls).toBe(1);
});

test("date boundary is enforced before contacting TRT", async () => {
  let calls = 0;
  const source = createMealSource(async () => { calls++; return response(); }, () => Date.parse("2026-10-20T09:00:00Z"));
  for (const invalid of ["2026-09-19", "2026-11-05", "2026-10-20x", "2026-02-30"]) {
    await expect(source(invalid)).rejects.toBeInstanceOf(MealInputError);
  }
  expect(calls).toBe(0);
});

test("source failures are exposed and retried instead of cached", async () => {
  let calls = 0;
  const source = createMealSource(async () => {
    calls++;
    return calls === 1 ? new Response("unavailable", { status: 503 }) : response();
  }, () => Date.parse("2026-10-20T09:00:00Z"));

  await expect(source(date)).rejects.toBeInstanceOf(MealSourceError);
  expect((await source(date))?.dishes[0]?.name).toBe("Tavuk Suyu Çorba");
  expect(calls).toBe(2);
});

test("unexpected source shape never becomes a guessed menu", () => {
  expect(() => readMealSourceResponse([{ ...record, date: "2026-10-19T00:00:00" }], date)).toThrow(MealSourceError);
  expect(() => readMealSourceResponse([record, record], date)).toThrow(MealSourceError);
  expect(readMealSourceResponse([], date)).toBeNull();
});
