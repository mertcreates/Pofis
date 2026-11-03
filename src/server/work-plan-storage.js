import { createHash, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { format, join } from "node:path";
import { emptyWorkPlans } from "../domain/rules/work-plan";
import { isAccountKey } from "../domain/rules/account-identity";
import { readStoredPlans } from "../lib/plan-storage.js";
import { ui } from "../lib/ui-text.js";
import { PdksError } from "./pdks.js";
import { validPlanHash } from "./work-plan-identity.js";

// Object ordering must not turn identical plans into conflicting revisions.
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])]));
}

function snapshot(raw) {
  const canonical = JSON.stringify(sorted(readStoredPlans(raw)));
  return {
    plans: JSON.parse(canonical),
    revision: createHash("sha256").update(canonical).digest("hex"),
    canonical,
  };
}

export function createWorkPlanStorage(directory, { files = { chmod, mkdir, readFile, rename, rm, writeFile } } = {}) {
  const pending = new Map();
  let ready;

  function file(accountKey) {
    if (!isAccountKey(accountKey)) throw new Error(ui.apiErrors.requestFailed);
    // Runtime JSON paths must not be treated as a project-wide Turbopack glob.
    return format({ dir: directory, name: accountKey, ext: ".json" });
  }

  function serialize(accountKey, action) {
    file(accountKey);
    const result = (pending.get(accountKey) || Promise.resolve()).then(action);
    const settled = result.catch(() => {}).finally(() => {
      if (pending.get(accountKey) === settled) pending.delete(accountKey);
    });
    pending.set(accountKey, settled);
    return result;
  }

  function prepare() {
    return (ready ||= files.mkdir(directory, { recursive: true, mode: 0o700 })
      .then(() => files.chmod(directory, 0o700))
      .catch(error => { ready = null; throw error; }));
  }

  async function read(accountKey) {
    let raw;
    try {
      raw = await files.readFile(file(accountKey), "utf8");
    } catch (error) {
      if (error.code === "ENOENT") return snapshot(JSON.stringify(emptyWorkPlans()));
      throw new PdksError(ui.notificationErrors.plansUnreadable, "PLAN_READ_FAILED", 500);
    }
    try {
      return snapshot(raw);
    } catch {
      throw new PdksError(ui.planStorageErrors.plan, "PLAN_READ_FAILED", 500);
    }
  }

  return {
    load(accountKey, assertActive) {
      return serialize(accountKey, async () => {
        assertActive();
        const current = await read(accountKey);
        assertActive();
        return { plans: current.plans, revision: current.revision };
      });
    },
    save(accountKey, plans, revision, { assertActive, commit }) {
      // Capture and validate the input before it enters the queue.
      let next;
      try { next = snapshot(JSON.stringify(plans)); }
      catch { throw new PdksError(ui.validationErrors.workPlan, "INVALID_INPUT", 400); }
      if (!validPlanHash(revision)) throw new PdksError(ui.apiErrors.requestUnreadable, "INVALID_INPUT", 400);
      return serialize(accountKey, async () => {
        assertActive();
        const current = await read(accountKey);
        if (current.revision !== revision)
          throw new PdksError(ui.apiErrors.requestFailed, "PLAN_CONFLICT", 409);
        const temporary = join(directory, `${randomBytes(16).toString("hex")}.tmp`);
        try {
          await prepare();
          await files.writeFile(temporary, next.canonical, { mode: 0o600, flag: "wx" });
          assertActive();
          await commit(() => files.rename(temporary, file(accountKey)));
        } catch (error) {
          if (error instanceof PdksError) throw error;
          throw new PdksError(ui.apiErrors.requestFailed, "PLAN_WRITE_FAILED", 500);
        } finally {
          try { await files.rm(temporary, { force: true }); }
          catch (error) { console.error(ui.serverDiagnostics.pdksApiUnexpectedError, error.code || error.name); }
        }
        return { plans: next.plans, revision: next.revision };
      });
    },
  };
}
