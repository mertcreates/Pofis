import { createHash } from "node:crypto";
import { pofiNotebook } from "../lib/pofi-notes";

export function pofiNotesForWeek(today, sourcePersonId) {
  if (typeof sourcePersonId !== "string" || !sourcePersonId.trim()) {
    throw new Error("Missing authenticated PDKS person identifier");
  }
  const key = createHash("sha256")
    .update(`pofis:pofi-notes:v1:${sourcePersonId}`)
    .digest("hex");
  return pofiNotebook.notesForWeek(today, key);
}
