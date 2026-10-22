import { PLAN_LIMITS } from "./work-plan";

export function planDisplayMinutes(seconds: number, kind: "required" | "recorded"): number {
  return kind === "required" ? Math.ceil(seconds / 60) : Math.floor(seconds / 60);
}

// A bare number denotes hours. Unit-bearing parts can be entered in either order.
export function parsePlanDuration(input: string): number | null {
  const value = input.trim().toLocaleLowerCase("tr-TR");
  if (!value) return null;
  const clock = /^(\d{1,2}):(\d{1,2})$/.exec(value);
  if (clock) {
    const minutes = Number(clock[1]) * 60 + Number(clock[2]);
    return Number(clock[2]) < 60 && minutes <= PLAN_LIMITS.maxDailyMinutes ? minutes : null;
  }
  if (/^\d+(?:[.,]\d+)?$/.test(value)) {
    const minutes = Number(value.replace(",", ".")) * 60;
    return Number.isInteger(minutes) && minutes <= PLAN_LIMITS.maxDailyMinutes ? minutes : null;
  }
  const part = /^(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|saat|sa|h|minutes?|mins?|min|dakika|dak|dk|m)/;
  let position = 0;
  let total = 0;
  let hours = false;
  let minutes = false;
  while (position < value.length) {
    const match = part.exec(value.slice(position));
    if (!match) return null;
    const count = Number(match[1].replace(",", "."));
    const isHour = /^(hours?|hrs?|h|saat|sa)$/.test(match[2]);
    if (isHour ? hours : minutes) return null;
    if (isHour) hours = true;
    else minutes = true;
    total += count * (isHour ? 60 : 1);
    position += match[0].length;
    while (value[position] === " ") position++;
  }
  return Number.isInteger(total) && total <= PLAN_LIMITS.maxDailyMinutes ? total : null;
}

export function stepPlanDuration(minutes: number, direction: -1 | 1): number {
  const step = PLAN_LIMITS.stepMinutes;
  return direction > 0
    ? Math.min(PLAN_LIMITS.maxDailyMinutes, Math.floor(minutes / step + 1) * step)
    : Math.max(0, Math.ceil(minutes / step - 1) * step);
}
