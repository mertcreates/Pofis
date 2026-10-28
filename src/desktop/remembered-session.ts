import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { SafeStorage } from "electron";
import { SESSION_POLICY } from "@/domain/rules/session-policy";
import { ApiError, api } from "@/lib/api-client.js";
import { readSessionResponse } from "@/lib/session-response.js";
import { ui } from "@/lib/ui-text.js";
import { hasSecureStorageBackend } from "./secure-storage";

type Credentials = { username: string; password: string };
type Store = ReturnType<typeof createRememberedStore>;

function storageError() {
  return new ApiError(ui.connectionFields.rememberUnavailable, 0, "REMEMBER_UNAVAILABLE", {});
}

function readCredentials(value: unknown): Credentials {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(ui.apiErrors.credentialsRequired, 400, "INVALID_INPUT", {});
  const { username, password } = value as Record<string, unknown>;
  if (typeof username !== "string" || !username.trim() || username.length > SESSION_POLICY.maxUsernameLength ||
      typeof password !== "string" || !password || password.length > SESSION_POLICY.maxPasswordLength)
    throw new ApiError(ui.apiErrors.credentialsRequired, 400, "INVALID_INPUT", {});
  return { username, password };
}

export function createRememberedStore(directory: string, storage: SafeStorage, platform = process.platform) {
  const destination = join(directory, "remembered-session.bin");
  async function available() {
    if (!hasSecureStorageBackend(storage, platform)) throw storageError();
    if (!await storage.isAsyncEncryptionAvailable()) throw storageError();
  }
  return {
    async prepare(value: unknown) {
      const credentials = readCredentials(value);
      try {
        await available();
        const encrypted = await storage.encryptStringAsync(JSON.stringify(credentials));
        // Electron 43 uses v10 for the Linux fallback; only the keyring-backed v11 is accepted.
        if (platform === "linux" && encrypted.subarray(0, 3).toString() !== "v11") throw storageError();
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const temporary = join(directory, `remembered-${randomUUID()}.tmp`);
        try { await writeFile(temporary, encrypted, { mode: 0o600, flag: "wx" }); }
        catch (error) {
          await unlink(temporary).catch(cleanup => {
            if (cleanup.code !== "ENOENT") console.warn(ui.diagnostics.rememberCleanupFailed);
          });
          throw error;
        }
        return {
          commit: () => rename(temporary, destination),
          async discard() { await unlink(temporary).catch(error => { if (error.code !== "ENOENT") throw error; }); },
        };
      } catch { throw storageError(); }
    },
    async load() {
      let encrypted: Buffer;
      try { encrypted = await readFile(destination); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw storageError();
      }
      try {
        if (encrypted.length > 16_384 || (platform === "linux" && encrypted.subarray(0, 3).toString() !== "v11")) throw storageError();
        await available();
        const decoded = await storage.decryptStringAsync(encrypted);
        const credentials = readCredentials(JSON.parse(decoded.result));
        if (decoded.shouldReEncrypt) {
          const replacement = await this.prepare(credentials);
          try { await replacement.commit(); } finally { await replacement.discard(); }
        }
        return credentials;
      } catch { throw storageError(); }
    },
    async clear() {
      try {
        await unlink(destination).catch(error => { if (error.code !== "ENOENT") throw error; });
        const files = await readdir(directory, { withFileTypes: true }).catch(error => {
          if (error.code === "ENOENT") return [];
          throw error;
        });
        for (const file of files) {
          if (!file.isFile() || !/^remembered-[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}\.tmp$/i.test(file.name)) continue;
          await unlink(join(directory, file.name)).catch(error => { if (error.code !== "ENOENT") throw error; });
        }
      } catch { throw storageError(); }
    },
  };
}

export function createRememberedSession({ store, fetch, onRecovered, onInvalid, setTimer = setTimeout, clearTimer = clearTimeout }: {
  store: Store;
  fetch: (path: string, options: RequestInit) => Promise<Response>;
  onRecovered(): void;
  onInvalid(cleanupFailed: boolean): void;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}) {
  let generation = 0;
  let stopped = false;
  let disabled = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let tail: Promise<unknown> = Promise.resolve();
  let recovering: Promise<boolean> | null = null;

  function invalidate() {
    generation++;
    if (timer) clearTimer(timer);
    timer = undefined;
    recovering = null;
    failures = 0;
  }
  function enqueue<T>(action: () => Promise<T>): Promise<T> {
    const next = tail.then(action);
    tail = next.catch(() => {}); // The caller receives the error; later operations remain usable.
    return next;
  }
  async function request(method: "GET" | "POST" | "DELETE", credentials?: Credentials) {
    const result = await api("/api/session", {
      method,
      ...(credentials ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials) } : {}),
    }, (input, options) => fetch(String(input), options ?? {}));
    return readSessionResponse(result, "/api/session", method);
  }
  function recover(force = false): Promise<boolean> {
    if (stopped || disabled) return Promise.resolve(false);
    if (recovering) return recovering;
    if (timer) return Promise.resolve(false);
    const version = generation;
    const run = enqueue(async () => {
      if (version !== generation || stopped) return false;
      if (!force && await request("GET")) return true;
      if (version !== generation || stopped) return false;
      const credentials = await store.load();
      if (!credentials || version !== generation || stopped) return false;
      try {
        await request("POST", credentials);
      } catch (error) {
        if (version !== generation || stopped) return false;
        if (error instanceof ApiError && error.code === "AUTH_FAILED" && error.status === 401) {
          disabled = true;
          let cleanupFailed = false;
          try { await store.clear(); } catch { cleanupFailed = true; }
          if (version !== generation || stopped) return false;
          onInvalid(cleanupFailed);
        }
        throw error;
      }
      if (version !== generation || stopped) return false;
      failures = 0;
      onRecovered();
      return true;
    });
    recovering = run;
    void run.catch(error => {
      if (version !== generation || stopped || disabled) return;
      failures++;
      const retryAfter = error instanceof ApiError && typeof error.details?.retryAfterMs === "number"
        ? Math.min(Math.max(error.details.retryAfterMs, 0), 2_147_483_647) : 0;
      const delay = Math.max(Math.min(30_000 * 2 ** Math.min(failures - 1, 4), 300_000), retryAfter);
      timer = setTimer(() => { timer = undefined; void recover(force).catch(() => {}); }, delay);
      // Errors are returned to the caller; a later attempt handles temporary failures.
    }).finally(() => { if (recovering === run) recovering = null; });
    return run;
  }
  return {
    recover,
    connect(input: unknown, remember: boolean) {
      invalidate();
      disabled = true;
      return enqueue(async () => {
        const credentials = readCredentials(input);
        const prepared = remember ? await store.prepare(credentials) : null;
        if (!remember) await store.clear();
        try {
          await request("POST", credentials);
          if (prepared) {
            try { await prepared.commit(); }
            catch {
              // Do not reuse an older account after a successful account change.
              try { await store.clear(); return { remembered: false }; }
              catch { return { remembered: false, cleanupFailed: true }; }
            }
          }
          disabled = false;
          return { remembered: remember };
        } finally {
          if (prepared) await prepared.discard().catch(() => console.warn(ui.diagnostics.rememberCleanupFailed));
        }
      });
    },
    disconnect() {
      invalidate();
      disabled = true;
      return enqueue(async () => { await store.clear(); await request("DELETE"); });
    },
    stop() { stopped = true; invalidate(); },
  };
}
