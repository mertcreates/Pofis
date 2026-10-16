import { ui } from "./ui-text.js";
export function formatShortDuration(seconds) {
  const total = Math.floor(Math.abs(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  const parts = [];
  if (hours) parts.push(`${hours} ${ui.hourShort}`);
  if (minutes) parts.push(`${minutes} ${ui.minuteShort}`);
  if (remainder || parts.length === 0)
    parts.push(`${remainder} ${ui.secondShort}`);
  return parts.join(" ");
}
