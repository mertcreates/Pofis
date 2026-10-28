import { ui } from "../lib/ui-text.js";
import { SESSION_POLICY } from "@/domain/rules/session-policy";
import { REPORT_ACCESS } from "@/domain/rules/report-access";
import { isSessionExpired } from "@/lib/pdks-failure";
import { readDiagnosticDetails } from "@/lib/pdks-failure";
import { ApiError } from "@/lib/api-client.js";
import { join } from "node:path";
import type { App, IpcMain, Session, BrowserWindow, PowerMonitor, SafeStorage, Notification as ElectronNotification } from "electron";
import { createNotificationRuntime } from "./notification-runtime";
import { createNotificationStore } from "./notification-store";
import { secureStorageAvailable } from "./secure-storage";
import { createRememberedSession, createRememberedStore } from "./remembered-session";
import { createTelegram, readTelegramInput, DeliveryError, type TelegramCredentials } from "./telegram";
import { NOTIFICATION_POLICY, type NotificationChannel, type NotificationGoal } from "@/domain/rules/notifications";
import type { NotificationPreferences } from "@/domain/rules/notifications";

export function installDesktopNotifications({ app, ipcMain, session, safeStorage, Notification, powerMonitor, getWindow, getMiniWindow, origin, showWindow, onGoal, telegramFetch, now, rememberEnabled = false }: {
  app: App; ipcMain: IpcMain; session: Session; safeStorage: SafeStorage;
  Notification: typeof ElectronNotification; powerMonitor: PowerMonitor;
  getWindow(): BrowserWindow | undefined; origin: string; showWindow(): void;
  getMiniWindow?(): BrowserWindow | undefined;
  onGoal?: (goal: NotificationGoal | null) => void;
  telegramFetch?: Parameters<typeof createTelegram>[0];
  now?: () => number;
  rememberEnabled?: boolean;
}) {
  const telegram = createTelegram(telegramFetch);
  const shown = new Set<ElectronNotification>();
  let stopped = false;
  function applicationContents() {
    if (stopped) return;
    const window = getWindow();
    if (!window || window.isDestroyed()) return;
    return window.webContents;
  }
  function emit(name: string, value: unknown) {
    if (stopped) return;
    for (const window of [getWindow(), getMiniWindow?.()]) {
      if (!window || window.isDestroyed()) continue;
      const contents = window.webContents;
      if (!contents.isDestroyed() && URL.canParse(contents.mainFrame.url) &&
          new URL(contents.mainFrame.url).origin === origin) contents.send(name, value);
    }
  }
  async function request(path: string, signal: AbortSignal, method = "GET") {
    const response = await session.fetch(`${origin}${path}`, {
      credentials: "include", cache: "no-store", redirect: "error",
      method,
      signal: AbortSignal.any([signal, AbortSignal.timeout(path === "/api/session/heartbeat" ? SESSION_POLICY.heartbeatTimeoutMs : 90_000)]),
    });
    const data = await response.json();
    if (isSessionExpired({ status: response.status, code: data?.code }))
      throw Object.assign(new Error(ui.internalErrors.sessionExpired), { code: "SESSION_EXPIRED" });
    if (!response.ok) {
      if (response.status === 502 && data?.code === "CONNECTION_FAILED")
        throw Object.assign(new Error(ui.notificationErrors.reportFailed), { code: "CONNECTION_FAILED" });
      throw new Error(ui.notificationErrors.reportFailed);
    }
    return data;
  }
  const remembered = rememberEnabled ? createRememberedSession({
    store: createRememberedStore(app.getPath("userData"), safeStorage),
    fetch: (path, options) => session.fetch(`${origin}${path}`, {
      ...options, credentials: "include", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(90_000),
    }),
    onRecovered: () => emit("pofis:remembered:recovered", null),
    onInvalid: cleanupFailed => emit("pofis:remembered:invalid", cleanupFailed),
  }) : null;
  if (remembered) {
    for (const name of ["connect", "disconnect", "recover"] as const) {
      ipcMain.handle(`pofis:remembered:${name}`, async (event, input) => {
        const main = applicationContents();
        const miniWindow = !stopped && name === "recover" ? getMiniWindow?.() : undefined;
        const mini = miniWindow && !miniWindow.isDestroyed() ? miniWindow.webContents : undefined;
        const sender = event.sender === main ? main : event.sender === mini ? mini : undefined;
        if (!sender || sender.isDestroyed() || event.senderFrame !== sender.mainFrame ||
            !URL.canParse(event.senderFrame.url) || new URL(event.senderFrame.url).origin !== origin)
          return { ok: false, error: { code: "INTERNAL_ERROR", status: 0, details: {} } };
        try {
          if (name === "connect") {
            if (!input || typeof input !== "object" || typeof input.remember !== "boolean") throw new Error();
            return { ok: true, value: await remembered.connect({ username: input.username, password: input.password }, input.remember) };
          }
          if (name === "disconnect") { await remembered.disconnect(); return { ok: true, value: undefined }; }
          if (typeof input !== "boolean") throw new Error();
          return { ok: true, value: await remembered.recover(input) };
        } catch (error) {
          return { ok: false, error: error instanceof ApiError
            ? { code: error.code, status: error.status, details: readDiagnosticDetails(error.details) }
            : { code: "INTERNAL_ERROR", status: 0, details: {} } };
        }
      });
    }
  }
  const runtime = createNotificationRuntime({
    now,
    store: createNotificationStore(join(app.getPath("userData"), "notifications")),
    nativeSupported: Notification.isSupported(),
    secureStorageAvailable: () => secureStorageAvailable(safeStorage),
    seal: value => safeStorage.encryptString(JSON.stringify(value)).toString("base64"),
    unseal: value => {
      const decoded = JSON.parse(safeStorage.decryptString(Buffer.from(value, "base64")));
      return { ...readTelegramInput(decoded), label: typeof decoded.label === "string" ? decoded.label.slice(0, 100) : ui.telegramErrors.botLabel };
    },
    async readSession(signal) {
      const data = await request("/api/session", signal);
      if (typeof data?.connected !== "boolean") throw new Error(ui.notificationErrors.sessionUnreadable);
      return data.connected === true ? data.notificationSession : null;
    },
    readReport: (from, to, signal) => request(`/api/report?${new URLSearchParams({ person: REPORT_ACCESS.person, from, to })}`, signal),
    heartbeat: async signal => { await request("/api/session/heartbeat", signal, "POST"); },
    onExpired: () => {
      emit("pofis:notifications:expired", null);
      if (remembered) void remembered.recover().catch(() => {}); // The coordinator retries transient failures.
    },
    onUnavailable: () => {
      if (remembered) void remembered.recover(true).catch(() => {}); // The coordinator retries transient failures.
    },
    verifyTelegram: (input, signal) => telegram.verify(input, signal),
    sendTelegram: (credentials: TelegramCredentials, title, body, signal) => telegram.send(credentials, title, body, signal),
    sendNative: (title, body) => new Promise<void>((resolve, reject) => {
      const notification = new Notification({ title, body,
        ...(process.platform === "darwin" ? {} : { icon: join(app.getAppPath(), "public", "pofi", "pofi-mark-256.png") }),
      });
      shown.add(notification);
      const timer = setTimeout(() => reject(new DeliveryError(ui.notificationErrors.nativeUnconfirmed, null, true)), 5000);
      notification.once("show", () => { clearTimeout(timer); resolve(); });
      notification.once("failed", () => {
        clearTimeout(timer); shown.delete(notification);
        reject(new DeliveryError(ui.notificationErrors.nativeFailed));
      });
      notification.once("close", () => shown.delete(notification));
      notification.once("click", showWindow);
      notification.show();
    }),
    onChange: status => emit("pofis:notifications:status", status),
    onReport: report => emit("pofis:notifications:report", report),
    onGoal,
  });
  const operations = {
    get: () => runtime.status(), sync: (plans: string) => runtime.sync(plans), pause: () => runtime.pause(),
    refresh: () => runtime.refresh(), save: (preferences: NotificationPreferences) => runtime.save(preferences),
    connectTelegram: (input: unknown) => runtime.connectTelegram(input), disconnectTelegram: () => runtime.disconnectTelegram(),
    test: (channel: NotificationChannel) => runtime.test(channel),
    telegramChats: (token: string) => {
      if (!runtime.status().active) throw new Error(ui.notificationErrors.signInRequired);
      return telegram.chats(token);
    },
  };
  for (const [name, operation] of Object.entries(operations)) {
    ipcMain.handle(`pofis:notifications:${name}`, async (event, input) => {
      const contents = applicationContents();
      const mini = !stopped && name === "refresh" ? getMiniWindow?.() : undefined;
      const miniContents = mini && !mini.isDestroyed() ? mini.webContents : undefined;
      const sender = event.sender === contents ? contents : event.sender === miniContents ? miniContents : undefined;
      if (!sender || sender.isDestroyed() || event.senderFrame !== sender.mainFrame ||
          new URL(event.senderFrame.url).origin !== origin) return { ok: false, error: ui.notificationErrors.forbidden };
      try { return { ok: true, value: await (operation as (input: unknown) => unknown)(input) }; }
      catch (error) {
        // Only our public errors reach the renderer; native filesystem/network errors can carry sensitive paths or URLs.
        const message = error instanceof Error && !/(?:ENOENT|EACCES|EPERM|[\\/].*\.json|https?:)/.test(error.message)
          ? error.message : ui.notificationErrors.operationFailed;
        return { ok: false, error: message };
      }
    });
  }
  let suspended = false;
  const interval = setInterval(() => {
    if (!suspended) void runtime.tick().catch(() => console.warn(ui.diagnostics.notificationTickFailed));
  }, NOTIFICATION_POLICY.tickMs);
  const suspend = () => { suspended = true; };
  const resume = () => {
    suspended = false;
    void runtime.resume().catch(() => console.warn(ui.diagnostics.resumeRefreshFailed));
  };
  powerMonitor.on("suspend", suspend);
  powerMonitor.on("resume", resume);
  return {
    pause: runtime.pause,
    refresh: runtime.refresh,
    stop() {
      if (stopped) return;
      stopped = true;
      remembered?.stop();
      clearInterval(interval); runtime.pause();
      powerMonitor.removeListener("suspend", suspend); powerMonitor.removeListener("resume", resume);
      for (const notification of shown) notification.close();
      shown.clear();
    },
  };
}
