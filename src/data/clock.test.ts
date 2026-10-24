import { expect, test } from "bun:test";
import { startClock, type ClockCadence } from "./clock";

function fixture(cadence: ClockCadence, initial: string) {
  let now = Date.parse(initial);
  let visible = true;
  let pending: (() => void) | undefined;
  let delay = 0;
  let scheduled = 0;
  const ticks: number[] = [];
  const clock = startClock(at => ticks.push(at), cadence, {
    now: () => now,
    isVisible: () => visible,
    setTimer: ((callback: () => void, ms: number) => {
      scheduled++;
      pending = callback;
      delay = ms;
      return scheduled;
    }) as unknown as typeof setTimeout,
    clearTimer: (() => { pending = undefined; }) as typeof clearTimeout,
  });
  return {
    clock, ticks,
    get delay() { return delay; },
    get pending() { return pending !== undefined; },
    get scheduled() { return scheduled; },
    visible(value: boolean) { visible = value; },
    at(value: string) { now = Date.parse(value); },
    fire() { const callback = pending; pending = undefined; callback?.(); },
  };
}

test("day clock schedules Istanbul midnight and catches up after a hidden tab", () => {
  const f = fixture("day", "2026-10-18T23:59:58+03:00");
  expect(f.delay).toBe(2000);
  f.at("2026-10-19T00:00:00+03:00");
  f.fire();
  expect(f.ticks.at(-1)).toBe(Date.parse("2026-10-19T00:00:00+03:00"));
  expect(f.delay).toBe(24 * 60 * 60 * 1000);
  f.visible(false);
  f.clock.wake();
  expect(f.pending).toBe(false);
  f.at("2026-10-20T00:00:00+03:00");
  f.fire();
  expect(f.ticks).toHaveLength(2);
  f.visible(true);
  f.at("2026-10-20T09:30:00+03:00");
  f.clock.wake();
  expect(f.ticks.at(-1)).toBe(Date.parse("2026-10-20T09:30:00+03:00"));
  expect(f.delay).toBe(14.5 * 60 * 60 * 1000);
  f.clock.stop();
  expect(f.pending).toBe(false);
});

test("second clock reads elapsed wall time, pauses hidden output and cleans up", () => {
  const f = fixture("second", "2026-10-15T12:00:00+03:00");
  expect(f.delay).toBe(1000);
  f.at("2026-10-15T12:00:07+03:00");
  f.fire();
  expect(f.ticks[1] - f.ticks[0]).toBe(7000);
  f.visible(false);
  f.fire();
  expect(f.ticks).toHaveLength(2);
  expect(f.pending).toBe(false);
  const hiddenCount = f.scheduled;
  for (let index = 0; index < 60; index++) f.fire();
  expect(f.scheduled).toBe(hiddenCount);
  f.visible(true);
  f.clock.wake();
  expect(f.pending).toBe(true);
  f.clock.stop();
  const count = f.scheduled;
  f.clock.wake();
  expect(f.scheduled).toBe(count);
  expect(f.pending).toBe(false);
});
