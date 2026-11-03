const { test, expect } = require("bun:test");
const { checkForUpdates } = require("./updates.cjs");
const { platformTarget } = require("./platform.cjs");
const { installUpdateBridge } = require("./update-bridge.cjs");
const { ORIGIN } = require("./server.cjs");

function fixture(platform = "win32", arch = "x64", version = "0.1.1") {
  const target = platformTarget(platform, arch);
  const manifest = { schemaVersion: 1, platform, arch, version, size: 42, sha256: "a".repeat(64),
    url: `https://github.com/mertcreates/pofis-landing/releases/download/v${version}/Pofis-${version}-${target.id}.${target.archiveExtension}` };
  const requests = [];
  const options = { target, currentVersion: "0.1.0", isActive: () => true,
    fetchManifest: async (...request) => { requests.push(request); return Response.json(manifest); } };
  return { manifest, requests, options };
}
test.each([["win32", "x64", "windows"], ["darwin", "arm64", "macos/arm64"], ["darwin", "x64", "macos/x64"], ["linux", "x64", "linux/x64"]])(
  "%s/%s kendi manifestini denetler", async (platform, arch, path) => {
    const f = fixture(platform, arch);
    expect(await checkForUpdates(f.options)).toEqual({ currentVersion: "0.1.0", version: "0.1.1", platform });
    expect(f.requests[0][0]).toBe(`https://pofis.app/releases/${path}/latest.json`);
    expect(f.requests[0][1]).toMatchObject({ cache: "no-store", credentials: "omit", redirect: "error" });
    expect(f.requests[0][1].signal).toBeInstanceOf(AbortSignal);
  });
test.each(["0.1.0", "0.0.9", "0.0.99"])("aynı veya eski %s sürümü bildirilmez", async version => {
  expect(await checkForUpdates(fixture("win32", "x64", version).options)).toBeUndefined();
});
test.each([["0.1.9", "0.1.10"], ["0.9.99", "0.10.0"], ["0.99.99", "1.0.0"]])(
  "%s → %s sayısal karşılaştırılır", async (current, next) => {
    const f = fixture("win32", "x64", next);
    expect(await checkForUpdates({ ...f.options, currentVersion: current })).toMatchObject({ version: next });
  });
test("kapalı uygulamada istek yapılmaz; istek sırasında kapanırsa sonuç bırakılır", async () => {
  const f = fixture();
  expect(await checkForUpdates({ ...f.options, isActive: () => false })).toBeUndefined();
  expect(f.requests).toHaveLength(0);
  let active = true;
  expect(await checkForUpdates({ ...f.options, isActive: () => active,
    fetchManifest: async () => { active = false; return Response.json(f.manifest); } })).toBeUndefined();
});
test("bozuk veya hedefe uymayan manifestler reddedilir", async () => {
  const f = fixture();
  for (const invalid of [null, {}, { ...f.manifest, schemaVersion: 2 },
    { ...f.manifest, platform: "darwin" }, { ...f.manifest, arch: "arm64" },
    { ...f.manifest, version: "0.1.2-beta" }, { ...f.manifest, version: "0.01.2" },
    { ...f.manifest, version: "9007199254740992.0.0" }, { ...f.manifest, size: -1 },
    { ...f.manifest, size: 2 ** 31 }, { ...f.manifest, size: 1.5 },
    { ...f.manifest, sha256: "bad" }, { ...f.manifest, url: "https://example.com/app.zip" }]) {
    await expect(checkForUpdates({ ...f.options, fetchManifest: async () => Response.json(invalid) })).rejects.toThrow();
  }
});
test("güncelleme manifestinde üst boyut sınırının altındaki değer kabul edilir", async () => {
  const f = fixture();
  f.manifest.size = 2 ** 31 - 1;
  expect(await checkForUpdates(f.options)).toMatchObject({ version: "0.1.1" });
});
test("HTTP, JSON ve ağ hataları reddedilir", async () => {
  for (const fetchManifest of [async () => new Response("missing", { status: 404 }),
    async () => new Response("not json"), async () => { throw new Error("offline"); }]) {
    await expect(checkForUpdates({ ...fixture().options, fetchManifest })).rejects.toThrow();
  }
});
test("yanıt vermeyen istek zaman aşımında iptal edilir", async () => {
  await expect(checkForUpdates({ ...fixture().options, timeoutMs: 50,
    fetchManifest: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }) })).rejects.toThrow();
}, 1000);

function bridgeFixture(platform = "win32", isPackaged = true) {
  const handlers = {}, copies = [], events = [];
  const contents = { isDestroyed: () => false, mainFrame: { url: ORIGIN }, send: (...args) => events.push(args) };
  const publish = installUpdateBridge({ ipcMain: { handle: (name, handler) => { handlers[name] = handler; } },
    getWindow: () => ({ webContents: contents }), isPackaged, platform, writeClipboard: value => copies.push(value) });
  return { handlers, copies, events, contents, event: { sender: contents, senderFrame: contents.mainFrame }, publish };
}
test.each([["win32", "irm https://pofis.app/install.ps1 | iex"],
  ["darwin", "curl -fsSL https://pofis.app/install.sh | bash"], ["linux", "curl -fsSL https://pofis.app/install.sh | bash"]])(
  "%s köprüsü bilgiyi saklar ve yalnız kullanıcı isteğinde sabit komutu kopyalar", (platform, command) => {
    const f = bridgeFixture(platform);
    expect(f.handlers["pofis:update:get"](f.event)).toBeNull();
    expect(() => f.handlers["pofis:update:copy"](f.event)).toThrow();
    f.publish({ version: "0.1.1", currentVersion: "0.1.0", platform, command: "untrusted" });
    expect(f.copies).toEqual([]);
    expect(f.events).toEqual([["pofis:update:available", { version: "0.1.1", currentVersion: "0.1.0", platform, command }]]);
    expect(f.handlers["pofis:update:get"](f.event)).toEqual(f.events[0][1]);
    f.handlers["pofis:update:copy"](f.event);
    expect(f.copies).toEqual([command]);
  });
test("başka pencere, alt çerçeve, yabancı origin ve geliştirme IPC istekleri reddedilir", () => {
  const f = bridgeFixture();
  f.publish({ version: "0.1.1" });
  for (const event of [{ ...f.event, sender: {} }, { ...f.event, senderFrame: { url: ORIGIN } }])
    for (const handler of Object.values(f.handlers)) expect(() => handler(event)).toThrow();
  f.contents.mainFrame.url = "https://example.com";
  for (const handler of Object.values(f.handlers)) expect(() => handler(f.event)).toThrow();
  f.contents.mainFrame.url = ORIGIN;
  f.contents.isDestroyed = () => true;
  for (const handler of Object.values(f.handlers)) expect(() => handler(f.event)).toThrow();
  const dev = bridgeFixture("win32", false);
  for (const handler of Object.values(dev.handlers)) expect(() => handler(dev.event)).toThrow();
  expect(f.copies).toEqual([]);
});
