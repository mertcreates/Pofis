import { ui } from "../../lib/ui-text.js";
export const TIME_ZONE = "Europe/Istanbul";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const zonedFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function sourceTimestamp(
  date: string,
  clock: string | null,
): number | null {
  if (!clock || !isDateKey(date) || secondsOf(clock) === null) return null;
  const local = Date.parse(`${date}T${clock}Z`);
  let candidate = local;
  // Resolve the offset at the actual instant; skipped local clocks never match.
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = zonedFormatter.formatToParts(candidate);
    const part = (name: string) =>
      parts.find((item) => item.type === name)!.value;
    const formatted = Date.parse(
      `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}Z`,
    );
    if (formatted === local) return candidate;
    candidate += local - formatted;
  }
  return null;
}

export function dateKey(at: Date | number): string {
  const parts = dateFormatter.formatToParts(at);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function addDays(date: string, days: number): string {
  if (!isDateKey(date) || !Number.isInteger(days))
    throw new Error(ui.validationErrors.calendarDay);
  const at = new Date(`${date}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

export function weekday(date: string): number {
  if (!isDateKey(date)) throw new Error(ui.validationErrors.calendarDay);
  return (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
}

export function weekStart(date: string): string {
  return addDays(date, -weekday(date));
}
export function weekDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const sourceClockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
export function clockSeconds(at: Date | number): number | null {
  return secondsOf(sourceClockFormatter.format(at));
}
export function secondsOf(time: unknown): number | null {
  if (typeof time !== "string" || !/^\d{2}:\d{2}:\d{2}$/.test(time))
    return null;
  const [hours, minutes, seconds] = time.split(":").map(Number);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}
