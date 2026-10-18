import { addDays, dateKey, sourceTimestamp } from "@/domain/rules/calendar";

export type ClockCadence = "second" | "day";

export function startClock(onTick: (now: number) => void, cadence: ClockCadence, {
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  isVisible = () => document.visibilityState === "visible",
} = {}) {
  let timer: ReturnType<typeof setTimeout>;
  let stopped = false;

  function wake() {
    if (stopped) return;
    clearTimer(timer);
    const at = now();
    if (isVisible()) onTick(at);
    const delay = cadence === "second" ? 1000
      : sourceTimestamp(addDays(dateKey(at), 1), "00:00:00")! - at;
    timer = setTimer(wake, delay);
  }
  wake();
  return {
    wake,
    stop() {
      stopped = true;
      clearTimer(timer);
    },
  };
}
