import { ui } from "./ui-text.js";
import { durationParts } from "../domain/time";

export function formatShortDuration(seconds) {
  const { hours, minutes, seconds: remainder } = durationParts(
    Math.abs(seconds),
  );
  const parts = [];
  if (hours) parts.push(`${hours} ${ui.hourShort}`);
  if (minutes) parts.push(`${minutes} ${ui.minuteShort}`);
  if (remainder || parts.length === 0)
    parts.push(`${remainder} ${ui.secondShort}`);
  return parts.join(" ");
}
