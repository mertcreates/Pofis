import { clockSeconds, dateKey } from "./calendar";

export type ClockSurpriseKind =
  | "dateTime"
  | "fourSame"
  | "sequence"
  | "mirror"
  | "matching"
  | "pairs"
  | "double"
  | "consecutive";

type ClockMinute = { hour: number; minute: number };

export const POFI_SURPRISES = Object.freeze({
  revealTaps: 3,
  versionRevealTaps: 5,
  versionWindowMs: 5_000,
  idleMs: 20_000,
  callWord: "pofi",
  meowWord: "miyav",
  callVisibleMs: 5_000,
});

function clockMinute(at: number): ClockMinute | null {
  if (!Number.isFinite(at) || !Number.isFinite(new Date(at).getTime())) return null;
  const seconds = clockSeconds(at);
  if (seconds === null) return null;
  return {
    hour: Math.floor(seconds / 3600),
    minute: Math.floor(seconds / 60) % 60,
  };
}

function isMirrorClock({ hour, minute }: ClockMinute): boolean {
  return Math.floor(hour / 10) === minute % 10 && hour % 10 === Math.floor(minute / 10);
}

export function clockSurpriseAt(now: number): ClockSurpriseKind | null {
  const clock = clockMinute(now);
  if (!clock) return null;
  const { hour, minute } = clock;
  const hourTens = Math.floor(hour / 10);
  const hourOnes = hour % 10;
  const minuteTens = Math.floor(minute / 10);
  const minuteOnes = minute % 10;

  // The first match wins; keep this order aligned with the surprise contract.
  if (hour === minute) {
    const date = dateKey(now);
    const month = Number(date.slice(5, 7));
    const day = Number(date.slice(8, 10));
    if (day === month && day === hour) return "dateTime";
  }
  if (hourTens === hourOnes && hourOnes === minuteTens && minuteTens === minuteOnes)
    return "fourSame";
  if (hourOnes === hourTens + 1 && minuteTens === hourOnes + 1 && minuteOnes === minuteTens + 1)
    return "sequence";
  if (isMirrorClock(clock)) return "mirror";
  if (hour === minute) return "matching";
  if (hourTens === hourOnes && minuteTens === minuteOnes) return "pairs";
  if (hour > 0 && minute === hour * 2) return "double";
  if (minute === hour + 1) return "consecutive";
  return null;
}

export function hasMirroredRecords(firstEntry: number | null, lastExit: number | null): boolean {
  if (firstEntry === null || lastExit === null || lastExit < firstEntry) return false;
  const entry = clockMinute(firstEntry);
  const exit = clockMinute(lastExit);
  return entry !== null && exit !== null && isMirrorClock(entry) && isMirrorClock(exit);
}

export function nextSurpriseTap(count: number): number {
  return Math.min(count + 1, POFI_SURPRISES.revealTaps);
}
