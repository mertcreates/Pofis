const { test, expect } = require("bun:test");
const { mkdtemp, mkdir, writeFile, rm, chmod, unlink } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { checkLinuxPackage } = require("./linux-static-check.cjs");
const { verifyRuntime } = require("./package.cjs");

function elf(machine = 62) {
  const bytes = Buffer.alloc(64);
  bytes.write("\x7fELF"); bytes[4] = 2; bytes[5] = 1;
  bytes.writeUInt16LE(machine, 18);
  return bytes;
}

test("Linux runtime sürüm ve ELF mimarisini ikiliyi çalıştırmadan doğrular", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-linux-runtime-"));
  const target = { platform: "linux", arch: "x64", electronExecutable: "electron" };
  const execute = () => { throw new Error("Linux runtime macOS üzerinde çalıştırılmamalı."); };
  try {
    await writeFile(join(directory, "version"), "44.1.0\n");
    await writeFile(join(directory, "electron"), elf());
    await verifyRuntime(directory, target, "44.1.0", execute);
    await expect(verifyRuntime(directory, target, "43.8.1", execute)).rejects.toThrow("kilitli sürüm");
    for (const bytes of [elf(183), Buffer.from("MZ Windows"), Buffer.from("\x7fELF")]) {
      await writeFile(join(directory, "electron"), bytes);
      await expect(verifyRuntime(directory, target, "44.1.0", execute)).rejects.toThrow("x64 ELF");
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

(process.platform === "win32" ? test.skip : test)("Linux paket kontrolü yanlış helper, eksik preload, native sunucu ve çalıştırma iznini reddeder", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-linux-static-"));
  const app = join(directory, "resources/app");
  try {
    for (const name of ["electron/main.cjs", "electron/server.cjs", "electron/server-entry.cjs", "electron/startup.cjs",
      "electron/platform.cjs", "electron/background.cjs", "electron/transport.cjs", "electron/update-bridge.cjs",
      "electron/updates.cjs", "electron/release-manifest.cjs",
      "server/server.js", "server/preload.cjs", "server/pofis-notifications.cjs", "server/.next/BUILD_ID", "public/pofi/pofi-mark-256.png"]) {
      await mkdir(join(app, name, ".."), { recursive: true });
      await writeFile(join(app, name), "fixture");
    }
    await writeFile(join(app, "package.json"), JSON.stringify({ version: "1.2.3" }));
    await writeFile(join(directory, "release.json"), JSON.stringify({ schemaVersion: 1, platform: "linux", arch: "x64", version: "1.2.3" }));
    for (const name of ["pofis", "chrome-sandbox", "chrome_crashpad_handler", "uninstall.sh"]) {
      await writeFile(join(directory, name), name === "uninstall.sh" ? "#!/bin/bash\n" : elf());
      await chmod(join(directory, name), 0o755);
    }
    await checkLinuxPackage(directory);
    await writeFile(join(directory, "extensionless-helper"), elf(183));
    await expect(checkLinuxPackage(directory)).rejects.toThrow("extensionless-helper");
    await unlink(join(directory, "extensionless-helper"));
    await unlink(join(app, "server/preload.cjs"));
    await expect(checkLinuxPackage(directory)).rejects.toMatchObject({ code: "ENOENT" });
    await writeFile(join(app, "server/preload.cjs"), "fixture");
    await unlink(join(app, "electron/release-manifest.cjs"));
    await expect(checkLinuxPackage(directory)).rejects.toMatchObject({ code: "ENOENT" });
    await writeFile(join(app, "electron/release-manifest.cjs"), "fixture");
    await writeFile(join(app, "server/host-native"), elf());
    await expect(checkLinuxPackage(directory)).rejects.toThrow("native dosya");
    await unlink(join(app, "server/host-native"));
    if (process.platform !== "win32") {
      await chmod(join(directory, "uninstall.sh"), 0o644);
      await expect(checkLinuxPackage(directory)).rejects.toThrow("uninstall.sh");
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
