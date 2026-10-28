import { expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { installDesktopNotifications } from "./install-notifications";
import { emptyWorkPlans } from "@/domain/rules/work-plan";

test("bildirim sahibi canlı pencereye durum gönderir; yok edilmiş pencere ve durdurulmuş köprüye erişmez", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-notification-lifecycle-"));
  let destroyed = false;
  const sent: string[] = [];
  const frame = { url: "http://127.0.0.1:3210/" };
  const contents = { mainFrame: frame, isDestroyed: () => false, send: (name: string) => sent.push(name) };
  const window = { isDestroyed: () => destroyed, get webContents() {
    if (destroyed) throw new Error("Object has been destroyed");
    return contents;
  } };
  const handlers = new Map<string, (event: unknown) => Promise<unknown>>();
  const powerMonitor = new EventEmitter();
  const notification = installDesktopNotifications({
    app: { getPath: () => directory },
    ipcMain: { handle: (name: string, handler: (event: unknown) => Promise<unknown>) => handlers.set(name, handler) },
    session: { fetch: () => { throw new Error("This lifecycle test must not contact a source"); } },
    safeStorage: { isEncryptionAvailable: () => true, getSelectedStorageBackend: () => "gnome_libsecret" },
    Notification: { isSupported: () => true }, powerMonitor, getWindow: () => window,
    origin: "http://127.0.0.1:3210", showWindow() {},
  } as unknown as Parameters<typeof installDesktopNotifications>[0]);
  try {
    notification.pause();
    expect(sent).toEqual(["pofis:notifications:status"]);
    destroyed = true;
    const event = { sender: contents, senderFrame: frame };
    expect(await handlers.get("pofis:notifications:get")!(event)).toEqual({ ok: false, error: "Bildirim isteğine izin verilmedi." });
    expect(() => notification.stop()).not.toThrow();
    expect(sent).toHaveLength(1);
    expect(powerMonitor.listenerCount("suspend")).toBe(0);
    expect(powerMonitor.listenerCount("resume")).toBe(0);
    destroyed = false;
    expect(await handlers.get("pofis:notifications:get")!(event)).toEqual({ ok: false, error: "Bildirim isteğine izin verilmedi." });
  } finally {
    destroyed = false;
    notification.stop();
    await rm(directory, { recursive: true, force: true });
  }
});

test("Mini güncel raporu, hesap geçişini ve oturum bitişini alır; yalnız yenileme çağırabilir", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-mini-session-"));
  const origin = "http://127.0.0.1:3210";
  const makeContents = (path: string) => ({
    mainFrame: { url: `${origin}${path}` }, isDestroyed: () => false,
    sent: [] as { name: string; value: any }[],
    send(name: string, value: unknown) { this.sent.push({ name, value }); },
  });
  const main = makeContents("/"), mini = makeContents("/mini");
  let miniDestroyed = false;
  const miniWindow = { isDestroyed: () => miniDestroyed, get webContents() {
    if (miniDestroyed) throw new Error("destroyed mini");
    return mini;
  } };
  let identity = { accountId: "a".repeat(64), expiresAt: Date.now() + 60_000 };
  let reportVersion = 0;
  const handlers = new Map<string, (event: unknown, value?: unknown) => Promise<any>>();
  const notification = installDesktopNotifications({
    app: { getPath: () => directory },
    ipcMain: { handle: (name: string, handler: (event: unknown, value?: unknown) => Promise<unknown>) => handlers.set(name, handler) },
    session: { async fetch(path: string) {
      const url = new URL(path);
      return Response.json(url.pathname === "/api/session" ? { connected: true, notificationSession: identity }
        : { person: { id: "self", name: `Fixture ${reportVersion}`, unit: "", title: "" },
          from: url.searchParams.get("from"), to: url.searchParams.get("to"),
          fetchedAt: new Date().toISOString(), passages: [], notificationSession: identity });
    } },
    safeStorage: { isEncryptionAvailable: () => true, getSelectedStorageBackend: () => "gnome_libsecret" },
    Notification: { isSupported: () => true }, powerMonitor: new EventEmitter(),
    getWindow: () => ({ isDestroyed: () => false, webContents: main }), getMiniWindow: () => miniWindow,
    origin, showWindow() {},
  } as unknown as Parameters<typeof installDesktopNotifications>[0]);
  const invoke = (contents: typeof main, name: string, value?: unknown, frame = contents.mainFrame) =>
    handlers.get(`pofis:notifications:${name}`)!({ sender: contents, senderFrame: frame }, value);
  const plans = JSON.stringify(emptyWorkPlans());
  try {
    expect((await invoke(main, "sync", plans)).ok).toBe(true);
    expect((await invoke(main, "refresh")).ok).toBe(true);
    expect(mini.sent.filter(item => item.name === "pofis:notifications:report").at(-1)?.value.person.name).toBe("Fixture 0");
    reportVersion++;
    expect((await invoke(mini, "refresh")).ok).toBe(true);
    expect(mini.sent.filter(item => item.name === "pofis:notifications:report").at(-1)?.value.person.name).toBe("Fixture 1");
    for (const operation of ["get", "sync", "pause", "save", "connectTelegram", "disconnectTelegram", "test", "telegramChats"]) {
      expect((await invoke(mini, operation, plans)).ok).toBe(false);
    }
    expect((await invoke(mini, "refresh", undefined, { url: `${origin}/mini` })).ok).toBe(false);
    const before = mini.sent.length;
    identity = { ...identity, accountId: "b".repeat(64) };
    await invoke(main, "sync", plans); await invoke(main, "refresh");
    const transition = mini.sent.slice(before);
    expect(transition.filter(item => item.name === "pofis:notifications:status").map(item => item.value.active)).toEqual([false, true, true]);
    expect(transition.find(item => item.name === "pofis:notifications:report")?.value.notificationSession.accountId).toBe("b".repeat(64));
    await invoke(main, "pause");
    expect(mini.sent.at(-1)?.value.active).toBe(false);
    identity.expiresAt = Date.now() - 1;
    await invoke(main, "sync", plans);
    expect(mini.sent.at(-1)?.name).toBe("pofis:notifications:expired");
    const count = mini.sent.length;
    mini.mainFrame.url = "";
    expect(() => notification.pause()).not.toThrow();
    expect(mini.sent).toHaveLength(count);
    mini.mainFrame.url = "https://example.invalid/mini";
    notification.pause();
    expect(mini.sent).toHaveLength(count);
    expect((await invoke(mini, "refresh")).ok).toBe(false);
    miniDestroyed = true;
    expect(() => notification.pause()).not.toThrow();
    notification.stop();
    expect((await invoke(mini, "refresh")).ok).toBe(false);
  } finally {
    notification.stop();
    await rm(directory, { recursive: true, force: true });
  }
});

