import { clockSeconds } from "./calendar";
export const POFI_SURPRISES = Object.freeze({
  revealTaps: 3,
  versionRevealTaps: 5,
  versionWindowMs: 5_000,
  idleMs: 20_000,
  callWord: "pofi",
  callVisibleMs: 5_000,
  specialMinuteSeconds: 12 * 3600 + 34 * 60,
});
export function specialMinuteRemaining(openedAt: number): number {
  const seconds = clockSeconds(openedAt);
  if (
    seconds === null ||
    Math.floor(seconds / 60) !== POFI_SURPRISES.specialMinuteSeconds / 60
  )
    return 0;
  return 60_000 - (openedAt % 60_000);
}
export function nextSurpriseTap(count: number): number {
  return Math.min(count + 1, POFI_SURPRISES.revealTaps);
}
