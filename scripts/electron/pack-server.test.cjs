const { test, expect } = require("bun:test");
const { mkdtemp, mkdir, writeFile, readFile, rm, access } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { packServer } = require("./pack-server.cjs");

test("Next giriş biçimi değişmişse paketleme açıklayıcı hatayla durur ve kaynağı korur", async () => {
  const root = await mkdtemp(join(tmpdir(), "pofis-asar-"));
  const server = join(root, "server");
  try {
    await mkdir(join(server, ".next"), { recursive: true });
    await mkdir(join(server, "node_modules/next"), { recursive: true });
    await writeFile(join(server, ".next/BUILD_ID"), "fixture");
    await writeFile(join(server, "node_modules/next/package.json"), "{}");
    const contents = "unexpected Next entry";
    await writeFile(join(server, "server.js"), contents);
    await expect(packServer(server)).rejects.toThrow("ASAR uyarlamasını kontrol et");
    expect(await readFile(join(server, "server.js"), "utf8")).toBe(contents);
    await expect(access(join(root, "server.asar"))).rejects.toHaveProperty("code", "ENOENT");
  } finally { await rm(root, { recursive: true, force: true }); }
});
