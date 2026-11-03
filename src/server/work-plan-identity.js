import { createHash } from "node:crypto";
import { ui } from "../lib/ui-text.js";

export function validPlanHash(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function workPlanSessionId(session) {
  if (!validPlanHash(session?.id)) throw new Error(ui.apiErrors.requestFailed);
  return createHash("sha256")
    .update(JSON.stringify(["pofis:work-plan-session:v1", session.id]))
    .digest("hex");
}
