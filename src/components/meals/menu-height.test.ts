import { afterEach, expect, test } from "bun:test";
import { preserveMealHeight } from "./menu-height";

const originalObserver = globalThis.ResizeObserver;
afterEach(() => { globalThis.ResizeObserver = originalObserver; });

function fixture(initialWidth = 480, initialHeight = 320) {
  let bounds = { width: initialWidth, height: initialHeight };
  let update = () => {};
  let observed: Element | null = null;
  let disconnected = false;
  globalThis.ResizeObserver = class {
    constructor(callback: () => void) { update = callback; }
    observe(element: Element) { observed = element; }
    disconnect() { disconnected = true; }
  } as unknown as typeof ResizeObserver;
  const style = { minHeight: "", removeProperty() { this.minHeight = ""; } };
  const viewport = { style } as unknown as HTMLElement;
  const content = { getBoundingClientRect: () => bounds } as HTMLElement;
  const stop = preserveMealHeight(viewport, content);
  return {
    style, content, stop,
    observed: () => observed,
    disconnected: () => disconnected,
    resize(width: number, height: number) { bounds = { width, height }; update(); },
  };
}

test("day changes preserve space through shorter menus, loading, empty and error states", () => {
  const view = fixture();
  expect(view.observed()).toBe(view.content);
  expect(view.style.minHeight).toBe("320px");
  view.resize(480, 380.25);
  expect(view.style.minHeight).toBe("381px");
  for (const height of [320, 240, 24, 76]) {
    view.resize(480, height);
    expect(view.style.minHeight).toBe("381px");
  }
  view.stop();
});

test("a new viewport width resets the reserved height for responsive reflow", () => {
  const view = fixture(480, 380);
  view.resize(300, 540);
  expect(view.style.minHeight).toBe("540px");
  view.resize(480, 320);
  expect(view.style.minHeight).toBe("320px");
  view.stop();
});

test("a hidden dialog is measured when shown and its observer is released on close", () => {
  const view = fixture(0, 0);
  expect(view.style.minHeight).toBe("");
  view.resize(480, 320);
  expect(view.style.minHeight).toBe("320px");
  view.resize(0, 0);
  expect(view.style.minHeight).toBe("320px");
  view.stop();
  expect(view.disconnected()).toBe(true);
  expect(view.style.minHeight).toBe("");
});
