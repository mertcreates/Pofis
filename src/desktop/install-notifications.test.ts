import { expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { installDesktopNotifications } from "./install-notifications";

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
