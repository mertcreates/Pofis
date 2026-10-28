import { expect, spyOn, test } from "bun:test";
import { createNotificationRuntime } from "./notification-runtime";
import { createNotificationStore, emptyNotificationAccount, type NotificationAccount, type NotificationStore } from "./notification-store";
import { emptyWorkPlans } from "@/domain/rules/work-plan";
import { defaultNotificationPreferences, type NotificationGoal } from "@/domain/rules/notifications";
import type { NotificationReport, NotificationSession, NotificationStatus } from "./notification-contract";
import { DeliveryError } from "./telegram";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const at = (time: string) => Date.parse(`2026-10-21T${time}+03:00`);
const plans = JSON.stringify(emptyWorkPlans());

test("ilk oturum okumasındaki geçici hata ana süreç döngüsünde toparlanır; çıkış yeniden bağlamaz", async () => {
  const f = fixture();
  const read = f.deps.readSession;
  f.deps.readSession = async () => { throw new Error("offline"); };
  await expect(f.runtime.sync(plans)).rejects.toThrow("offline");
  f.deps.readSession = read;
  f.time("16:40:31"); await f.runtime.tick();
  await Bun.sleep(0);
  expect(f.runtime.status().active).toBe(true);
  f.runtime.pause();
  f.time("16:41:31"); await f.runtime.tick();
  expect(f.runtime.status().active).toBe(false);
});

test("arka plan raporundaki kaynak bağlantı hatası mevcut oturumu koruyup yeniden giriş isteği üretir", async () => {
  const f = fixture();
  let unavailable = 0;
  const runtime = createNotificationRuntime({ ...f.deps,
    readReport: async () => { throw Object.assign(new Error("fixture offline"), { code: "CONNECTION_FAILED" }); },
    onUnavailable: () => { unavailable++; },
  });
  await runtime.sync(plans);
  await runtime.refresh();
  expect(runtime.status().active).toBe(true);
  expect(unavailable).toBe(1);
  expect(runtime.status().refreshError).not.toBe("");
  runtime.pause();
});

test("bağlantı kaldırılırken süren Telegram doğrulaması bağlantıyı geri getirmez", async () => {
  const f = fixture(); await f.runtime.sync(plans);
  let release!: () => void;
  f.deps.verifyTelegram = async () => {
    await new Promise<void>(resolve => { release = resolve; });
    return { token: "fixture", chatId: "12345", label: "@fixture" };
  };
  const connecting = f.runtime.connectTelegram({});
  const rejected = connecting.catch(error => error);
  await f.runtime.disconnectTelegram(); release();
  expect((await rejected).message).toContain("bağlantısı değişti");
  expect(f.runtime.status().telegram.connected).toBe(false);
  expect(f.records.get("a".repeat(64))?.telegram).toBeUndefined();
});

test("eski gönderim sonucu aynı hesaba yeniden bağlandıktan sonraki tercihleri ezmez", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.enable();
  let release!: () => void;
  let started!: () => void;
  const sending = new Promise<void>(resolve => { started = resolve; });
  f.deps.sendNative = async () => { started(); await new Promise<void>(resolve => { release = resolve; }); };
  f.time("16:50:00"); const tick = f.runtime.tick(); await sending;
  f.runtime.pause(); await f.runtime.sync(plans);
  await f.runtime.save({ ...defaultNotificationPreferences(), leadMinutes: 25 });
  release(); await tick;
  const stored = f.records.get("a".repeat(64))!;
  expect(stored.preferences.leadMinutes).toBe(25);
  expect(stored.preferences.approaching.native).toBe(false);
  expect(stored.deliveries["2026-10-21:approaching:native"]).toBeUndefined();
});

