const { test, expect } = require("bun:test");
const { mkdtemp, mkdir, writeFile, rm, symlink } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { assertPortableStandalone } = require("./standalone.cjs");

test("ortak standalone JS ve görselleri kabul eder; native uzantıları ve adsız binary'leri reddeder", async () => {
  const root = await mkdtemp(join(tmpdir(), "pofis-portable-"));
  try {
    await writeFile(join(root, "server.js"), "console.log('server')");
    await writeFile(join(root, "asset.png"), Buffer.from("89504e470d0a1a0a", "hex"));
    await assertPortableStandalone(root);
    for (const [name, bytes] of [["addon.node", "00"], ["library.dylib", "00"], ["hidden-macho", "cffaedfe"],
      ["hidden-fat", "cafebabe"], ["hidden-pe", "4d5a0000"], ["hidden-elf", "7f454c46"]]) {
      await writeFile(join(root, name), Buffer.from(bytes, "hex"));
      await expect(assertPortableStandalone(root)).rejects.toThrow(name);
      await rm(join(root, name));
    }
    const modules = join(root, "modules");
    await mkdir(modules);
    const target = await mkdtemp(join(tmpdir(), "pofis-native-link-"));
    try {
      await writeFile(join(target, "native.dll"), "fixture");
      await symlink(target, join(modules, "dependency"), process.platform === "win32" ? "junction" : "dir");
      await expect(assertPortableStandalone(root)).rejects.toThrow("native.dll");
    } finally { await rm(target, { recursive: true, force: true }); }
  } finally { await rm(root, { recursive: true, force: true }); }
});
