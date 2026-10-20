import { expect, test } from "bun:test";
import { getIstanbulDate, getMealCalendarDates, getMealDateRange, getMealWeekDates, shiftMealDate, shiftMealCalendarMonth, shiftMealWeek } from "./dates";

test("date range includes one calendar month back and fifteen days ahead", () => {
  expect(getMealDateRange("2026-10-20")).toEqual({ minDate: "2026-09-20", maxDate: "2026-11-04" });
});

test("Istanbul midnight determines the selected day", () => {
  expect(getIstanbulDate(new Date("2026-10-19T22:30:00Z"))).toBe("2026-10-20");
});

test("month changes clamp to the last valid day and preserve leap years", () => {
  expect(shiftMealDate("2026-03-31", { months: -1 })).toBe("2026-02-28");
  expect(shiftMealDate("2024-03-31", { months: -1 })).toBe("2024-02-29");
  expect(shiftMealDate("2026-12-25", { days: 15 })).toBe("2027-01-09");
});

test("calendar starts Monday and includes only dates in its month", () => {
  expect(getMealCalendarDates("2026-10").slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
  expect(getMealCalendarDates("2026-10").at(-1)).toBe("2026-10-31");
  expect(shiftMealCalendarMonth("2026-12", 1)).toBe("2027-01");
});

test("week strip starts Monday and spans month boundaries", () => {
  expect(getMealWeekDates("2026-10-20")).toEqual([
    "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25",
  ]);
  expect(getMealWeekDates("2026-09-20")).toEqual([
    "2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20",
  ]);
});

test("week navigation lands on the nearest allowed day in a partial boundary week", () => {
  expect(shiftMealWeek("2026-09-21", -1, "2026-09-20", "2026-11-04")).toBe("2026-09-20");
  expect(shiftMealWeek("2026-10-30", 1, "2026-09-20", "2026-11-04")).toBe("2026-11-04");
  expect(shiftMealWeek("2026-09-20", -1, "2026-09-20", "2026-11-04")).toBeNull();
  expect(shiftMealWeek("2026-11-04", 1, "2026-09-20", "2026-11-04")).toBeNull();
});
