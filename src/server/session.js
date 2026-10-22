import { REPORT_ACCESS, reportRangeIssue } from "../domain/rules/report-access";
import { homedir } from "node:os";
import { join } from "node:path";
import { createSessionManager } from "./session-manager.js";
import { createSessionStorage } from "./session-storage.js";
import { PdksError } from "./pdks.js";
import { ui } from "../lib/ui-text.js";
export {
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "./session-manager.js";

// A new identity contract must also replace cached clients and their login factory.
const key = Symbol.for("pofis.session-manager:account-key-v1");
function manager() {
  return (globalThis[key] ||= createSessionManager({
    storage: createSessionStorage(
      process.env.POFIS_SESSION_DIR || join(homedir(), ".pofis", "sessions"),
    ),
  }));
}
export async function sessionFor(request) {
  const session = await manager().sessionFor(request);
  // Next dev can retain a manager created before the account-key contract changed.
  if (
    typeof session?.client.self?.pofiKey !== "string" ||
    !session.client.self.pofiKey.trim()
  ) return null;
  return session;
}
export async function requireSession(request) {
  const session = await sessionFor(request);
  if (!session)
    throw new PdksError(ui.apiErrors.sessionRequired, "SESSION_EXPIRED", 401);
  return session;
}
export const replaceSession = (request, body) =>
  manager().replaceSession(request, body);
export const disconnect = (request) => manager().disconnect(request);
export const assertSessionActive = (session) => manager().assertActive(session);
export const heartbeat = (request) => manager().heartbeat(request);

export function validDates(from, to) {
  const issue = reportRangeIssue(from, to);
  if (issue)
    throw new PdksError(
      issue === "too-long"
        ? ui.apiErrors.dateRangeTooLong(REPORT_ACCESS.maxDays)
        : ui.apiErrors.invalidDateRange,
      "INVALID_INPUT",
      400,
    );
}
