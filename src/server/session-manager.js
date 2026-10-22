import { SESSION_POLICY } from "../domain/rules/session-policy";
import { randomBytes } from "node:crypto";
import { CookieJar } from "tough-cookie";
import { PdksClient, PdksError } from "./pdks.js";
import { createSessionStorage, validSessionId } from "./session-storage.js";
import { ui } from "../lib/ui-text.js";
import { isSessionExpired } from "../lib/pdks-failure";

export const SESSION_COOKIE = SESSION_POLICY.cookie;
export const SESSION_SECONDS = SESSION_POLICY.ttlSeconds;
const KEEP_ALIVE_MS = SESSION_POLICY.keepAliveMs;
const LEASE_MS = SESSION_POLICY.leaseMs;

// Dependencies are explicit so authentication can be proved without a real PDKS session.
export function createSessionManager({
  createClient = () => new PdksClient(),
  storage = createSessionStorage(null),
  clock = Date.now,
  sessions = new Map(),
  scheduler = { timer: null },
} = {}) {
  const loading = new Map();
  let nextDiskCleanup = clock() + SESSION_POLICY.diskCleanupMs;
  let maintenance;
  function saveSession(id, session) {
    return storage.save(id, {
      expiresAt: session.expiresAt,
      jar: session.client.jar.serializeSync(),
      self: session.client.self,
      lastRequestAt: session.client.lastRequestAt,
    });
  }

  function attachStorage(id, session) {
    session.controller ||= new AbortController();
    session.client.signal = session.controller.signal;
    session.client.onStateChange = async () => {
      if (sessions.get(id) !== session) return;
      try {
        await saveSession(id, session);
      } catch (error) {
        console.error(
          ui.serverDiagnostics.pdksSessionPersistenceFailed,
          error.code || error.name,
        );
        throw error;
      }
    };
  }

  async function loadSession(id) {
    if (loading.has(id)) return loading.get(id).promise;
    const state = { cancelled: false, promise: null };
    state.promise = (async () => {
      const record = await storage.read(id);
      if (
        state.cancelled || !record ||
        typeof record.self?.pofiKey !== "string" || !record.self.pofiKey.trim()
      ) return null;
      if (record.expiresAt <= clock()) {
        await storage.remove(id);
        return null;
      }
      const client = createClient();
      try {
        client.jar = CookieJar.deserializeSync(record.jar);
      } catch {
        console.error(ui.serverDiagnostics.invalidPdksCookieJarReauthenticationRequired);
        return null;
      }
      client.self = record.self;
      if (Number.isFinite(record.lastRequestAt))
        client.lastRequestAt = record.lastRequestAt;
      const session = { id, client, expiresAt: record.expiresAt };
      sessions.set(id, session);
      attachStorage(id, session);
      startTimer();
      return session;
    })().finally(() => {
      if (loading.get(id) === state) loading.delete(id);
    });
    loading.set(id, state);
    return state.promise;
  }

  function activeLease(session, now = clock()) {
    return (
      session.expiresAt > now && session.keepAlive?.heartbeatAt > now - LEASE_MS
    );
  }

  function startTimer() {
    if (!scheduler.timer) {
      scheduler.timer = setInterval(
        () =>
          scheduler
            .check()
            .catch((error) =>
              console.error(
                ui.serverDiagnostics.pdksSessionMaintenanceFailed,
                error.code || error.name,
              ),
            ),
        SESSION_POLICY.heartbeatMs,
      );
      scheduler.timer.unref();
    }
  }

  function stopIdleTimer() {
    if (sessions.size) return;
    clearInterval(scheduler.timer);
    scheduler.timer = null;
  }

  async function removeSession(id) {
    if (!validSessionId(id)) return;
    const previous = loading.get(id);
    if (previous?.cancelled && !previous.failed) return previous.promise;
    if (previous) previous.cancelled = true;
    const session = sessions.get(id);
    session?.controller?.abort();
    session?.keepAlive?.controller?.abort();
    if (session) {
      session.client.onRequest = undefined;
      session.client.onStateChange = undefined;
    }
    sessions.delete(id);
    stopIdleTimer();
    const state = { cancelled: true, promise: null };
    state.promise = Promise.resolve()
      .then(() => storage.remove(id))
      .then(
        () => {
          if (loading.get(id) === state) loading.delete(id);
        },
        (error) => {
          // Keep this process from restoring a revoked session after a failed disk delete.
          state.failed = true;
          state.promise = Promise.resolve(null);
          throw error;
        },
      );
    loading.set(id, state);
    return state.promise;
  }

  function checkDue(session, now = clock()) {
    return (
      activeLease(session, now) &&
      now >=
        Math.max(
          session.client.lastRequestAt + KEEP_ALIVE_MS,
          session.keepAlive.retryAt,
        )
    );
  }

  function checkKeepAlive() {
    if (maintenance) return maintenance;
    maintenance = maintain().finally(() => {
      maintenance = null;
    });
    return maintenance;
  }

  async function maintain() {
    await expireSessions();
    if (clock() >= nextDiskCleanup) {
      nextDiskCleanup = clock() + SESSION_POLICY.diskCleanupMs;
      try {
        await storage.pruneExpired?.(clock());
      } catch (error) {
        console.error(
          ui.serverDiagnostics.pdksSessionDiskCleanupFailed,
          error.code || error.name,
        );
      }
    }
    for (const [id, session] of sessions) {
      const state = session.keepAlive;
      if (!activeLease(session)) {
        state?.controller?.abort();
        continue;
      }
      if (state.pending || !checkDue(session)) continue;
      state.pending = true;
      session.client
        .run(async () => {
          if (sessions.get(id) !== session || !checkDue(session)) return;
          state.checking = true;
          state.controller = new AbortController();
          try {
            await session.client.checkSession(state.controller.signal);
            state.failures = 0;
            state.retryAt = 0;
          } catch (error) {
            if (sessions.get(id) !== session || !activeLease(session)) return;
            if (
              error instanceof PdksError &&
              isSessionExpired(error)
            ) {
              await removeSession(id);
              return;
            }
            state.failures++;
            const backoff = Math.min(
              KEEP_ALIVE_MS * 2 ** state.failures,
              SESSION_POLICY.maxBackoffMs,
            );
            state.retryAt =
              clock() + Math.max(backoff, error.details?.retryAfterMs || 0);
            console.error(ui.serverDiagnostics.pdksKeepAliveFailed, error.code || error.name);
          } finally {
            state.checking = false;
            state.controller = null;
          }
        })
        .catch((error) => {
          console.error(
            ui.serverDiagnostics.pdksKeepAliveQueueFailed,
            error.code || error.name,
          );
        })
        .finally(() => {
          state.pending = false;
        });
    }
    stopIdleTimer();
  }

  // A hot reload updates the callback while retaining the single process timer.
  scheduler.check = checkKeepAlive;

  async function heartbeat(request) {
    const session = await requireSession(request);
    session.client.lastRequestAt ??= clock();
    session.keepAlive ||= {
      heartbeatAt: 0,
      pending: false,
      checking: false,
      failures: 0,
      retryAt: 0,
      controller: null,
    };
    session.keepAlive.heartbeatAt = clock();
    session.client.onRequest = () => {
      if (session.keepAlive.checking) return;
      session.keepAlive.failures = 0;
      session.keepAlive.retryAt = 0;
    };
    startTimer();
    return session;
  }

  async function expireSessions(now = clock()) {
    const expired = [...sessions].filter(
      ([, session]) => session.expiresAt <= now,
    );
    const results = await Promise.allSettled(
      expired.map(([id]) => removeSession(id)),
    );
    for (const result of results) {
      if (result.status === "rejected")
        console.error(
          ui.serverDiagnostics.pdksExpiredSessionCleanupFailed,
          result.reason.code || result.reason.name,
        );
    }
  }

  async function sessionFor(request) {
    const id = request.cookies.get(SESSION_COOKIE)?.value;
    if (!validSessionId(id)) return null;
    if (loading.get(id)?.cancelled) return null;
    const session = sessions.get(id) || (await loadSession(id));
    if (
      !session || typeof session.client.self?.pofiKey !== "string" ||
      !session.client.self.pofiKey.trim()
    ) return null;
    if (session.expiresAt <= clock()) {
      await removeSession(id);
      return null;
    }
    return session;
  }

  async function requireSession(request) {
    const session = await sessionFor(request);
    if (!session)
      throw new PdksError(ui.apiErrors.sessionRequired, "SESSION_EXPIRED", 401);
    return session;
  }

  async function connect(body) {
    let username = typeof body.username === "string"
      ? body.username.split("@", 1)[0].trim()
      : "";
    if (
      typeof body.username !== "string" ||
      !username ||
      body.username.length > SESSION_POLICY.maxUsernameLength ||
      typeof body.password !== "string" ||
      !body.password ||
      body.password.length > SESSION_POLICY.maxPasswordLength
    )
      throw new PdksError(
        ui.apiErrors.credentialsRequired,
        "INVALID_INPUT",
        400,
      );
    const client = createClient();
    let password = body.password;
    delete body.username;
    delete body.password;
    try {
      await client.login(username, password);
    } finally {
      username = undefined;
      password = undefined;
    }
    const id = randomBytes(SESSION_POLICY.tokenBytes).toString("hex");
    const session = { id, client, expiresAt: clock() + SESSION_SECONDS * 1000 };
    await saveSession(id, session);
    sessions.set(id, session);
    attachStorage(id, session);
    startTimer();
    return id;
  }

  async function disconnect(request) {
    const id = request.cookies.get(SESSION_COOKIE)?.value;
    if (id) await removeSession(id);
  }

  async function replaceSession(request, body) {
    const id = await connect(body);
    try {
      await disconnect(request);
    } catch (error) {
      try {
        await removeSession(id);
      } catch (cleanupError) {
        console.error(
          ui.serverDiagnostics.pdksNewSessionRollbackFailed,
          cleanupError.code || cleanupError.name,
        );
      }
      throw error;
    }
    return id;
  }

  function assertActive(session) {
    if (session.expiresAt <= clock() || sessions.get(session.id) !== session)
      throw new PdksError(ui.apiErrors.sessionRequired, "SESSION_EXPIRED", 401);
  }

  return {
    sessionFor,
    requireSession,
    connect,
    replaceSession,
    disconnect,
    heartbeat,
    checkKeepAlive,
    assertActive,
  };
}
