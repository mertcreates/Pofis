const { test, expect } = require("bun:test");
const { mkdtemp, mkdir, writeFile, rm, symlink } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { signMacBundle } = require("./macos.cjs");

test("macOS imzası native dosyalardan kapsayıcı bundle'a ilerler; bağlantıları izlemez", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-sign-"));
  const bundle = join(directory, "Pofis.app");
  const framework = join(bundle, "Contents/Frameworks/Electron Framework.framework");
  const helper = join(bundle, "Contents/Frameworks/Pofis Helper.app");
  const files = [join(framework, "Versions/A/Electron Framework"),
    join(helper, "Contents/MacOS/Pofis Helper"), join(bundle, "Contents/MacOS/Pofis"),
    join(bundle, "Contents/Resources/app/server/node_modules/native/addon.node"),
    join(framework, "Versions/A/Helpers/app_shim_loader"),
    join(framework, "Versions/A/Libraries/libEGL.dylib")];
  try {
    for (const file of files) {
      await mkdir(join(file, ".."), { recursive: true });
      await writeFile(file, Buffer.from("cffaedfe00000000", "hex"));
    }
    await writeFile(join(bundle, "Contents/Resources/plain.txt"), "not native code");
    await symlink(join(framework, "Versions/A"), join(framework, "Versions/Current"),
      process.platform === "win32" ? "junction" : "dir");
    const calls = [];
    await signMacBundle(bundle, async (command, args) => { calls.push({ command, args }); });
    const signed = calls.filter(call => call.args.includes("--sign"));
    const paths = signed.map(call => call.args.at(-1));
    for (const file of [files[0], files[3], files[4], files[5]]) expect(paths.filter(path => path === file)).toHaveLength(1);
    // App mains are signed by their container, never as a separate early operation.
    expect(paths).not.toContain(files[1]);
    expect(paths).not.toContain(files[2]);
    expect(paths.indexOf(files[0])).toBeLessThan(paths.indexOf(framework));
    expect(paths.indexOf(files[4])).toBeLessThan(paths.indexOf(files[0]));
    expect(paths.indexOf(files[5])).toBeLessThan(paths.indexOf(files[0]));
    expect(paths.indexOf(helper)).toBeLessThan(paths.indexOf(bundle));
    expect(paths.indexOf(framework)).toBeLessThan(paths.indexOf(bundle));
    expect(paths.at(-1)).toBe(bundle);
    expect(paths).toHaveLength(files.length + 1);
    for (const call of signed) {
      expect(call.command).toBe("/usr/bin/codesign");
      expect(call.args).not.toContain("--deep");
      expect(call.args).toContain("--preserve-metadata=entitlements,flags");
    }
    expect(calls.at(-1).args).toEqual(["--verify", "--deep", "--strict", bundle]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("iç bileşenin imzası başarısızsa dış uygulama imzalanmaz", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-sign-error-"));
  try {
    await writeFile(join(directory, "binary"), Buffer.from("cffaedfe00000000", "hex"));
    const paths = [];
    await expect(signMacBundle(directory, async (_command, args) => {
      paths.push(args.at(-1));
      throw new Error("signature failed");
    })).rejects.toThrow("signature failed");
    expect(paths).toEqual([join(directory, "binary")]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
