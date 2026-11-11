import { PLAN_LIMITS, type PlanTime } from "./work-plan";

// Accept the colon format and four digits for numeric phone keyboards.
export function parsePlanClock(input: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$|^(\d{2})(\d{2})$/.exec(input.trim());
  if (!match) return null;
  const hour = Number(match[1] ?? match[3]);
  const minute = Number(match[2] ?? match[4]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

export function planClockInputState(input: string): "empty" | "incomplete" | "complete" | "invalid" {
  if (!input) return "empty";
  const match = /^(\d{0,2}):(\d{0,2})$/.exec(input);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return "invalid";
  return match[1].length === 2 && match[2].length === 2 ? "complete" : "incomplete";
}

export function planClockTimes(time: PlanTime | undefined, requiredSeconds: number) {
  if (!time) return null;
  const duration = planDisplayMinutes(requiredSeconds, "required");
  const entry = time.anchor === "entry" ? time.minute : time.minute - duration;
  const exit = time.anchor === "exit" ? time.minute : time.minute + duration;
  function clock(minutes: number) {
    const minute = ((minutes % 1440) + 1440) % 1440;
    return { value: `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`, dayOffset: Math.floor(minutes / 1440) };
  }
  return { entry: clock(entry), exit: clock(exit) };
}

export function planDisplayMinutes(seconds: number, kind: "required" | "recorded"): number {
  return kind === "required" ? Math.ceil(seconds / 60) : Math.floor(seconds / 60);
}

function wholePlanMinutes(hours: string, minutes = "0"): number | null {
  // Keep decimal input exact when checking for whole minutes.
  const [wholeHours, fractionalHours = ""] = hours.replace(",", ".").split(".");
  const [wholeMinutes, fractionalMinutes = ""] = minutes.replace(",", ".").split(".");
  const precision = Math.max(fractionalHours.length, fractionalMinutes.length);
  const scale = 10n ** BigInt(precision);
  const hourUnits = BigInt(wholeHours + fractionalHours.padEnd(precision, "0"));
  const minuteUnits = BigInt(wholeMinutes + fractionalMinutes.padEnd(precision, "0"));
  const total = hourUnits * 60n + minuteUnits;
  if (total % scale !== 0n || total > BigInt(PLAN_LIMITS.maxDailyMinutes) * scale) return null;
  return Number(total / scale);
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
    return wholePlanMinutes(value);
  }
  const part = /^(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|saat|sa|h|minutes?|mins?|min|dakika|dak|dk|m)/;
  let position = 0;
  let hours: string | undefined;
  let minutes: string | undefined;
  while (position < value.length) {
    const match = part.exec(value.slice(position));
    if (!match) return null;
    const isHour = /^(hours?|hrs?|h|saat|sa)$/.test(match[2]);
    if (isHour ? hours !== undefined : minutes !== undefined) return null;
    if (isHour) hours = match[1];
    else minutes = match[1];
    position += match[0].length;
    while (value[position] === " ") position++;
  }
  return wholePlanMinutes(hours ?? "0", minutes);
}

export function stepPlanDuration(minutes: number, direction: -1 | 1): number {
  const step = PLAN_LIMITS.stepMinutes;
  return direction > 0
    ? Math.min(PLAN_LIMITS.maxDailyMinutes, Math.floor(minutes / step + 1) * step)
    : Math.max(0, Math.ceil(minutes / step - 1) * step);
}
