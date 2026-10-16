import { TIME_ZONE, addDays } from "./rules/calendar";
const clockFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const minuteFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(
    Object.entries(options).sort(([a], [b]) => a.localeCompare(b)),
  );
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("tr-TR", {
      ...options,
      timeZone: TIME_ZONE,
    });
    // Bound the cache if callers introduce additional format combinations.
    if (dateFormatters.size >= 32) dateFormatters.clear();
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" },
): string {
  return dateFormatter(options).format(new Date(`${date}T12:00:00Z`));
}

export function weekLabel(
  start: string,
  short = false,
  today?: string,
): string {
  const end = addDays(start, 6);
  const showYear =
    today &&
    (start.slice(0, 4) !== today.slice(0, 4) ||
      end.slice(0, 4) !== today.slice(0, 4));
  return dateFormatter({
    day: "numeric",
    month: short ? "short" : "long",
    ...(showYear ? { year: "numeric" } : {}),
  }).formatRange(new Date(`${start}T12:00:00Z`), new Date(`${end}T12:00:00Z`));
}

export function formatClock(at: number | null, seconds = true): string {
  if (at === null || !Number.isFinite(new Date(at).getTime())) return "–";
  return (seconds ? clockFormatter : minuteFormatter).format(at);
}

export function durationParts(seconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const total = Math.max(0, Math.floor(seconds));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
  };
}

export function durationText(seconds: number, includeSeconds = true): string {
  const p = durationParts(seconds);
  return `${p.hours} sa ${String(p.minutes).padStart(2, "0")} dk${includeSeconds ? ` ${String(p.seconds).padStart(2, "0")} sn` : ""}`;
}

export function durationClock(seconds: number): string {
  const p = durationParts(seconds);
  return [p.hours, p.minutes, p.seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
