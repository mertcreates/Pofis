import { createHash } from "node:crypto";

export function analyticsUserIdForAccount(accountKey: string): string {
  if (typeof accountKey !== "string" || !accountKey.trim()) {
    throw new Error("Missing analytics account key");
  }
  return `pofis_ga_v1_${createHash("sha256")
    .update(JSON.stringify(["pofis:analytics-user:v1", accountKey]))
    .digest("hex")}`;
}