function fixture() {
  let clock = at("16:40:00");
  let identity: NotificationSession | null = { accountId: "a".repeat(64), expiresAt: at("23:59:00") };
  let offline = false;
  const records = new Map<string, NotificationAccount>();
  const sent: string[] = [];
  const goals: (NotificationGoal | null)[] = [];
  let reports = 0;
  const report: NotificationReport = {
    person: { id: "self", name: "Fixture", title: "", unit: "" }, from: "2026-10-19", to: "2026-10-25",
    fetchedAt: new Date(clock).toISOString(), notificationSession: identity,
    passages: [
      { date: "2026-10-19", time: "09:00:00", direction: "in" }, { date: "2026-10-19", time: "17:00:00", direction: "out" },
      { date: "2026-10-20", time: "09:00:00", direction: "in" }, { date: "2026-10-20", time: "17:00:00", direction: "out" },
      { date: "2026-10-21", time: "09:00:00", direction: "in" },
    ],
  };
  const store: NotificationStore = {
    async load(id) { return structuredClone(records.get(id) ?? emptyNotificationAccount()); },
    async save(id, value) { records.set(id, structuredClone(value)); },
  };
  const deps = {
    store, now: () => clock, nativeSupported: true, secureStorageAvailable: () => true,
    async readSession() { return identity; },
    async readReport() {
      reports++; if (offline) throw new Error("offline");
      return structuredClone({ ...report, notificationSession: identity });
    },
    seal: () => "encrypted", unseal: () => ({ token: "fixture", chatId: "12345", label: "@fixture" }),
    async verifyTelegram() { return { token: "fixture", chatId: "12345", label: "@fixture" }; },
    async sendNative() { sent.push("native"); },
    async sendTelegram() { sent.push("telegram"); },
    onChange() {}, onReport() {}, onGoal(goal: NotificationGoal | null) { goals.push(goal); },
  };
  const runtime = createNotificationRuntime(deps);
  const enable = async () => runtime.save({ ...defaultNotificationPreferences(), approaching: { native: true, telegram: true }, reached: { native: true, telegram: true } });
  return { runtime, deps, report, records, sent, goals, enable,
    time: (value: string) => { clock = at(value); }, offline: () => { offline = true; },
    identity: (value: NotificationSession | null) => { identity = value; }, reports: () => reports };
}

test.each(["NETWORK_ERROR", "SESSION_EXPIRED"])("geciken eski plan hatası yeni planı veya oturumu bozamaz (%s)", async code => {
  const f = fixture(); await f.runtime.sync(plans); await f.runtime.refresh();
  const read = f.deps.readSession;
  let rejectOld!: (error: Error) => void;
  f.deps.readSession = () => new Promise((_resolve, reject) => { rejectOld = reject; });
  const old = f.runtime.sync(plans).catch(error => error);
  let sessionReads = 0;
  f.deps.readSession = async () => { sessionReads++; return read(); };
  const nextPlans = JSON.stringify({ defaultPlan: [480, 480, 540, 480, 480, 0, 0], weekOverrides: {} });
  await f.runtime.sync(nextPlans);
  rejectOld(Object.assign(new Error("offline"), { code })); await old;
  f.time("16:40:31"); await f.runtime.tick(); await Bun.sleep(0);
  expect(f.goals.at(-1)?.at).toBe(at("18:00:00"));
  expect(f.runtime.status().active).toBe(true);
  expect(sessionReads).toBe(1);
});

test("eski senkronizasyonun bağlantısız yanıtı yeni doğrulanmış oturumu kapatamaz", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.runtime.refresh();
  const read = f.deps.readSession;
  let release!: (value: NotificationSession | null) => void;
  f.deps.readSession = () => new Promise(resolve => { release = resolve; });
  const old = f.runtime.sync(plans);
  f.deps.readSession = read;
  await f.runtime.sync(plans);
  release(null); await old;
  expect(f.runtime.status().active).toBe(true);
  expect(f.goals.at(-1)?.at).toBe(at("17:00:00"));
});

test.each(["önce", "sonra"])("oturum yenilenirken %s başlayan eski rapor yeni bildirim eşitlemesini iptal etmez", async order => {
  const f = fixture(); await f.runtime.sync(plans); await f.runtime.refresh();
  const renewed = { accountId: "a".repeat(64), expiresAt: at("23:59:30") };
  let releaseReport: ((value: NotificationReport) => void) | undefined;
  f.deps.readReport = () => new Promise(resolve => { releaseReport = resolve; });
  let pendingReport = order === "önce" ? f.runtime.refresh() : undefined;
  let releaseSync!: (value: NotificationSession | null) => void;
  f.deps.readSession = () => new Promise(resolve => { releaseSync = resolve; });
  const pendingSync = f.runtime.sync(plans);
  if (order === "sonra") pendingReport = f.runtime.refresh();
  releaseReport?.({ ...f.report, notificationSession: renewed });
  await pendingReport;
  releaseSync(renewed); await pendingSync;
  expect(f.runtime.status().active).toBe(true);
  f.runtime.pause();
});

