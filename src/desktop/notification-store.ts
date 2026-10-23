import { ui } from "../lib/ui-text.js";
import { readFile, mkdir, writeFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { defaultNotificationPreferences, readNotificationPreferences, type NotificationPreferences } from "@/domain/rules/notifications";

export type Delivery = { state: "pending" | "accepted" | "failed" | "unknown"; attempts: number; retryAt: number; error?: string };
export type NotificationAccount = {
  version: 1;
  preferences: NotificationPreferences;
  preferencesRevision?: number;
  telegram?: string;
  deliveries: Record<string, Delivery>;
};
export type NotificationStore = { load(accountId: string): Promise<NotificationAccount>; save(accountId: string, value: NotificationAccount): Promise<void> };
export const emptyNotificationAccount = (): NotificationAccount => ({ version: 1, preferences: defaultNotificationPreferences(), deliveries: {} });

export function createNotificationStore(directory: string): NotificationStore {
  let tail = Promise.resolve();
  function path(accountId: string) {
    if (!/^[a-f0-9]{64}$/.test(accountId)) throw new Error(ui.notificationErrors.invalidAccount);
    return join(directory, `${accountId}.json`);
  }
  return {
    async load(accountId) {
      await tail;
      let raw;
      try { raw = await readFile(path(accountId), "utf8"); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyNotificationAccount();
        throw new Error(ui.notificationErrors.settingsUnreadable);
      }
      try {
        const value = JSON.parse(raw) as NotificationAccount;
        if (value.version !== 1 || (value.telegram !== undefined && typeof value.telegram !== "string") ||
            (value.preferencesRevision !== undefined && (!Number.isSafeInteger(value.preferencesRevision) || value.preferencesRevision < 0)) ||
            !value.deliveries || typeof value.deliveries !== "object" || Array.isArray(value.deliveries)) throw new Error();
        const preferences = readNotificationPreferences(value.preferences);
        for (const [key, entry] of Object.entries(value.deliveries)) {
          if (!/^\d{4}-\d{2}-\d{2}:(approaching|reached):(native|telegram)$/.test(key) || !entry ||
              !["pending", "accepted", "failed", "unknown"].includes(entry.state) ||
              !Number.isInteger(entry.attempts) || entry.attempts < 1 || !Number.isFinite(entry.retryAt)) throw new Error();
          // A crash after reserving a send cannot establish whether the provider accepted it.
          if (entry.state === "pending") entry.state = "unknown";
        }
        return { ...value, preferences };
      } catch { throw new Error(ui.notificationErrors.invalidSettings); }
    },
    save(accountId, value) {
      const destination = path(accountId);
      const raw = JSON.stringify(value);
      const run = tail.then(async () => {
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const temporary = join(directory, `${randomUUID()}.tmp`);
        try {
          await writeFile(temporary, raw, { mode: 0o600 });
          await rename(temporary, destination);
        } finally {
          await unlink(temporary).catch(error => {
            if (error.code !== "ENOENT") console.warn(ui.diagnostics.notificationCleanupFailed);
          });
        }
      });
      tail = run.catch(() => {}); // The caller receives the error; later writes can still recover.
      return run;
    },
  };
}
