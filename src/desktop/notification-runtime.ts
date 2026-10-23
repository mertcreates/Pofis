import { ui } from "../lib/ui-text.js";
import { dateKey, weekStart, addDays } from "@/domain/rules/calendar";
import { defaultNotificationPreferences, readNotificationPreferences, mesaiNotifications, NOTIFICATION_POLICY,
  type NotificationChannel, type NotificationPreferences, type NotificationGoal } from "@/domain/rules/notifications";
import { readStoredPlans } from "@/lib/plan-storage.js";
import { readReportResponse } from "@/data/report-response";
import type { WorkPlans } from "@/domain/rules/work-plan";
import { notificationGoal } from "./notification-report";
import type { NotificationStore, NotificationAccount } from "./notification-store";
import type { NotificationSession, NotificationReport, NotificationStatus } from "./notification-contract";
import { DeliveryError, type TelegramCredentials } from "./telegram";
import { SESSION_POLICY } from "@/domain/rules/session-policy";

type Dependencies = {
  store: NotificationStore;
  now?: () => number;
  readSession(signal: AbortSignal): Promise<NotificationSession | null>;
  readReport(from: string, to: string, signal: AbortSignal): Promise<unknown>;
  heartbeat?(signal: AbortSignal): Promise<void>;
  onExpired?(): void;
  nativeSupported: boolean;
  secureStorageAvailable(): boolean;
  seal(value: TelegramCredentials): string;
  unseal(value: string): TelegramCredentials;
  verifyTelegram(input: unknown, signal: AbortSignal): Promise<TelegramCredentials>;
  sendNative(title: string, body: string): Promise<void>;
  sendTelegram(credentials: TelegramCredentials, title: string, body: string, signal: AbortSignal): Promise<void>;
  onChange(status: NotificationStatus): void;
  onReport(report: NotificationReport): void;
  onGoal?(goal: NotificationGoal | null): void;
};

export function readNotificationSession(value: unknown): NotificationSession {
  const session = value as NotificationSession | null;
  if (!session || !/^[a-f0-9]{64}$/.test(session.accountId) || !Number.isSafeInteger(session.expiresAt))
    throw new Error(ui.notificationErrors.invalidSession);
  return { accountId: session.accountId, expiresAt: session.expiresAt };
}