test("oturum eşitlemesinden önce başlayan heartbeat hatası yeni oturumu kapatmaz", async () => {
  const f = fixture();
  let rejectHeartbeat!: (error: Error) => void;
  let expired = 0;
  const deps = { ...f.deps,
    heartbeat: () => new Promise<void>((_resolve, reject) => { rejectHeartbeat = reject; }),
    onExpired: () => { expired++; },
  };
  const runtime = createNotificationRuntime(deps);
  await runtime.sync(plans); await runtime.refresh(); await runtime.tick();
  let releaseSync!: (value: NotificationSession | null) => void;
  deps.readSession = () => new Promise(resolve => { releaseSync = resolve; });
  const pendingSync = runtime.sync(plans);
  rejectHeartbeat(Object.assign(new Error("old session"), { code: "SESSION_EXPIRED" }));
  await Bun.sleep(0);
  const renewed = { accountId: "a".repeat(64), expiresAt: at("23:59:30") };
  f.identity(renewed); releaseSync(renewed); await pendingSync;
  expect(runtime.status().active).toBe(true);
  expect(expired).toBe(0);
  runtime.pause();
});

test("etkin oturum eşitlemede bulunamazsa otomatik giriş için bitiş olayı üretilir", async () => {
  const f = fixture();
  let expired = 0;
  const runtime = createNotificationRuntime({ ...f.deps, onExpired: () => { expired++; } });
  await runtime.sync(plans); await runtime.refresh();
  f.identity(null);
  await runtime.sync(plans);
  expect(runtime.status().active).toBe(false);
  expect(expired).toBe(1);
  runtime.pause();
});

test("Keychain şifrelemeyi reddederse Telegram bağlantısı veya açık token kaydedilmez", async () => {
  const f = fixture(); await f.runtime.sync(plans);
  f.deps.seal = () => { throw new Error("Keychain access denied"); };
  await expect(f.runtime.connectTelegram({})).rejects.toThrow("Keychain access denied");
  expect(f.runtime.status().telegram.connected).toBe(false);
  expect(f.records.get("a".repeat(64))?.telegram).toBeUndefined();
  f.deps.seal = () => "encrypted";
  await f.runtime.connectTelegram({});
  expect(f.records.get("a".repeat(64))?.telegram).toBe("encrypted");
});

test("son bilinen açık girişte yenileme hatası iki kanalın hedef bildirimini durdurmaz", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.runtime.connectTelegram({}); await f.enable();
  f.time("16:50:00"); await f.runtime.tick();
  f.offline(); f.time("17:00:00"); await f.runtime.refresh(); await f.runtime.tick();
  expect(f.sent).toEqual(["native", "telegram", "native", "telegram"]);
  expect(f.runtime.status().refreshError).toContain("son alınan kayıt");
  await f.runtime.tick(); expect(f.sent).toHaveLength(4);
});

test("opt-in olmadan göndermez; 30 dakika yenilemesi seçili görünümden bağımsızdır", async () => {
  const f = fixture(); await f.runtime.sync(plans);
  f.time("16:50:00"); await f.runtime.tick(); expect(f.sent).toEqual([]);
  expect(f.reports()).toBe(1);
  f.time("17:10:00"); await f.runtime.tick(); expect(f.reports()).toBe(2);
  await f.runtime.tick(); expect(f.reports()).toBe(2);
});

test("başarılı yenilemede çıkış kaydı bekleyen bildirimi kaldırır", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.enable();
  f.report.passages.push({ date: "2026-10-21", time: "16:45:00", direction: "out" });
  await f.runtime.refresh(); f.time("16:50:00"); await f.runtime.tick();
  expect(f.sent).toEqual([]);
});

test("plan değişince yeni hedefi kullanır; rapor erişimi başarısız olsa da plan günceldir", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.enable(); f.offline();
  await f.runtime.sync(JSON.stringify({ defaultPlan: [480, 480, 540, 480, 480, 0, 0], weekOverrides: {} }));
  f.time("16:50:00"); await f.runtime.tick(); expect(f.sent).toEqual([]);
  f.time("17:50:00"); await f.runtime.tick(); expect(f.sent).toEqual(["native"]);
});

