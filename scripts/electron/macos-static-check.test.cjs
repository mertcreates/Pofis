const { test, expect } = require("bun:test");
const { mkdtemp, mkdir, writeFile, rename, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { checkIntelPackage } = require("./macos-static-check.cjs");

test("Intel statik kontrolü helper ve native bağımlılık mimarisini ve imzayı denetler", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-intel-static-"));
  const app = join(directory, "Pofis.app");
  const resources = join(app, "Contents/Resources");
  const nativeFiles = ["Contents/MacOS/Pofis", "Contents/Frameworks/Helper.app/Contents/MacOS/Helper",
    "Contents/Resources/app/server/node_modules/@img/sharp-darwin-x64/lib/sharp-darwin-x64-0.35.5.node",
    "Contents/Resources/app/server/node_modules/@img/sharp-libvips-darwin-x64/lib/libvips-cpp.8.dylib"];
  try {
    for (const path of [...nativeFiles, "Contents/Resources/app/electron/main.cjs", "Contents/Resources/app/server/server.js"]) {
      const file = join(app, path);
      await mkdir(join(file, ".."), { recursive: true });
      await writeFile(file, nativeFiles.includes(path) ? Buffer.from("cffaedfe00000000", "hex") : "fixture");
    }
    await writeFile(join(resources, "release.json"), JSON.stringify({ schemaVersion: 1, platform: "darwin", arch: "x64", version: "1.2.3" }));
    await writeFile(join(resources, "app/package.json"), JSON.stringify({ version: "1.2.3" }));
    await writeFile(join(resources, "app/server/node_modules/@img/sharp-darwin-x64/package.json"),
      JSON.stringify({ name: "@img/sharp-darwin-x64", version: "0.35.5" }));
    const calls = [];
    await checkIntelPackage(directory, async (command, args) => { calls.push({ command, args }); });
    expect(calls.filter(call => call.command.endsWith("/lipo")).map(call => call.args[0]).sort()).toEqual(nativeFiles.map(path => join(app, path)).sort());
    expect(calls.slice(0, -1).every(call => call.args.slice(1).join(" ") === "-verify_arch x86_64")).toBe(true);
    expect(calls.at(-1)).toEqual({ command: "/usr/bin/codesign", args: ["--verify", "--deep", "--strict", app] });
    const wrongArchitecture = new Error("arm64 only");
    await expect(checkIntelPackage(directory, async (command) => { if (command.endsWith("/lipo")) throw wrongArchitecture; })).rejects.toBe(wrongArchitecture);
    const badSignature = new Error("bad signature");
    await expect(checkIntelPackage(directory, async (command) => { if (command.endsWith("/codesign")) throw badSignature; })).rejects.toBe(badSignature);
    await writeFile(join(resources, "app/server/node_modules/@img/sharp-darwin-x64/package.json"),
      JSON.stringify({ name: "@img/sharp-darwin-x64", version: "0.35.6" }));
    await expect(checkIntelPackage(directory, async () => {})).rejects.toThrow("sharp-darwin-x64-0.35.6.node");
    const nextBinary = join(app, nativeFiles[2].replace("0.35.5", "0.35.6"));
    await rename(join(app, nativeFiles[2]), nextBinary);
    await checkIntelPackage(directory, async () => {});
    await rename(nextBinary, join(app, nativeFiles[2]));
    await writeFile(join(resources, "app/server/node_modules/@img/sharp-darwin-x64/package.json"),
      JSON.stringify({ name: "@img/sharp-darwin-x64", version: "0.35.5" }));
    await rm(join(app, nativeFiles[2]));
    await expect(checkIntelPackage(directory, async () => {})).rejects.toThrow("Standalone çıktısındaki @img paketlerini kontrol et.");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
