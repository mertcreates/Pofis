import { createHash } from "node:crypto";

export function notificationSession(session: { expiresAt: number; client: { self: { pofiKey: string } } }) {
  return { accountId: createHash("sha256").update(JSON.stringify(["pofis:notifications:v1", session.client.self.pofiKey])).digest("hex"),
    expiresAt: session.expiresAt };
}