test("kalıcı gönderim kaydı yeniden açılış ve aynı hedefte ikinci gönderimi engeller", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.enable();
  f.time("16:50:00"); await f.runtime.tick();
  expect(f.sent).toEqual(["native"]);
  const reopened = createNotificationRuntime(f.deps);
  await reopened.sync(plans); await reopened.tick();
  expect(f.sent).toEqual(["native"]);
  expect(f.records.get("a".repeat(64))!.deliveries["2026-10-21:approaching:native"].state).toBe("accepted");
});

test("ön süre değişikliği bugünkü iki kanalın kaydını sıfırlar; yeni eşik yeniden açılıştan sonra da gönderilir", async () => {
  const f = fixture();
  const accountId = "a".repeat(64);
  const previous = emptyNotificationAccount();
  previous.deliveries["2026-10-20:approaching:telegram"] = { state: "accepted", attempts: 1, retryAt: 0 };
  f.records.set(accountId, previous);
  f.time("14:00:00");
  await f.runtime.sync(plans); await f.runtime.refresh(); await f.runtime.connectTelegram({});
  const preferences = { ...defaultNotificationPreferences(), leadMinutes: 45, approaching: { native: true, telegram: true } };
  await f.runtime.save(preferences);
  f.time("16:15:00"); await f.runtime.tick();
  expect(f.sent).toEqual(["native", "telegram"]);
  f.time("16:20:00"); await f.runtime.save({ ...preferences, leadMinutes: 25 });
  expect(Object.keys(f.records.get(accountId)!.deliveries)).toEqual(["2026-10-20:approaching:telegram"]);
  const reopened = createNotificationRuntime(f.deps);
  await reopened.sync(plans); await reopened.refresh();
  f.time("16:35:00"); await reopened.tick(); await reopened.tick();
  expect(f.sent).toEqual(["native", "telegram", "native", "telegram"]);
});

test("aynı tercihleri kaydetmek gönderim kaydını ve yaklaşan eşiğin uygunluğunu değiştirmez", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.runtime.refresh(); await f.enable();
  const preferences = f.runtime.status().preferences;
  f.time("16:50:10"); await f.runtime.save(preferences); await f.runtime.tick();
  expect(f.sent).toEqual(["native"]);
  const deliveries = structuredClone(f.records.get("a".repeat(64))!.deliveries);
  await f.runtime.save(preferences); await f.runtime.tick();
  expect(f.records.get("a".repeat(64))!.deliveries).toEqual(deliveries);
  expect(f.sent).toEqual(["native"]);
});

test("kanal tercihi değişikliği tekrar kaydını sıfırlar; geçmiş eşik hemen gönderilmez", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.runtime.refresh(); await f.enable();
  f.time("16:50:00"); await f.runtime.tick();
  const preferences = f.runtime.status().preferences;
  f.time("16:50:10");
  await f.runtime.save({ ...preferences, approaching: { ...preferences.approaching, telegram: false } });
  await f.runtime.tick();
  expect(f.sent).toEqual(["native"]);
  expect(f.records.get("a".repeat(64))!.deliveries).toEqual({});
  await f.runtime.sync(JSON.stringify({ defaultPlan: [480, 480, 490, 480, 480, 0, 0], weekOverrides: {} }));
  f.time("17:00:00"); await f.runtime.tick();
  expect(f.sent).toEqual(["native", "native"]);
});

test.each(["başarılı", "hatalı"])("ayar değişirken tamamlanan eski gönderim kaydı veya hatayı geri yazmaz (%s)", async outcome => {
  const f = fixture(); await f.runtime.sync(plans); await f.runtime.refresh(); await f.runtime.connectTelegram({}); await f.enable();
  let release!: () => void;
  let started!: () => void;
  const sending = new Promise<void>(resolve => { started = resolve; });
  f.deps.sendNative = async () => {
    f.sent.push("native"); started();
    await new Promise<void>(resolve => { release = resolve; });
    if (outcome === "hatalı") throw new DeliveryError("old delivery failed", null, true);
  };
  f.time("16:50:00"); const tick = f.runtime.tick(); await sending;
  f.time("16:51:00"); await f.runtime.save({ ...f.runtime.status().preferences, leadMinutes: 5 });
  release(); await tick;
  expect(f.sent).toEqual(["native"]);
  expect(f.records.get("a".repeat(64))!.deliveries).toEqual({});
  expect(f.runtime.status().deliveryErrors).toEqual({});
  f.deps.sendNative = async () => { f.sent.push("native"); };
  f.time("16:55:00"); await f.runtime.tick();
  expect(f.sent).toEqual(["native", "native", "telegram"]);
});

