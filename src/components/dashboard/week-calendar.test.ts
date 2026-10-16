import { expect, test } from "bun:test";
import { monthWeeks, shiftMonth } from "./week-calendar";

test("month navigation anchors short months and crosses years", () => {
  expect(shiftMonth("2026-01-31", 1)).toBe("2026-02-01");
  expect(shiftMonth("2026-12-01", 1)).toBe("2027-01-01");
  expect(shiftMonth("2026-01-01", -1)).toBe("2025-12-01");
});
test("month picker includes intersecting weeks across leap and year boundaries", () => {
  expect(monthWeeks("2024-02-01")).toEqual([
    "2024-01-29",
    "2024-02-05",
    "2024-02-12",
    "2024-02-19",
    "2024-02-26",
  ]);
  expect(monthWeeks("2026-10-01")).toEqual([
    "2026-09-28",
    "2026-10-05",
    "2026-10-12",
    "2026-10-19",
    "2026-10-26",
  ]);
  expect(monthWeeks("2027-01-01")[0]).toBe("2026-12-28");
});
