import { expect, test } from "bun:test";
import { createNotificationRuntime } from "./notification-runtime";
import { emptyNotificationAccount, type NotificationAccount, type NotificationStore } from "./notification-store";
import { emptyWorkPlans } from "@/domain/rules/work-plan";
import { defaultNotificationPreferences } from "@/domain/rules/notifications";
import type { NotificationReport, NotificationSession } from "./notification-contract";
import { DeliveryError } from "./telegram";

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
  expect(stored.deliveries["2026-10-21:approaching:native"].state).toBe("accepted");
});

function fixture() {
  let clock = at("16:40:00");
  let identity: NotificationSession | null = { accountId: "a".repeat(64), expiresAt: at("23:59:00") };
  let offline = false;
  const records = new Map<string, NotificationAccount>();
  const sent: string[] = [];
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
    onChange() {}, onReport() {},
  };
  const runtime = createNotificationRuntime(deps);
  const enable = async () => runtime.save({ ...defaultNotificationPreferences(), approaching: { native: true, telegram: true }, reached: { native: true, telegram: true } });
  return { runtime, deps, report, records, sent, enable,
    time: (value: string) => { clock = at(value); }, offline: () => { offline = true; },
    identity: (value: NotificationSession | null) => { identity = value; }, reports: () => reports };
}

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
