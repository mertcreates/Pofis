import { expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SafeStorage } from "electron";
import { createRememberedSession, createRememberedStore } from "./remembered-session";

const credentials = { username: "fixture-user", password: "fixture-password" };

function fakeStorage(prefix = "v11") {
  return {
    getSelectedStorageBackend: () => "gnome_libsecret",
    isAsyncEncryptionAvailable: async () => true,
    encryptStringAsync: async (text: string) => Buffer.from(prefix + Buffer.from(text).toString("base64")),
    decryptStringAsync: async (encrypted: Buffer) => ({
      result: Buffer.from(encrypted.subarray(3).toString(), "base64").toString(), shouldReEncrypt: false,
    }),
  } as unknown as SafeStorage;
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "pofis-remembered-"));
  const store = createRememberedStore(directory, fakeStorage(), "linux");
  let connected = false;
  let failure = "";
  let holdLogin: Promise<void> | null = null;
  let loginStarted = () => {};
  const methods: string[] = [];
  const events: string[] = [];
  const timers: { callback: () => void; delay: number }[] = [];
  const setTimer = ((callback: () => void, delay: number) => {
    const timer = { callback, delay }; timers.push(timer); return timer;
  }) as unknown as typeof setTimeout;
  const clearTimer = ((timer: unknown) => {
    const index = timers.indexOf(timer as typeof timers[number]);
    if (index >= 0) timers.splice(index, 1);
  }) as typeof clearTimeout;
  const runtime = createRememberedSession({ store, setTimer, clearTimer,
    onRecovered: () => events.push("recovered"), onInvalid: failed => events.push(failed ? "invalid-cleanup" : "invalid"),
    async fetch(path, options) {
      expect(path).toBe("/api/session");
      const method = options.method!; methods.push(method);
      if (method === "POST") {
        expect(JSON.parse(options.body as string)).toEqual(credentials);
        loginStarted();
        if (holdLogin) await holdLogin;
        if (failure === "credentials") return Response.json({ error: "bad credentials", code: "AUTH_FAILED" }, { status: 401 });
        if (failure === "network") return Response.json({ error: "offline", code: "CONNECTION_FAILED" }, { status: 502 });
        connected = true;
      }
      if (method === "DELETE") connected = false;
      return Response.json({ connected });
    },
  });
  return { directory, store, runtime, methods, events, timers,
    setConnected: (value: boolean) => { connected = value; },
    connected: () => connected,
    fail: (value: string) => { failure = value; },
    hold: (value: Promise<void>, started: () => void) => { holdLogin = value; loginStarted = started; },
    releaseHold: () => { holdLogin = null; },
    async cleanup() { runtime.stop(); await rm(directory, { recursive: true, force: true }); },
  };
}

test("yalnız seçilen bilgiler şifreli dosyaya yazılır, yeniden başlatmada okunur ve çıkışta silinir", async () => {
  const f = await fixture();
  try {
    expect(await f.runtime.connect(credentials, false)).toEqual({ remembered: false });
    expect(await readdir(f.directory)).toEqual([]);
    expect(await f.runtime.connect(credentials, true)).toEqual({ remembered: true });
    const encrypted = await readFile(join(f.directory, "remembered-session.bin"));
    expect(encrypted.toString()).not.toContain(credentials.username);
    expect(encrypted.toString()).not.toContain(credentials.password);
    f.setConnected(false);
    expect(await f.runtime.recover()).toBe(true);
    expect(f.methods).toEqual(["POST", "POST", "GET", "POST"]);
    expect(f.events).toEqual(["recovered"]);
    await f.runtime.disconnect();
    expect(f.connected()).toBe(false);
    expect(await f.store.load()).toBeNull();
    expect(await f.runtime.recover()).toBe(false);
  } finally { await f.cleanup(); }
});

test("çıkış kesintiden kalan şifreli giriş dosyalarını siler, başka dosyaları korur", async () => {
  const f = await fixture();
  try {
    await f.runtime.connect(credentials, true);
    await writeFile(join(f.directory, "remembered-12345678-1234-4567-89ab-123456789abc.tmp"), "encrypted fixture");
    await writeFile(join(f.directory, "remembered-not-ours.tmp"), "keep");
    await f.runtime.disconnect();
    expect(await readdir(f.directory)).toEqual(["remembered-not-ours.tmp"]);
  } finally { await f.cleanup(); }
});

