import { expect, test } from "bun:test";
import { clockSurpriseAt, hasMirroredRecords, nextSurpriseTap } from "./pofi-surprises";

const at = (date: string, clock: string) => Date.parse(`${date}T${clock}+03:00`);

test("dokunma sayacı üçüncü dokunuşta sınırına ulaşır", () => {
  expect([0, 1, 2, 3].map(nextSurpriseTap)).toEqual([1, 2, 3, 3]);
});

test.each([
  ["2026-11-11", "11:11:00", "dateTime"],
  ["2026-10-16", "11:11:00", "fourSame"],
  ["2026-10-16", "01:23:00", "sequence"],
  ["2026-10-16", "12:21:00", "mirror"],
  ["2026-10-16", "09:09:00", "matching"],
  ["2026-10-16", "11:22:00", "pairs"],
  ["2026-10-16", "01:02:00", "double"],
  ["2026-10-16", "09:10:00", "consecutive"],
  ["2026-10-16", "09:07:00", null],
] as const)("İstanbul'da %s %s saat sürprizi", (date, clock, expected) => {
  expect(clockSurpriseAt(at(date, clock))).toBe(expected);
});

test("saat sürprizi saniyeleri dikkate almaz ve yeni dakikada güncellenir", () => {
  expect(clockSurpriseAt(Date.parse("2026-10-16T09:34:00.000Z"))).toBe("sequence");
  expect(clockSurpriseAt(Date.parse("2026-10-16T09:34:59.999Z"))).toBe("sequence");
  expect(clockSurpriseAt(Date.parse("2026-10-16T09:35:00.000Z"))).toBeNull();
  expect(clockSurpriseAt(Date.parse("2026-10-15T21:00:00.000Z"))).toBe("fourSame");
});

test("geçersiz zamanlar sürpriz üretmez", () => {
  for (const invalid of [NaN, Infinity, -Infinity, 8.64e15 + 1]) {
    expect(clockSurpriseAt(invalid)).toBeNull();
  }
});

test("ayna kayıtları iki geçerli, sıralı saat ve dakikaya bağlıdır", () => {
  const entry = at("2026-10-16", "10:01:59");
  const exit = at("2026-10-16", "12:21:03");
  const otherEntry = at("2026-10-16", "10:02:00");
  const otherExit = at("2026-10-16", "12:22:00");

  expect(hasMirroredRecords(entry, exit)).toBe(true);
  expect(hasMirroredRecords(null, exit)).toBe(false);
  expect(hasMirroredRecords(entry, null)).toBe(false);
  expect(hasMirroredRecords(exit, entry)).toBe(false);
  expect(hasMirroredRecords(entry, otherExit)).toBe(false);
  expect(hasMirroredRecords(otherEntry, exit)).toBe(false);
  expect(hasMirroredRecords(NaN, exit)).toBe(false);
  expect(hasMirroredRecords(entry, Infinity)).toBe(false);
});