test("hatırlama IPC'si yalnız ana pencereye giriş/çıkış yetkisi verir ve kimlik bilgilerini geri döndürmez", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-remember-ipc-"));
  const origin = "http://127.0.0.1:3210";
  const contents = (path: string) => ({ mainFrame: { url: `${origin}${path}` }, isDestroyed: () => false, send() {} });
  const main = contents("/"), mini = contents("/mini"), foreign = contents("/");
  const handlers = new Map<string, (event: unknown, value?: unknown) => Promise<any>>();
  let connected = false, logins = 0;
  const notification = installDesktopNotifications({
    app: { getPath: () => directory },
    ipcMain: { handle: (name: string, handler: (event: unknown, value?: unknown) => Promise<unknown>) => handlers.set(name, handler) },
    session: { async fetch(_path: string, options: RequestInit) {
      if (options.method === "POST") { logins++; connected = true; }
      if (options.method === "DELETE") connected = false;
      return Response.json({ connected });
    } },
    safeStorage: { isEncryptionAvailable: () => true, getSelectedStorageBackend: () => "gnome_libsecret",
      isAsyncEncryptionAvailable: async () => true,
      encryptStringAsync: async (value: string) => Buffer.from(`v11${Buffer.from(value).toString("base64")}`),
      decryptStringAsync: async (value: Buffer) => ({ result: Buffer.from(value.subarray(3).toString(), "base64").toString(), shouldReEncrypt: false }),
    },
    Notification: { isSupported: () => true }, powerMonitor: new EventEmitter(),
    getWindow: () => ({ isDestroyed: () => false, webContents: main }),
    getMiniWindow: () => ({ isDestroyed: () => false, webContents: mini }),
    origin, showWindow() {}, rememberEnabled: true,
  } as unknown as Parameters<typeof installDesktopNotifications>[0]);
  const invoke = (sender: typeof main, name: string, input?: unknown, frame = sender.mainFrame) =>
    handlers.get(`pofis:remembered:${name}`)!({ sender, senderFrame: frame }, input);
  const input = { username: "fixture-user", password: "fixture-password", remember: true };
  try {
    expect((await invoke(mini, "connect", input)).ok).toBe(false);
    expect((await invoke(foreign, "connect", input)).ok).toBe(false);
    expect((await invoke(main, "connect", input, { url: `${origin}/` })).ok).toBe(false);
    expect(logins).toBe(0);
    const result = await invoke(main, "connect", input);
    expect(result).toEqual({ ok: true, value: { remembered: true } });
    expect(JSON.stringify(result)).not.toContain(input.password);
    expect((await invoke(mini, "disconnect")).ok).toBe(false);
    expect((await invoke(mini, "recover", true)).ok).toBe(true);
    expect(logins).toBe(2);
    expect((await invoke(main, "disconnect")).ok).toBe(true);
    expect(connected).toBe(false);
  } finally {
    notification.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