test("tercih kaydı başarısızsa mevcut tercihler ve gönderim engeli korunur", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.runtime.refresh(); await f.enable();
  f.time("16:50:00"); await f.runtime.tick();
  const preferences = f.runtime.status().preferences;
  const stored = structuredClone(f.records.get("a".repeat(64))!);
  const save = f.deps.store.save;
  f.deps.store.save = async () => { throw new Error("disk"); };
  await expect(f.runtime.save({ ...preferences, leadMinutes: 5 })).rejects.toThrow("disk");
  f.deps.store.save = save;
  expect(f.runtime.status().preferences).toEqual(preferences);
  expect(f.records.get("a".repeat(64))).toEqual(stored);
  await f.runtime.tick(); expect(f.sent).toEqual(["native"]);
});

test("tercih sıfırlaması diskte korunur; eski gönderimin sonucu yeniden bağlanınca kaydı geri getirmez", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-notification-reset-"));
  const f = fixture();
  f.deps.store = createNotificationStore(directory);
  try {
    await f.runtime.sync(plans); await f.runtime.refresh(); await f.enable();
    let release!: () => void;
    let started!: () => void;
    const sending = new Promise<void>(resolve => { started = resolve; });
    f.deps.sendNative = async () => { f.sent.push("native"); started(); await new Promise<void>(resolve => { release = resolve; }); };
    f.time("16:50:00"); const tick = f.runtime.tick(); await sending;
    f.runtime.pause(); await f.runtime.sync(plans);
    f.time("16:51:00"); await f.runtime.save({ ...f.runtime.status().preferences, leadMinutes: 5 });
    release(); await tick;
    const stored = await f.deps.store.load("a".repeat(64));
    expect(stored.preferences.leadMinutes).toBe(5);
    expect(stored.deliveries).toEqual({});
    f.deps.sendNative = async () => { f.sent.push("native"); };
    const reopened = createNotificationRuntime(f.deps);
    await reopened.sync(plans); await reopened.refresh();
    f.time("16:55:00"); await reopened.tick(); await reopened.tick();
    expect(f.sent).toEqual(["native", "native"]);
  } finally {
    f.runtime.pause();
    await rm(directory, { recursive: true, force: true });
  }
});

test("uyku dönüşünde eski eşikleri göndermez; sonraki hedef çalışır", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.enable();
  f.time("16:50:20"); await f.runtime.resume(); expect(f.sent).toEqual([]);
  f.time("17:00:00"); await f.runtime.tick(); expect(f.sent).toEqual(["native"]);
});

test("hesap değişiminde tercihler ayrılır; TTL ve çıkış bütün gönderimleri durdurur", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.enable();
  f.identity({ accountId: "b".repeat(64), expiresAt: at("16:55:00") }); await f.runtime.sync(plans);
  expect(f.runtime.status().preferences.reached.native).toBe(false);
  await f.enable(); f.time("17:00:00"); await f.runtime.tick(); expect(f.sent).toEqual([]);
  expect(f.runtime.status().active).toBe(false);
});

test("Telegram reddi native gönderimi durdurmaz; belirsiz sonuç otomatik tekrarlanmaz", async () => {
  const f = fixture();
  f.deps.sendTelegram = async () => { f.sent.push("telegram-attempt"); throw new DeliveryError("timeout", null, true); };
  await f.runtime.sync(plans); await f.runtime.connectTelegram({}); await f.enable();
  f.time("16:50:00"); await f.runtime.tick(); await f.runtime.tick();
  expect(f.sent).toEqual(["native", "telegram-attempt"]);
  expect(f.records.get("a".repeat(64))!.deliveries["2026-10-21:approaching:telegram"].state).toBe("unknown");
});

test("hız sınırında bekleme ve üç deneme sınırı bildirim geçerliliği içinde uygulanır", async () => {
  const f = fixture();
  f.deps.sendTelegram = async () => { f.sent.push("attempt"); throw new DeliveryError("rate limit", 1000); };
  await f.runtime.sync(plans); await f.runtime.connectTelegram({}); await f.enable();
  for (const time of ["16:50:00", "16:50:00", "16:50:01", "16:50:02", "16:50:03"]) { f.time(time); await f.runtime.tick(); }
  expect(f.sent).toEqual(["native", "attempt", "attempt", "attempt"]);
});

