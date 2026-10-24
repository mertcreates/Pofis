const { expect, test } = require("bun:test");
const { EventEmitter } = require("node:events");
const { createScenarioRuntime, desktopScenarios, reportAccess } = require("../src/desktop/scenario-runtime.ts");
const { createScenarioTransport, scenarioMenu, installScenarioClock } = require("./scenarios.cjs");
const { ORIGIN } = require("./server.cjs");
const realNow = () => Date.parse("2026-10-24T10:00:00+03:00");
const reportPath = "/api/report?person=self&from=2026-10-19&to=2026-10-25";

test("senaryo HTTP adaptörü API isteklerini canlı kaynağa iletmez; bağlantı/oturum geçişleri toparlanır", async () => {
  const runtime = createScenarioRuntime({ realNow });
  let forwarded = [];
  const respond = createScenarioTransport({ runtime, reportAccess, transport: request => { forwarded.push(request.url); return new Response("page"); } });
  const request = (path, method = "GET") => respond(new Request(ORIGIN + path, { method }));
  expect(await (await request("/")).text()).toBe("page");
  const report = await (await request(reportPath)).json();
  expect(report.person.name).toBe("Senaryo · Mesai sürüyor");
  expect(report.notificationSession).toEqual((await (await request("/api/session")).json()).notificationSession);
  expect((await request("/api/session", "POST")).status).toBe(200);
  runtime.setCondition("offline", true);
  expect(await (await request(reportPath)).json()).toMatchObject({ code: "NETWORK_ERROR" });
  expect((await (await request("/api/session")).json()).connected).toBe(true);
  runtime.setCondition("offline", false);
  expect((await request(reportPath)).status).toBe(200);
  expect((await request("/api/anything")).status).toBe(503);
  expect((await request("/api/report")).status).toBe(400);
  expect((await respond(new Request("http://other.invalid/"))).status).toBe(403);
  expect((await request("/api/session", "DELETE")).status).toBe(200);
  expect((await request(reportPath)).status).toBe(401);
  runtime.setCondition("expired", false);
  expect((await request(reportPath)).status).toBe(200);
  expect(forwarded).toEqual([ORIGIN + "/"]);
});

test("bekleyen eski senaryo yanıtı yeni durumu başarılı veriyle ezemez", async () => {
  const runtime = createScenarioRuntime({ realNow });
  let release;
  runtime.setCondition("slow", true);
  const respond = createScenarioTransport({ runtime, reportAccess, transport: () => { throw new Error("unexpected source"); },
    delay: () => new Promise(resolve => { release = resolve; }) });
  const old = respond(new Request(ORIGIN + reportPath));
  runtime.select("leave"); release();
  expect((await old).status).toBe(409);
  const current = await respond(new Request(ORIGIN + reportPath));
  expect((await current.json()).person.name).toBe("Senaryo · İzinli gün");
});

test("örnek rapor merkezi kişi ve tarih sınırlarını uygular; isteklerde plan kopyalanmaz", async () => {
  const runtime = createScenarioRuntime({ realNow });
  runtime.snapshot = () => { throw new Error("HTTP isteği plan girdilerini kopyalamamalı."); };
  const respond = createScenarioTransport({ runtime, reportAccess,
    transport: () => { throw new Error("unexpected source"); } });
  for (const query of [
    "person=other&from=2026-10-19&to=2026-10-25",
    "from=2026-10-19&to=2026-10-25",
    "person=self&from=2026-02-30&to=2026-03-01",
    "person=self&from=2026-10-25&to=2026-10-19",
    "person=self&from=2026-01-01&to=2026-04-04",
  ]) {
    const response = await respond(new Request(`${ORIGIN}/api/report?${query}`));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_INPUT");
  }
  // The inclusive 93-day boundary remains valid.
  expect((await respond(new Request(`${ORIGIN}/api/report?person=self&from=2026-01-01&to=2026-04-03`))).status).toBe(200);
});

test("native menü seçim ve koşulları aynı runtime'a uygular; sıfırlama yeni profil girdisi üretir", () => {
  const runtime = createScenarioRuntime({ realNow });
  let reloads = 0, refreshes = 0;
  const items = () => scenarioMenu({ runtime, desktopScenarios, reload: () => reloads++, refresh: () => refreshes++ })[0].submenu;
  items().find(item => item.label === "İzinli gün").click();
  expect(runtime.snapshot().id).toBe("leave"); expect(reloads).toBe(1);
  items().find(item => item.label === "Bağlantı kesildi").click({ checked: true });
  expect(runtime.snapshot().conditions.offline).toBe(true); expect(refreshes).toBe(1);
  const revision = runtime.snapshot().revision;
  items().find(item => item.label === "Senaryoyu sıfırla").click();
  expect(runtime.snapshot().conditions.offline).toBe(false);
  expect(runtime.snapshot().revision).not.toBe(revision); expect(reloads).toBe(2);
});

test("senaryo saati yalnız tanınan ana frame'e verilir; IPC dinleyicisi temizlenir", () => {
  const ipcMain = new EventEmitter();
  const runtime = createScenarioRuntime({ realNow });
  const mainFrame = { url: ORIGIN + "/" };
  const sender = { mainFrame };
  let destroyed = false;
  const stop = installScenarioClock({ ipcMain, runtime, getWindows: () => [{ isDestroyed: () => destroyed, webContents: sender }] });
  const read = (source = sender, frame = mainFrame) => {
    let reply;
    let replied = false;
    const event = { sender: source, senderFrame: frame };
    Object.defineProperty(event, "returnValue", { set(value) {
      if (replied) throw new Error("IPC yanıtı yalnız bir kez gönderilebilir.");
      replied = true; reply = value;
    } });
    ipcMain.emit("pofis:scenario:clock", event); return reply;
  };
  expect(read().revision).toBe(runtime.snapshot().revision);
  expect(read(sender, { url: ORIGIN + "/" })).toBeNull();
  expect(read({ mainFrame })).toBeNull();
  mainFrame.url = ""; expect(read()).toBeNull();
  mainFrame.url = "about:blank"; expect(read()).toBeNull();
  mainFrame.url = "https://other.invalid"; expect(read()).toBeNull();
  mainFrame.url = ORIGIN; destroyed = true; expect(read()).toBeNull();
  stop(); expect(ipcMain.listenerCount("pofis:scenario:clock")).toBe(0);
});