export function createNotificationRuntime(deps: Dependencies) {
  const now = deps.now ?? Date.now;
  let session: NotificationSession | null = null;
  let account: NotificationAccount | null = null;
  let plans: WorkPlans | null = null;
  let report: NotificationReport | null = null;
  let credentials: TelegramCredentials | null = null;
  let eligibleSince = now();
  let generation = 0;
  let controller = new AbortController();
  let lastRefreshAt: number | null = null;
  let lastAttemptAt = 0;
  let lastHeartbeatAt = 0;
  let refreshError = "";
  let deliveryErrors: NotificationStatus["deliveryErrors"] = {};
  let refreshing: Promise<void> | null = null;
  let ticking = false;
  let mutations: Promise<unknown> = Promise.resolve();
  let pendingSync: string | null = null;
  let lastSyncAttempt = 0;
  let telegramVersion = 0;

  function status(): NotificationStatus {
    return { active: session !== null, preferences: account?.preferences ?? defaultNotificationPreferences(),
      telegram: { connected: !!credentials, label: credentials?.label ?? "" }, nativeSupported: deps.nativeSupported,
      secureStorageAvailable: deps.secureStorageAvailable(), lastRefreshAt, refreshError, deliveryErrors: { ...deliveryErrors } };
  }
  const publishGoal = (goal = notificationGoal(report, plans, now())) => deps.onGoal?.(goal);
  const publish = () => { deps.onChange(status()); publishGoal(); };
  function expire() { pause(); deps.onExpired?.(); }
  function pause() {
    pendingSync = null;
    telegramVersion++;
    generation++;
    controller.abort();
    controller = new AbortController();
    session = null; account = null; report = null; credentials = null;
    refreshing = null; lastRefreshAt = null; lastAttemptAt = 0; lastHeartbeatAt = 0; refreshError = ""; deliveryErrors = {};
    eligibleSince = now();
    publish();
  }
  function requireAccount() {
    if (session && session.expiresAt <= now()) expire();
    if (!session || !account) throw new Error(ui.notificationErrors.loginRequired);
    return { session, account, generation, preferencesRevision: account.preferencesRevision ?? 0 };
  }
  function persist(update: (value: NotificationAccount) => NotificationAccount, current = requireAccount()) {
    const task = mutations.then(async () => {
      if (current.generation !== generation || !account) throw new Error(ui.notificationErrors.accountChanged);
      const next = update(account);
      await deps.store.save(current.session.accountId, next);
      if (current.generation !== generation) throw new Error(ui.notificationErrors.accountChanged);
      account = next;
    });
    mutations = task.catch(() => {});
    return task;
  }
  async function sync(rawPlans: string) {
    if (typeof rawPlans !== "string" || rawPlans.length > 1_000_000) throw new Error(ui.notificationErrors.plansUnreadable);
    plans = readStoredPlans(rawPlans);
    const version = generation;
    lastSyncAttempt = now();
    let next;
    try { next = await deps.readSession(controller.signal); }
    catch (error) {
      if (version !== generation) return status();
      if ((error as { code?: string }).code === "SESSION_EXPIRED") { expire(); return status(); }
      pendingSync = rawPlans;
      throw error;
    }
    if (version !== generation) return status();
    pendingSync = null;
    if (!next) { pause(); return status(); }
    const verified = readNotificationSession(next);
    if (verified.expiresAt <= now()) { expire(); return status(); }
    if (session?.accountId !== verified.accountId || session?.expiresAt !== verified.expiresAt) {
      pause();
      const loadingGeneration = generation;
      const loaded = await deps.store.load(verified.accountId);
      if (loadingGeneration !== generation) return status();
      account = loaded; session = verified;
      if (loaded.telegram) {
        try { credentials = deps.unseal(loaded.telegram); }
        catch { deliveryErrors.telegram = ui.notificationErrors.telegramUnreadable; }
      }
    }
    publish();
    void refresh();
    return status();
  }
  async function refresh() {
    if (!session) return;
    if (session.expiresAt <= now()) { expire(); return; }
    if (refreshing) return refreshing;
    const current = requireAccount();
    const from = weekStart(dateKey(now()));
    lastAttemptAt = now();
    const run = (async () => {
      try {
        const raw = await deps.readReport(from, addDays(from, 6), controller.signal);
        if (current.generation !== generation) return;
        if (current.session.expiresAt <= now()) { expire(); return; }
        const parsed = readReportResponse(raw, from, addDays(from, 6)) as NotificationReport;
        const identity = readNotificationSession(parsed.notificationSession);
        if (identity.accountId !== current.session.accountId || identity.expiresAt !== current.session.expiresAt) { pause(); return; }
        report = parsed; lastRefreshAt = now(); refreshError = "";
        deps.onReport(parsed);
      } catch (error) {
        if (current.generation !== generation) return;
        if ((error as { code?: string }).code === "SESSION_EXPIRED") { expire(); return; }
        refreshError = ui.notificationErrors.refreshFailed;
      }
      publish();
    })();
    refreshing = run;
    try { await run; } finally { if (refreshing === run) refreshing = null; }
  }
  async function tick() {
    if (!ticking && pendingSync !== null && now() - lastSyncAttempt >= 30_000) {
      const retry = pendingSync;
      pendingSync = null;
      void sync(retry).catch(() => {}); // sync retains transient failures for the next timed attempt.
    }
    if (ticking || !session) return;
    if (session.expiresAt <= now()) { expire(); return; }
    ticking = true;
    try {
      if (deps.heartbeat && now() - lastHeartbeatAt >= SESSION_POLICY.heartbeatMs) {
        lastHeartbeatAt = now();
        const version = generation;
        void deps.heartbeat(controller.signal).catch(error => {
          if (version !== generation) return;
          if ((error as { code?: string }).code === "SESSION_EXPIRED") { expire(); return; }
          // Temporary transport failures retain the last successful report and fixed TTL.
        });
      }
      if (now() - lastAttemptAt >= NOTIFICATION_POLICY.refreshMs) void refresh();
      if (!session || !account) return;
      const current = requireAccount();
      const goal = notificationGoal(report, plans, now());
      publishGoal(goal);
      const candidates = mesaiNotifications(goal, account.preferences, dateKey(now()), now(), eligibleSince);
      for (const event of candidates) for (const channel of ["native", "telegram"] as const) {
        if (current.generation !== generation || !account || !session || session.expiresAt <= now() ||
            (account.preferencesRevision ?? 0) !== current.preferencesRevision) return;
        if (!account.preferences[event.kind][channel] || (channel === "native" ? !deps.nativeSupported : !credentials)) continue;
        const key = `${event.key}:${channel}`;
        const previous = account.deliveries[key];
        if (previous && (previous.state !== "failed" || previous.attempts >= NOTIFICATION_POLICY.maxAttempts || previous.retryAt > now())) continue;
        const attempts = (previous?.attempts ?? 0) + 1;
        await persist(value => {
          if ((value.preferencesRevision ?? 0) !== current.preferencesRevision) return value;
          const deliveries = Object.fromEntries(Object.entries(value.deliveries).filter(([key]) => key.slice(0, 10) >= dateKey(now() - 7 * 86400_000)));
          return { ...value, deliveries: { ...deliveries, [key]: { state: "pending", attempts, retryAt: 0 } } };
        }, current);
        if (current.generation !== generation || now() >= event.expiresAt || session.expiresAt <= now() ||
            (account!.preferencesRevision ?? 0) !== current.preferencesRevision) return;
        if (!account!.preferences[event.kind][channel] || (channel === "telegram" && !credentials) ||
            notificationGoal(report, plans, now())?.at !== goal?.at) {
          await persist(value => { const deliveries = { ...value.deliveries }; delete deliveries[key]; return { ...value, deliveries }; }, current);
          continue;
        }
        let result: NotificationAccount["deliveries"][string];
        try {
          if (channel === "native") await deps.sendNative(event.title, event.body);
          else await deps.sendTelegram(credentials!, event.title, event.body, controller.signal);
          result = { state: "accepted", attempts, retryAt: 0 };
          if (current.generation === generation && (account?.preferencesRevision ?? 0) === current.preferencesRevision)
            delete deliveryErrors[channel];
        } catch (error) {
          const failure = error instanceof DeliveryError ? error : new DeliveryError(ui.notificationErrors.deliveryFailed, null, true);
          const retryAt = failure.retryAfterMs === null ? Number.MAX_SAFE_INTEGER : now() + failure.retryAfterMs;
          result = { state: failure.uncertain ? "unknown" : "failed", attempts, retryAt, error: failure.message };
          if (current.generation === generation && (account?.preferencesRevision ?? 0) === current.preferencesRevision)
            deliveryErrors[channel] = failure.message;
        }
        // A completed send must not restore records reset by a later preference change.
        if (current.generation === generation && account) {
          await persist(value => (value.preferencesRevision ?? 0) === current.preferencesRevision
            ? { ...value, deliveries: { ...value.deliveries, [key]: result } } : value, current);
        } else {
          const task = mutations.then(async () => {
            const latest = await deps.store.load(current.session.accountId);
            if ((latest.preferencesRevision ?? 0) !== current.preferencesRevision) return;
            await deps.store.save(current.session.accountId, { ...latest, deliveries: { ...latest.deliveries, [key]: result } });
          });
          mutations = task.catch(() => {});
          await task;
        }
        publish();
      }
    } catch {
      refreshError = ui.notificationErrors.recordWriteFailed;
      publish();
    } finally { ticking = false; }
  }
  const implementation = {
    status, sync, pause, refresh, tick,
    async resume() { eligibleSince = now(); lastHeartbeatAt = 0; void refresh(); await tick(); },
    async save(input: unknown) {
      const current = requireAccount();
      const preferences = readNotificationPreferences(input);
      let changed = false;
      await persist(value => {
        changed = value.preferences.leadMinutes !== preferences.leadMinutes ||
          (["approaching", "reached"] as const).some(kind =>
            value.preferences[kind].native !== preferences[kind].native || value.preferences[kind].telegram !== preferences[kind].telegram);
        if (!changed) return value;
        const today = dateKey(now());
        return { ...value, preferences, preferencesRevision: (value.preferencesRevision ?? 0) + 1,
          deliveries: Object.fromEntries(Object.entries(value.deliveries).filter(([key]) => key.slice(0, 10) !== today)) };
      }, current);
      if (changed) eligibleSince = now();
      publish(); return status();
    },
    async connectTelegram(input: unknown) {
      const current = requireAccount();
      const version = ++telegramVersion;
      if (!deps.secureStorageAvailable()) throw new Error(ui.notificationErrors.secureStorageUnavailable);
      const verified = await deps.verifyTelegram(input, controller.signal);
      if (current.generation !== generation || version !== telegramVersion) throw new Error(ui.notificationErrors.telegramChanged);
      const encrypted = deps.seal(verified);
      await persist(value => {
        if (version !== telegramVersion) throw new Error(ui.notificationErrors.telegramChanged);
        return { ...value, telegram: encrypted };
      }, current);
      if (version !== telegramVersion) return status();
      credentials = verified; delete deliveryErrors.telegram; publish(); return status();
    },
    async disconnectTelegram() {
      const current = requireAccount();
      telegramVersion++;
      await persist(value => { const next = { ...value }; delete next.telegram; return next; }, current);
      credentials = null; delete deliveryErrors.telegram; publish(); return status();
    },
    async test(channel: NotificationChannel) {
      requireAccount();
      if (channel !== "native" && channel !== "telegram") throw new Error(ui.notificationErrors.invalidChannel);
      if (channel === "native") {
        if (!deps.nativeSupported) throw new Error(ui.notificationErrors.nativeUnsupported);
        await deps.sendNative(ui.notificationMessages.testTitle, ui.notificationMessages.nativeTestBody);
      } else {
        if (!credentials) throw new Error(ui.notificationErrors.telegramRequired);
        await deps.sendTelegram(credentials, ui.notificationMessages.testTitle, ui.notificationMessages.telegramTestBody, controller.signal);
      }
    },
  };
  return implementation;
}
