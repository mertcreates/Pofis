import { pofiNotebook } from "../lib/pofi-notes";

export function pofiNotesForWeek(today, accountKey) {
  if (typeof accountKey !== "string" || !accountKey.trim()) {
    throw new Error("Missing Pofi account key");
  }
  return pofiNotebook.notesForWeek(today, accountKey);
}
