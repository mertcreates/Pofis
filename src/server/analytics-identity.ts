import { ui } from "../lib/ui-text.js";
import { createHash } from "node:crypto";

export function analyticsUserIdForAccount(accountKey: string): string {
  if (typeof accountKey !== "string" || !accountKey.trim()) {
    throw new Error(ui.internalErrors.missingAnalyticsAccountKey);
  }
  return `pofis_ga_v1_${createHash("sha256")
    .update(JSON.stringify(["pofis:analytics-user:v1", accountKey]))
    .digest("hex")}`;
}