test("güvenli anahtarlık yoksa veya Linux düz metin anahtarına dönerse giriş bilgileri kaydedilmez", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-remembered-no-keyring-"));
  try {
    const basic = { ...fakeStorage(), getSelectedStorageBackend: () => "basic_text" } as SafeStorage;
    await expect(createRememberedStore(directory, basic, "linux").prepare(credentials)).rejects.toMatchObject({ code: "REMEMBER_UNAVAILABLE" });
    await expect(createRememberedStore(directory, fakeStorage("v10"), "linux").prepare(credentials)).rejects.toMatchObject({ code: "REMEMBER_UNAVAILABLE" });
    const unavailable = { ...fakeStorage(), isAsyncEncryptionAvailable: async () => false } as SafeStorage;
    await expect(createRememberedStore(directory, unavailable, "win32").prepare(credentials)).rejects.toMatchObject({ code: "REMEMBER_UNAVAILABLE" });
    expect(await readdir(directory)).toEqual([]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("yanlış şifreyle girişte hazırlanan şifreli kayıt kalıcı hale gelmez", async () => {
  const f = await fixture();
  try {
    f.fail("credentials");
    await expect(f.runtime.connect(credentials, true)).rejects.toMatchObject({ code: "AUTH_FAILED", status: 401 });
    expect(await readdir(f.directory)).toEqual([]);
    expect(f.connected()).toBe(false);
  } finally { await f.cleanup(); }
});

test("başarılı girişten sonra kayıt ve eski kaydı silme başarısızlığı kullanıcı sonucunda ayrılır", async () => {
  const f = await fixture();
  const runtime = createRememberedSession({
    store: { ...f.store,
      async prepare(value) {
        const prepared = await f.store.prepare(value);
        return { ...prepared, async commit() { throw new Error("fixture write denied"); } };
      },
      async clear() { throw new Error("fixture delete denied"); },
    },
    async fetch() { return Response.json({ connected: true }); },
    onRecovered() {}, onInvalid() {},
  });
  try {
    expect(await runtime.connect(credentials, true)).toEqual({ remembered: false, cleanupFailed: true });
    expect(await runtime.recover(true)).toBe(false);
    expect(await readdir(f.directory)).toEqual([]);
  } finally { runtime.stop(); await f.cleanup(); }
});

test("geçici kaynak hatası aralıklı denenir; açık oturumdaki zaman aşımı yeniden giriş başlatır", async () => {
  const f = await fixture();
  try {
    await f.runtime.connect(credentials, true);
    f.fail("network");
    await expect(f.runtime.recover(true)).rejects.toMatchObject({ code: "CONNECTION_FAILED" });
    await Bun.sleep(0);
    expect(f.connected()).toBe(true);
    expect(f.timers.map(timer => timer.delay)).toEqual([30_000]);
    const attempts = f.methods.length;
    expect(await f.runtime.recover(true)).toBe(false);
    expect(f.methods).toHaveLength(attempts);
    f.fail("");
    f.timers.shift()!.callback();
    expect(await f.runtime.recover(true)).toBe(true);
    expect(f.events).toEqual(["recovered"]);
    expect(f.methods).toEqual(["POST", "POST", "POST"]);
    expect(f.timers).toHaveLength(0);
  } finally { await f.cleanup(); }
});

test("yalnız doğrulanmış parola hatası tekrarları durdurup kayıtlı bilgileri siler", async () => {
  const f = await fixture();
  try {
    await f.runtime.connect(credentials, true);
    f.setConnected(false); f.fail("credentials");
    await expect(f.runtime.recover()).rejects.toMatchObject({ code: "AUTH_FAILED", status: 401 });
    await Bun.sleep(0);
    expect(f.events).toEqual(["invalid"]);
    expect(await f.store.load()).toBeNull();
    expect(f.timers).toHaveLength(0);
    const attempts = f.methods.length;
    expect(await f.runtime.recover()).toBe(false);
    expect(f.methods).toHaveLength(attempts);
  } finally { await f.cleanup(); }
});

test("eşzamanlı yenileme paylaşılır; bekleyen giriş açık çıkıştan sonra oturum açamaz", async () => {
  const f = await fixture();
  try {
    await f.runtime.connect(credentials, true);
    f.setConnected(false);
    let release!: () => void, started!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const requested = new Promise<void>(resolve => { started = resolve; });
    f.hold(gate, started);
    const first = f.runtime.recover();
    const second = f.runtime.recover();
    expect(first).toBe(second);
    await requested;
    const logout = f.runtime.disconnect();
    f.releaseHold(); release();
    expect(await first).toBe(false);
    await logout;
    expect(f.connected()).toBe(false);
    expect(await f.store.load()).toBeNull();
    expect(f.events).toEqual([]);
    expect(f.methods.slice(-3)).toEqual(["GET", "POST", "DELETE"]);
  } finally { await f.cleanup(); }
});

test("geçersiz kayıt silinirken çıkış başlarsa eski parola hatası yeni işleme bildirilmez", async () => {
  const f = await fixture();
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const clearing = new Promise<void>(resolve => { started = resolve; });
  const events: string[] = [];
  const runtime = createRememberedSession({
    store: { ...f.store, async clear() { started(); await gate; await f.store.clear(); } },
    onRecovered: () => events.push("recovered"), onInvalid: () => events.push("invalid"),
    async fetch(_path, options) {
      return options.method === "POST"
        ? Response.json({ error: "fixture rejected", code: "AUTH_FAILED" }, { status: 401 })
        : Response.json({ connected: false });
    },
  });
  try {
    await f.runtime.connect(credentials, true);
    const recovery = runtime.recover();
    await clearing;
    const logout = runtime.disconnect();
    release();
    expect(await recovery).toBe(false);
    await logout;
    expect(events).toEqual([]);
    expect(await f.store.load()).toBeNull();
  } finally { runtime.stop(); await f.cleanup(); }
});
