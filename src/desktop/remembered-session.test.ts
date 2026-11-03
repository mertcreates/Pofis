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
  let holdCheck: Promise<void> | null = null;
  let checkStarted = () => {};
  const methods: string[] = [];
  const logins: { username: string; password: string }[] = [];
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
      if (method === "GET") {
        checkStarted();
        if (holdCheck) await holdCheck;
        if (failure === "get-rate-limit") return Response.json({ error: "wait", code: "SOURCE_ERROR", details: { retryAfterMs: 90_000 } }, { status: 502 });
      }
      if (method === "POST") {
        logins.push(JSON.parse(options.body as string));
        loginStarted();
        if (holdLogin) await holdLogin;
        if (failure === "credentials") return Response.json({ error: "bad credentials", code: "AUTH_FAILED" }, { status: 401 });
        if (failure === "unconfirmed-credentials") return Response.json({ error: "upstream error", code: "AUTH_FAILED" }, { status: 502 });
        if (failure === "network") return Response.json({ error: "offline", code: "CONNECTION_FAILED" }, { status: 502 });
        if (failure === "transport") throw new Error("fixture network error");
        if (failure === "rate-limit") return Response.json({ error: "wait", code: "SOURCE_ERROR", details: { retryAfterMs: 90_000 } }, { status: 502 });
        connected = true;
      }
      if (method === "DELETE") connected = false;
      return Response.json({ connected });
    },
  });
  return { directory, store, runtime, methods, logins, events, timers,
    setConnected: (value: boolean) => { connected = value; },
    connected: () => connected,
    fail: (value: string) => { failure = value; },
    hold: (value: Promise<void>, started: () => void) => { holdLogin = value; loginStarted = started; },
    releaseHold: () => { holdLogin = null; },
    holdCheck: (value: Promise<void>, started: () => void) => { holdCheck = value; checkStarted = started; },
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
    expect(f.logins).toEqual([credentials, credentials, credentials]);
    expect(f.events).toEqual(["recovered"]);
    await f.runtime.disconnect();
    expect(f.connected()).toBe(false);
    expect(await f.store.load()).toBeNull();
    expect(await f.runtime.recover()).toBe(false);
  } finally { await f.cleanup(); }
});

test("bekleyen oturum kontrolü sırasında kaynak hatası gelirse giriş yenilenir", async () => {
  const f = await fixture();
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const checking = new Promise<void>(resolve => { started = resolve; });
  try {
    await f.runtime.connect(credentials, true);
    f.holdCheck(gate, started);
    const normal = f.runtime.recover();
    await checking;
    const forced = f.runtime.recover(true);
    expect(forced).toBe(normal);
    release();
    expect(await forced).toBe(true);
    expect(f.methods).toEqual(["POST", "GET", "POST"]);
    expect(f.events).toEqual(["recovered"]);
  } finally { release(); await f.cleanup(); }
});

test("kontrol hatasının bekleme süresi korunurken zorunlu giriş sonraki denemeye taşınır", async () => {
  const f = await fixture();
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const checking = new Promise<void>(resolve => { started = resolve; });
  try {
    await f.runtime.connect(credentials, true);
    f.holdCheck(gate, started); f.fail("get-rate-limit");
    const normal = f.runtime.recover();
    await checking;
    const forced = f.runtime.recover(true);
    release();
    await expect(forced).rejects.toMatchObject({ code: "SOURCE_ERROR" });
    await Bun.sleep(0);
    expect(f.timers.map(timer => timer.delay)).toEqual([90_000]);
    f.fail("");
    f.timers.shift()!.callback();
    expect(await f.runtime.recover(true)).toBe(true);
    expect(f.methods).toEqual(["POST", "GET", "POST"]);
    expect(f.events).toEqual(["recovered"]);
  } finally { release(); await f.cleanup(); }
});

test("normal yeniden deneme beklerken kaynak hatası gelirse süre korunur ve giriş yenilenir", async () => {
  const f = await fixture();
  try {
    await f.runtime.connect(credentials, true);
    f.setConnected(false); f.fail("network");
    await expect(f.runtime.recover()).rejects.toMatchObject({ code: "CONNECTION_FAILED" });
    await Bun.sleep(0);
    expect(f.timers.map(timer => timer.delay)).toEqual([30_000]);
    f.setConnected(true); f.fail("");
    expect(await f.runtime.recover(true)).toBe(false);
    expect(f.timers.map(timer => timer.delay)).toEqual([30_000]);
    f.timers.shift()!.callback();
    expect(await f.runtime.recover(true)).toBe(true);
    expect(f.methods).toEqual(["POST", "GET", "POST", "POST"]);
    expect(f.events).toEqual(["recovered"]);
  } finally { await f.cleanup(); }
});

