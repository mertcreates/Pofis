import { ui } from "../lib/ui-text.js";
import { pofiNotebook } from "../lib/pofi-notes";

export function pofiNotesForWeek(today, accountKey) {
  if (typeof accountKey !== "string" || !accountKey.trim()) {
    throw new Error(ui.internalErrors.missingPofiAccountKey);
  }
  return pofiNotebook.notesForWeek(today, accountKey);
}
