const { test, expect } = require("bun:test");
const { mkdtemp, mkdir, writeFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { checkIntelPackage } = require("./macos-static-check.cjs");

test("Intel statik kontrolü Electron/helper mimarisini, taşınabilir sunucuyu ve imzayı denetler", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-intel-static-"));
  const app = join(directory, "Pofis.app");
  const resources = join(app, "Contents/Resources");
  const nativeFiles = ["Contents/MacOS/Pofis", "Contents/Frameworks/Helper.app/Contents/MacOS/Helper"];
  try {
    for (const path of [...nativeFiles, "Contents/Resources/app/electron/main.cjs", "Contents/Resources/app/server/server.js"]) {
      const file = join(app, path);
      await mkdir(join(file, ".."), { recursive: true });
      await writeFile(file, nativeFiles.includes(path) ? Buffer.from("cffaedfe00000000", "hex") : "fixture");
    }
    await writeFile(join(resources, "release.json"), JSON.stringify({ schemaVersion: 1, platform: "darwin", arch: "x64", version: "1.2.3" }));
    await writeFile(join(resources, "app/package.json"), JSON.stringify({ version: "1.2.3" }));
    const calls = [];
    await checkIntelPackage(directory, async (command, args) => { calls.push({ command, args }); });
    expect(calls.filter(call => call.command.endsWith("/lipo")).map(call => call.args[0]).sort()).toEqual(nativeFiles.map(path => join(app, path)).sort());
    expect(calls.slice(0, -1).every(call => call.args.slice(1).join(" ") === "-verify_arch x86_64")).toBe(true);
    expect(calls.at(-1)).toEqual({ command: "/usr/bin/codesign", args: ["--verify", "--deep", "--strict", app] });
    const wrongArchitecture = new Error("arm64 only");
    await expect(checkIntelPackage(directory, async (command) => { if (command.endsWith("/lipo")) throw wrongArchitecture; })).rejects.toBe(wrongArchitecture);
    const badSignature = new Error("bad signature");
    await expect(checkIntelPackage(directory, async (command) => { if (command.endsWith("/codesign")) throw badSignature; })).rejects.toBe(badSignature);
    await writeFile(join(resources, "app/server/addon.node"), Buffer.from("cffaedfe00000000", "hex"));
    await expect(checkIntelPackage(directory, async () => {})).rejects.toThrow("addon.node");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
