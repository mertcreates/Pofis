const { test, expect } = require("bun:test");
const { checkForUpdates } = require("./updates.cjs");
const { platformTarget } = require("./platform.cjs");
const { MAC_INSTALL_COMMAND } = require("../scripts/electron/install-command.cjs");

function fixture(platform = "win32", arch = "x64", version = "0.1.1") {
  const target = platformTarget(platform, arch);
  const manifest = { schemaVersion: 1, platform, arch, version, size: 42, sha256: "a".repeat(64),
    url: `https://github.com/mertcreates/pofis-landing/releases/download/v${version}/Pofis-${version}-${target.id}.zip` };
  const dialogs = [], copies = [], requests = [];
  const options = {
    target, currentVersion: "0.1.0", isActive: () => true,
    fetchManifest: async (...request) => { requests.push(request); return Response.json(manifest); },
    showMessageBox: async dialog => { dialogs.push(dialog); return { response: 0 }; },
    writeClipboard: text => copies.push(text),
  };
  return { manifest, dialogs, copies, requests, options };
}

test.each([
  ["win32", "x64", "windows", "irm https://pofis.app/install.ps1 | iex"],
  ["darwin", "arm64", "macos/arm64", MAC_INSTALL_COMMAND],
  ["darwin", "x64", "macos/x64", MAC_INSTALL_COMMAND],
])("%s/%s kendi manifestini denetler; yalnız sabit kurulum komutunu kopyalar", async (platform, arch, path, command) => {
  const f = fixture(platform, arch);
  await checkForUpdates(f.options);
  expect(f.requests).toHaveLength(1);
  expect(f.requests[0][0]).toBe(`https://pofis.app/releases/${path}/latest.json`);
  expect(f.requests[0][1]).toMatchObject({ cache: "no-store", credentials: "omit", redirect: "error" });
  expect(f.requests[0][1].signal).toBeInstanceOf(AbortSignal);
  expect(f.dialogs).toHaveLength(1);
  expect(f.dialogs[0]).toMatchObject({ defaultId: 1, cancelId: 1 });
  expect(f.copies).toEqual([command]);
});

test.each(["0.1.0", "0.0.9", "0.0.99"])("aynı veya eski %s sürümünde bildirim gösterilmez", async version => {
  const f = fixture("win32", "x64", version);
  await checkForUpdates(f.options);
  expect(f.dialogs).toEqual([]);
  expect(f.copies).toEqual([]);
});

test.each([
  ["0.1.9", "0.1.10"], ["0.9.99", "0.10.0"], ["0.99.99", "1.0.0"],
])("%s → %s sürümü sayısal karşılaştırılır", async (current, next) => {
  const f = fixture("win32", "x64", next);
  f.options.currentVersion = current;
  await checkForUpdates(f.options);
  expect(f.dialogs).toHaveLength(1);
});

test("daha sonra veya pencereyi kapatma yanıtı panoyu değiştirmez", async () => {
  const f = fixture();
  f.options.showMessageBox = async () => ({ response: 1 });
  await checkForUpdates(f.options);
  expect(f.copies).toEqual([]);
});

test("kapalı uygulamada istek yapılmaz; istek veya dialog sırasında kapanırsa işlem devam etmez", async () => {
  const f = fixture();
  let active = false;
  f.options.isActive = () => active;
  await checkForUpdates(f.options);
  expect(f.requests).toEqual([]);
  active = true;
  f.options.fetchManifest = async () => { active = false; return Response.json(f.manifest); };
  await checkForUpdates(f.options);
  expect(f.dialogs).toEqual([]);
  active = true;
  f.options.fetchManifest = async () => Response.json(f.manifest);
  f.options.showMessageBox = async () => { active = false; return { response: 0 }; };
  await checkForUpdates(f.options);
  expect(f.copies).toEqual([]);
});

test("bozuk veya hedefe uymayan manifestler bildirim ve pano işlemine ulaşmaz", async () => {
  const f = fixture();
  for (const invalid of [null, {}, { ...f.manifest, schemaVersion: 2 },
    { ...f.manifest, platform: "darwin" }, { ...f.manifest, arch: "arm64" },
    { ...f.manifest, version: "0.1.2-beta" }, { ...f.manifest, version: "0.01.2" },
    { ...f.manifest, version: "9007199254740992.0.0" }, { ...f.manifest, size: -1 },
    { ...f.manifest, sha256: "bad" }, { ...f.manifest, url: "https://example.com/app.zip" }]) {
    await expect(checkForUpdates({ ...f.options, fetchManifest: async () => Response.json(invalid) })).rejects.toThrow();
  }
  expect(f.dialogs).toEqual([]);
  expect(f.copies).toEqual([]);
});

test("HTTP, JSON ve ağ hataları bildirim veya panoya ulaşmaz", async () => {
  const f = fixture();
  for (const fetchManifest of [async () => new Response("missing", { status: 404 }),
    async () => new Response("not json"), async () => { throw new Error("offline"); }]) {
    await expect(checkForUpdates({ ...f.options, fetchManifest })).rejects.toThrow();
  }
  expect(f.dialogs).toEqual([]);
  expect(f.copies).toEqual([]);
});

test("yanıt vermeyen istek beş saniyede iptal edilir", async () => {
  const f = fixture();
  f.options.fetchManifest = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
  await expect(checkForUpdates(f.options)).rejects.toThrow();
  expect(f.dialogs).toEqual([]);
}, 7000);
