const { test, expect } = require("bun:test");
const { join } = require("node:path");
const { platformTarget } = require("./platform.cjs");
const { releaseManifest } = require("../scripts/electron/release.cjs");
const { stopProcessTree } = require("./server.cjs");

test.each(["x64", "arm64"])("macOS %s aynı paket ve runtime sözleşmesini kullanır", arch => {
  const target = platformTarget("darwin", arch);
  expect(target.id).toBe(`darwin-${arch}`);
  expect(target.releaseDirectory).toBe(join("macos", arch));
  expect(target.resources).toBe(join("Pofis.app", "Contents", "Resources"));
  expect(target.executable).toBe(join("Pofis.app", "Contents", "MacOS", "Pofis"));
  expect(target.electronExecutable).toBe(join("Electron.app", "Contents", "MacOS", "Electron"));
  expect(target.metadataFile).toBe(join("Pofis.app", "Contents", "Resources", "release.json"));
  expect(releaseManifest(target, "1.2.3", 42, "hash")).toEqual({
    schemaVersion: 1, platform: "darwin", arch, version: "1.2.3", size: 42, sha256: "hash",
    url: `1.2.3/Pofis-1.2.3-darwin-${arch}.zip`,
  });
});

test("Windows x64 paketi mevcut installer sözleşmesini korur", () => {
  const target = platformTarget("win32", "x64");
  expect(target.resources).toBe("resources");
  expect(target.executable).toBe("Pofis.exe");
  expect(target.metadataFile).toBe("release.json");
  expect(releaseManifest(target, "1.0.0", 5, "abc").url).toBe("1.0.0/Pofis-1.0.0-win32-x64.zip");
  expect(() => platformTarget("linux", "arm64")).toThrow("Desteklenmeyen");
  expect(() => platformTarget("darwin", "ia32")).toThrow("Desteklenmeyen");
});

test("Linux x64 kullanıcı kurulumu ve tar.gz dağıtımı için kendi yollarını kullanır", () => {
  const target = platformTarget("linux", "x64");
  expect(target.executable).toBe("pofis");
  expect(target.electronExecutable).toBe("electron");
  expect(target.resources).toBe("resources");
  expect(target.releaseDirectory).toBe(join("linux", "x64"));
  expect(target.installer).toBe("install-linux.sh");
  expect(releaseManifest(target, "1.2.3", 42, "hash").url).toBe("1.2.3/Pofis-1.2.3-linux-x64.tar.gz");
});

test.each([false, true])("lideri çıkmış macOS grubunu kapatır; dirençli alt süreçte SIGKILL: %s", async stubborn => {
  const signals = [];
  let alive = true;
  const kill = (pid, signal) => {
    expect(pid).toBe(-12345);
    if (!alive) throw Object.assign(new Error("gone"), { code: "ESRCH" });
    if (signal !== 0) signals.push(signal);
    if (signal === "SIGKILL" || (!stubborn && signal === "SIGTERM")) alive = false;
  };
  await stopProcessTree({ pid: 12345, exitCode: 0, signalCode: null },
    { platform: "darwin", processGroup: true, kill, timeoutMs: 1 });
  expect(signals).toEqual(stubborn ? ["SIGTERM", "SIGKILL"] : ["SIGTERM"]);
  expect(alive).toBe(false);
});

test("macOS süreç kapatma hatasını gizlemez", async () => {
  await expect(stopProcessTree({ pid: 7, exitCode: null, signalCode: null }, {
    platform: "darwin", processGroup: true,
    kill() { throw Object.assign(new Error("permission denied"), { code: "EPERM" }); },
  })).rejects.toThrow("permission denied");
});