test("kalıcı kayıt yazılamıyorsa göndermez ve kullanıcıya hatayı gösterir", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.enable();
  f.deps.store.save = async () => { throw new Error("disk"); };
  f.time("16:50:00"); await f.runtime.tick(); expect(f.sent).toEqual([]);
  expect(f.runtime.status().refreshError).toContain("yazılamadı");
});

test.each(["başarısız", "tamamlanan"])("hesap değişirken %s eski kayıt yeni oturumu etkilemez", async outcome => {
  const f = fixture();
  const changes: NotificationStatus[] = [];
  const runtime = createNotificationRuntime({ ...f.deps, onChange: status => { changes.push(status); } });
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  let started!: () => void;
  let release!: () => void;
  let reject!: (error: Error) => void;
  const writing = new Promise<void>(resolve => { started = resolve; });
  const blocked = new Promise<void>((resolve, fail) => { release = resolve; reject = fail; });
  let tick: Promise<void> | undefined;
  try {
    await runtime.sync(plans); await runtime.refresh();
    await runtime.save({ ...defaultNotificationPreferences(), approaching: { native: true, telegram: false } });
    const save = f.deps.store.save;
    f.deps.store.save = async (id, value) => {
      if (id === "a".repeat(64)) { started(); await blocked; }
      await save(id, value);
    };
    f.time("16:50:00"); tick = runtime.tick(); await writing;
    f.identity({ accountId: "b".repeat(64), expiresAt: at("23:59:00") });
    await runtime.sync(plans); await runtime.refresh();
    const newSessionChanges = changes.length;
    if (outcome === "başarısız") reject(new Error("fixture disk failure")); else release();
    await tick;
    expect(runtime.status().active).toBe(true);
    expect(runtime.status().refreshError).toBe("");
    expect(changes.slice(newSessionChanges).every(status => status.refreshError === "")).toBe(true);
    expect(f.sent).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(outcome === "başarısız" ? 1 : 0);
    await runtime.save({ ...defaultNotificationPreferences(), reached: { native: true, telegram: false } });
    f.time("17:00:00"); await runtime.tick();
    expect(f.sent).toEqual(["native"]);
  } finally {
    release();
    await tick;
    runtime.pause();
    warn.mockRestore();
  }
});

test("geciken rapor yanıtı durdurulmuş oturumu canlandıramaz", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.enable();
  let release!: (value: Awaited<ReturnType<typeof f.deps.readReport>>) => void;
  f.deps.readReport = () => new Promise(resolve => { release = resolve; });
  const pending = f.runtime.refresh(); await new Promise(resolve => setTimeout(resolve, 0));
  f.runtime.pause(); release(f.report); await pending;
  expect(f.runtime.status().active).toBe(false); f.time("16:50:00"); await f.runtime.tick(); expect(f.sent).toEqual([]);
});

test("yanıt vermeyen rapor yenilemesi hedef anındaki bildirimi bekletemez", async () => {
  const f = fixture(); await f.runtime.sync(plans); await f.runtime.refresh(); await f.enable();
  let release!: (value: Awaited<ReturnType<typeof f.deps.readReport>>) => void;
  f.deps.readReport = () => new Promise(resolve => { release = resolve; });
  const pending = f.runtime.refresh();
  f.time("16:50:00"); await f.runtime.tick();
  expect(f.sent).toEqual(["native"]);
  release(f.report); await pending;
});

test("menü çubuğu hedefi bildirimlerin ortak planından gelir, çıkış ve oturum sonunda silinir", async () => {
  const f = fixture();
  await f.runtime.sync(plans);
  await f.runtime.refresh();
  expect(f.goals.at(-1)).toEqual({ date: "2026-10-21", at: at("17:00:00") });
  f.time("16:59:00");
  await f.runtime.tick();
  expect(f.goals.at(-1)?.at).toBe(at("17:00:00"));
  f.report.passages.push({ date: "2026-10-21", time: "16:59:30", direction: "out" });
  await f.runtime.refresh();
  expect(f.goals.at(-1)).toBeNull();
  f.runtime.pause();
  expect(f.goals.at(-1)).toBeNull();
});
