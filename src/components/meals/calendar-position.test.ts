import { expect, test } from "bun:test";
import { getMealCalendarHeight, getMealCalendarPosition } from "./calendar-position";

test("calendar height includes its border without adding a false scroll range", () => {
  expect(getMealCalendarHeight({ offsetHeight: 366, scrollHeight: 364, clientHeight: 364 })).toBe(366);
});

test("calendar height recovers the full size when a viewport cap is already scrolling", () => {
  expect(getMealCalendarHeight({ offsetHeight: 300, scrollHeight: 364, clientHeight: 298 })).toBe(366);
});

test("calendar escapes the dialog bounds and stays inside the viewport", () => {
  expect(getMealCalendarPosition(
    { left: 300, top: 40, bottom: 64 },
    { width: 340, height: 380 },
    { width: 390, height: 800 },
  )).toEqual({ top: 72, left: 38, maxHeight: 380 });
});

test("calendar opens above a low trigger when there is more room above", () => {
  expect(getMealCalendarPosition(
    { left: 10, top: 540, bottom: 564 },
    { width: 340, height: 380 },
    { width: 390, height: 600 },
  )).toEqual({ top: 152, left: 12, maxHeight: 380 });
});

test("narrow viewports clamp the calendar size and keep all edges visible", () => {
  const position = getMealCalendarPosition(
    { left: 4, top: 108, bottom: 132 },
    { width: 312, height: 400 },
    { width: 320, height: 260 },
  );

  expect(position).toEqual({ top: 140, left: 4, maxHeight: 108 });
  expect(position.left + 312).toBeLessThanOrEqual(320);
  expect(position.top + position.maxHeight).toBeLessThanOrEqual(248);
});
