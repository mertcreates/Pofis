import { expect, test } from "bun:test";
import { tooltipPosition } from "./tooltip-position";

test("centers above an anchor with enough room", () => {
  expect(tooltipPosition({ left: 120, top: 100, width: 40, height: 20 }, { width: 100, height: 40 }, { width: 400, height: 300 })).toEqual({ left: 90, top: 52, side: "top" });
});
test("flips below near the top edge", () => {
  expect(tooltipPosition({ left: 120, top: 4, width: 40, height: 20 }, { width: 100, height: 40 }, { width: 400, height: 300 })).toMatchObject({ top: 32, side: "bottom" });
});
test("clamps both horizontal edges on a narrow screen", () => {
  const viewport = { width: 320, height: 600 };
  const tip = { width: 240, height: 50 };
  expect(tooltipPosition({ left: 0, top: 100, width: 20, height: 20 }, tip, viewport).left).toBe(8);
  expect(tooltipPosition({ left: 300, top: 100, width: 20, height: 20 }, tip, viewport).left).toBe(72);
});
test("clamps tall tooltips inside the viewport", () => {
  const result = tooltipPosition({ left: 100, top: 120, width: 30, height: 20 }, { width: 200, height: 280 }, { width: 320, height: 300 });
  expect(result.top).toBeGreaterThanOrEqual(8);
  expect(result.top + 280).toBeLessThanOrEqual(292);
});
