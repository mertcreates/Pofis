import { reportRangeIssue } from "../domain/rules/report-access";
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

const key = Symbol.for("pofis.session-manager");
function manager() {
  return (globalThis[key] ||= createSessionManager({
    storage: createSessionStorage(
      process.env.POFIS_SESSION_DIR || join(homedir(), ".pofis", "sessions"),
    ),
  }));
}
export const sessionFor = (request) => manager().sessionFor(request);
export const requireSession = (request) => manager().requireSession(request);
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
        ? ui.apiErrors.dateRangeTooLong
        : ui.apiErrors.invalidDateRange,
      "INVALID_INPUT",
      400,
    );
}