test.each(["disconnect", "connect", "stop"] as const)("bekleyen bağlı oturum kontrolü %s ile geçersizleşir", async action => {
  const f = await fixture();
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const checking = new Promise<void>(resolve => { started = resolve; });
  try {
    await f.runtime.connect(credentials, true);
    f.holdCheck(gate, started);
    const recovery = f.runtime.recover();
    await checking;
    expect(f.runtime.recover(true)).toBe(recovery);
    const next = action === "disconnect" ? f.runtime.disconnect()
      : action === "connect" ? f.runtime.connect({ username: "other-user", password: "other-password" }, true)
      : (f.runtime.stop(), null);
    release();
    expect(await recovery).toBe(false);
    if (next) await next;
    expect(f.methods).toEqual(action === "disconnect" ? ["POST", "GET", "DELETE"]
      : action === "connect" ? ["POST", "GET", "POST"] : ["POST", "GET"]);
    expect(f.events).toEqual([]);
    expect(f.timers).toHaveLength(0);
  } finally { release(); await f.cleanup(); }
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

test.each([
  { failure: "network", code: "CONNECTION_FAILED", delay: 30_000 },
  { failure: "transport", code: "NETWORK_ERROR", delay: 30_000 },
  { failure: "rate-limit", code: "SOURCE_ERROR", delay: 90_000 },
  { failure: "unconfirmed-credentials", code: "AUTH_FAILED", delay: 30_000 },
])("aynı bilgilerle elle girişte $failure sonrasında otomatik deneme sürer", async ({ failure, code, delay }) => {
  const f = await fixture();
  try {
    await f.runtime.connect(credentials, true);
    f.setConnected(false); f.fail(failure);
    await expect(f.runtime.recover(true)).rejects.toMatchObject({ code });
    await Bun.sleep(0);
    expect(f.timers).toHaveLength(1);
    await expect(f.runtime.connect(credentials, true)).rejects.toMatchObject({ code });
    expect(f.timers.map(timer => timer.delay)).toEqual([delay]);
    expect(await f.store.load()).toEqual(credentials);
    f.fail("");
    f.timers.shift()!.callback();
    expect(await f.runtime.recover(true)).toBe(true);
    expect(f.logins).toEqual([credentials, credentials, credentials, credentials]);
    expect(f.events).toEqual(["recovered"]);
  } finally { await f.cleanup(); }
});

test.each([
  { username: "other-user", password: credentials.password },
  { username: credentials.username, password: "other-password" },
])("farklı bilgilerle başarısız elle giriş eski hesabı otomatik açmaz", async changed => {
  const f = await fixture();
  try {
    await f.runtime.connect(credentials, true);
    f.setConnected(false); f.fail("network");
    await expect(f.runtime.recover(true)).rejects.toMatchObject({ code: "CONNECTION_FAILED" });
    await Bun.sleep(0);
    await expect(f.runtime.connect(changed, true)).rejects.toMatchObject({ code: "CONNECTION_FAILED" });
    expect(f.timers).toHaveLength(0);
    expect(await f.runtime.recover(true)).toBe(false);
    expect(f.logins).toEqual([credentials, credentials, changed]);
    expect(await f.store.load()).toEqual(credentials);
  } finally { await f.cleanup(); }
});

test("aynı bilgilerle elle girişte şifre hatası otomatik denemeyi durdurur", async () => {
  const f = await fixture();
  try {
    await f.runtime.connect(credentials, true);
    f.setConnected(false); f.fail("credentials");
    await expect(f.runtime.connect(credentials, true)).rejects.toMatchObject({ code: "AUTH_FAILED", status: 401 });
    expect(f.timers).toHaveLength(0);
    expect(await f.runtime.recover(true)).toBe(false);
    expect(f.logins).toEqual([credentials, credentials]);
    expect(await f.store.load()).toEqual(credentials);
  } finally { await f.cleanup(); }
});

test("kayıt olmadan ilk girişteki geçici hata otomatik giriş başlatmaz", async () => {
  const f = await fixture();
  try {
    f.fail("network");
    await expect(f.runtime.connect(credentials, true)).rejects.toMatchObject({ code: "CONNECTION_FAILED" });
    expect(f.timers).toHaveLength(0);
    expect(await f.store.load()).toBeNull();
    expect(await f.runtime.recover(true)).toBe(false);
  } finally { await f.cleanup(); }
});

test("elle girişte geçici hatadan sonra etkin oturum olsa da kaynak bağlantısı yenilenir ve bekleme artar", async () => {
  const f = await fixture();
  try {
    await f.runtime.connect(credentials, true);
    f.fail("network");
    await expect(f.runtime.connect(credentials, true)).rejects.toMatchObject({ code: "CONNECTION_FAILED" });
    expect(f.connected()).toBe(true);
    expect(f.timers.map(timer => timer.delay)).toEqual([30_000]);
    f.timers.shift()!.callback();
    await expect(f.runtime.recover(true)).rejects.toMatchObject({ code: "CONNECTION_FAILED" });
    await Bun.sleep(0);
    expect(f.timers.map(timer => timer.delay)).toEqual([60_000]);
    f.fail("");
    f.timers.shift()!.callback();
    expect(await f.runtime.recover(true)).toBe(true);
    expect(f.methods).toEqual(["POST", "POST", "POST", "POST"]);
    expect(f.events).toEqual(["recovered"]);
  } finally { await f.cleanup(); }
});

test("hatırlama kapatılarak başarısız giriş eski hesabı yeniden denemez", async () => {
  const f = await fixture();
  try {
    await f.runtime.connect(credentials, true);
    f.fail("network");
    await expect(f.runtime.connect(credentials, false)).rejects.toMatchObject({ code: "CONNECTION_FAILED" });
    expect(f.timers).toHaveLength(0);
    expect(await f.store.load()).toBeNull();
    expect(await f.runtime.recover(true)).toBe(false);
  } finally { await f.cleanup(); }
});

test("eşleşme için kayıt okunamazsa özgün giriş hatası korunur ve yeniden deneme açılmaz", async () => {
  const f = await fixture();
  try {
    await f.runtime.connect(credentials, true);
    const load = f.store.load.bind(f.store);
    f.store.load = async () => { throw new Error("fixture read denied"); };
    f.fail("network");
    await expect(f.runtime.connect(credentials, true)).rejects.toMatchObject({ code: "CONNECTION_FAILED" });
    expect(f.timers).toHaveLength(0);
    expect(await f.runtime.recover(true)).toBe(false);
    expect(await load()).toEqual(credentials);
  } finally { await f.cleanup(); }
});

test.each(["disconnect", "connect", "stop"] as const)("kayıt okunurken %s eski denemeyi açmaz", async action => {
  const f = await fixture();
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const reading = new Promise<void>(resolve => { started = resolve; });
  try {
    await f.runtime.connect(credentials, true);
    const load = f.store.load.bind(f.store);
    f.store.load = async () => { started(); await gate; return load(); };
    f.fail("network");
    const first = f.runtime.connect(credentials, true);
    await reading;
    const changed = { username: "other-user", password: "other-password" };
    f.fail("");
    const next = action === "disconnect" ? f.runtime.disconnect()
      : action === "connect" ? f.runtime.connect(changed, true) : (f.runtime.stop(), null);
    release();
    await expect(first).rejects.toMatchObject({ code: "CONNECTION_FAILED" });
    if (next) await next;
    expect(f.timers).toHaveLength(0);
    if (action === "disconnect") expect(await load()).toBeNull();
    if (action === "connect") expect(await load()).toEqual(changed);
    if (action === "stop") expect(await f.runtime.recover(true)).toBe(false);
    expect(f.events).toEqual([]);
  } finally { release(); await f.cleanup(); }
});

test("bekleyen giriş başarılı olsa da başarısız çıkış otomatik girişe izin vermez", async () => {
  const f = await fixture();
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requested = new Promise<void>(resolve => { started = resolve; });
  try {
    await f.runtime.connect(credentials, true);
    f.hold(gate, started);
    const login = f.runtime.connect(credentials, true);
    await requested;
    f.store.clear = async () => { throw new Error("fixture delete denied"); };
    const logout = f.runtime.disconnect();
    f.releaseHold(); release();
    expect(await login).toEqual({ remembered: true });
    await expect(logout).rejects.toThrow("fixture delete denied");
    expect(await f.store.load()).toEqual(credentials);
    expect(await f.runtime.recover(true)).toBe(false);
    expect(f.logins).toEqual([credentials, credentials]);
  } finally { release(); await f.cleanup(); }
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
