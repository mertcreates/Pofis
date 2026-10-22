import { expect, test } from "bun:test";
import { parsePlanClock, parsePlanDuration, planDisplayMinutes, stepPlanDuration, planClockTimes } from "./plan-duration";

test("plan saati iki noktayla veya sayısal klavyeden dört rakamla girilir", () => {
  for (const input of ["09:00", "9:00", "0900", " 09:00 "]) expect(parsePlanClock(input)).toBe(540);
  expect(parsePlanClock("0000")).toBe(0);
  expect(parsePlanClock("23:59")).toBe(1439);
  expect(parsePlanClock("2359")).toBe(1439);
  for (const input of ["", "9", "09:", "9:0", "900", "24:00", "2360", "12:99", "-1:00", "hello", "09:00:00"])
    expect(parsePlanClock(input)).toBeNull();
});

test("giriş veya çıkış sabit kalırken gereken süre karşı saati belirler", () => {
  expect(planClockTimes(undefined, 28800)).toBeNull();
  expect(planClockTimes({ anchor: "entry", minute: 540 }, 28800)).toEqual({
    entry: { value: "09:00", dayOffset: 0 }, exit: { value: "17:00", dayOffset: 0 },
  });
  expect(planClockTimes({ anchor: "exit", minute: 1080 }, 28800)).toEqual({
    entry: { value: "10:00", dayOffset: 0 }, exit: { value: "18:00", dayOffset: 0 },
  });
  expect(planClockTimes({ anchor: "entry", minute: 540 }, 24643)?.exit.value).toBe("15:51");
  expect(planClockTimes({ anchor: "exit", minute: 1080 }, 24643)?.entry.value).toBe("11:09");
  expect(planClockTimes({ anchor: "entry", minute: 0 }, 0)?.exit.value).toBe("00:00");
});

test("gece yarısı aşımı yönüyle gösterilir; tam gece yarısı ertesi gündür", () => {
  expect(planClockTimes({ anchor: "entry", minute: 1200 }, 28800)?.exit).toEqual({ value: "04:00", dayOffset: 1 });
  expect(planClockTimes({ anchor: "exit", minute: 240 }, 28800)?.entry).toEqual({ value: "20:00", dayOffset: -1 });
  expect(planClockTimes({ anchor: "entry", minute: 960 }, 28800)?.exit).toEqual({ value: "00:00", dayOffset: 1 });
  expect(planClockTimes({ anchor: "exit", minute: 960 }, 57600)?.entry).toEqual({ value: "00:00", dayOffset: 0 });
});

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
