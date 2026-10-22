import { ui } from "../lib/ui-text.js";
import { SESSION_POLICY } from "../domain/rules/session-policy";
import {
  mkdir,
  chmod,
  readFile,
  writeFile,
  rename,
  rm,
  opendir,
} from "node:fs/promises";
import { join, format } from "node:path";
import { randomBytes } from "node:crypto";

export const validSessionId = (id) =>
  typeof id === "string" &&
  id.length === SESSION_POLICY.tokenBytes * 2 &&
  /^[a-f0-9]+$/.test(id);

export function createSessionStorage(directory) {
  const pending = new Map();
  let ready;
  // These JSON files are runtime state. A dynamic path.join(..., `${id}.json`)
  // is treated as a project-wide JSON asset glob by Turbopack.
  const sessionFile = (id) => format({ dir: directory, name: id, ext: ".json" });
  function serialize(id, action) {
    if (!validSessionId(id))
      return Promise.reject(new Error(ui.internalErrors.invalidSessionId));
    const result = (pending.get(id) || Promise.resolve()).then(action);
    // The caller receives failures; the internal queue remains usable for logout/retry.
    const settled = result
      .catch(() => {})
      .finally(() => {
        if (pending.get(id) === settled) pending.delete(id);
      });
    pending.set(id, settled);
    return result;
  }
  function prepare() {
    return (ready ||= mkdir(directory, { recursive: true, mode: 0o700 })
      .then(() => chmod(directory, 0o700))
      .catch((error) => {
        ready = null;
        throw error;
      }));
  }
  return {
    async read(id) {
      if (!directory || !validSessionId(id)) return null;
      return serialize(id, async () => {
        let text;
        try {
          text = await readFile(sessionFile(id), "utf8");
        } catch (error) {
          if (error.code === "ENOENT") return null;
          throw error;
        }
        try {
          const record = JSON.parse(text);
          if (
            record.version !== 1 ||
            !Number.isFinite(record.expiresAt) ||
            !record.jar ||
            !record.self
          )
            throw new Error(ui.internalErrors.invalidSessionRecord);
          return record;
        } catch {
          console.error(
            ui.serverDiagnostics.invalidPdksSessionRecordReauthenticationRequired,
          );
          return null;
        }
      });
    },
    async save(id, record) {
      if (!directory) return;
      // Capture before entering the queue so later caller mutations cannot alter this write.
      const text = JSON.stringify({ ...record, version: 1 });
      return serialize(id, async () => {
        await prepare();
        const temporary = join(
          directory,
          `${id}.${randomBytes(8).toString("hex")}.tmp`,
        );
        try {
          await writeFile(temporary, text, { mode: 0o600, flag: "wx" });
          await rename(temporary, sessionFile(id));
        } finally {
          await rm(temporary, { force: true });
        }
      });
    },
    async pruneExpired(now) {
      if (!directory) return;
      let entries;
      try {
        entries = await opendir(directory);
      } catch (error) {
        if (error.code === "ENOENT") return;
        throw error;
      }
      for await (const file of entries) {
        const id = file.name.replace(/\.json$/, "");
        if (!file.isFile() || file.name !== `${id}.json` || !validSessionId(id))
          continue;
        const record = await this.read(id);
        if (record && record.expiresAt <= now) await this.remove(id);
      }
    },
    async remove(id) {
      if (directory && validSessionId(id))
        return serialize(id, () =>
          rm(sessionFile(id), { force: true }),
        );
    },
  };
}
