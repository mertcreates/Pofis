import { expect, test } from "bun:test";
import { parsePlanDuration, stepPlanDuration } from "./plan-duration";

test("serbest süre birimleri ve saat:dakika girişleri tam dakikaya çevrilir", () => {
  for (const input of ["8 saat 13 dakika", "8sa13dk", "8 h 13 min", "8 hours 13 minutes", "8:13"]) {
    expect(parsePlanDuration(input)).toBe(493);
  }
  expect(parsePlanDuration("8,5 sa")).toBe(510);
  expect(parsePlanDuration("45 dak")).toBe(45);
  expect(parsePlanDuration("8")).toBe(480);
  for (const input of ["", "17 sa", "16:01", "8:75", "foo", "8 sa 13 dk 2 dk", "8.1 dakika", "-1 sa"])
    expect(parsePlanDuration(input)).toBeNull();
});

test("artı ve eksi, mevcut süreyi izleyen 30 dakikalık çizgiye gider", () => {
  expect(stepPlanDuration(493, 1)).toBe(510);
  expect(stepPlanDuration(493, -1)).toBe(480);
  expect(stepPlanDuration(480, 1)).toBe(510);
  expect(stepPlanDuration(960, 1)).toBe(960);
  expect(stepPlanDuration(0, -1)).toBe(0);
});
