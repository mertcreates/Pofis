import { expect, test } from "bun:test";
import { parsePlanDuration, planDisplayMinutes, stepPlanDuration } from "./plan-duration";

test("dakika gösterimi gereken süreyi eksiltmez, gerçekleşeni artırmaz", () => {
  for (const seconds of [0, 1, 59, 60, 61, 1799, 1800, 1801, 28799, 28800, 28801, 57599, 57600]) {
    const required = planDisplayMinutes(seconds, "required") * 60;
    const recorded = planDisplayMinutes(seconds, "recorded") * 60;
    expect(required).toBeGreaterThanOrEqual(seconds);
    expect(required - seconds).toBeLessThan(60);
    expect(recorded).toBeLessThanOrEqual(seconds);
    expect(seconds - recorded).toBeLessThan(60);
  }
  expect(planDisplayMinutes(6 * 3600 + 50 * 60 + 43, "required")).toBe(411);
  expect(planDisplayMinutes(8 * 3600 + 3 * 60 + 59, "recorded")).toBe(483);
  expect(stepPlanDuration(planDisplayMinutes(28799, "required"), 1)).toBe(510);
  expect(stepPlanDuration(planDisplayMinutes(28799, "required"), -1)).toBe(450);
});

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
