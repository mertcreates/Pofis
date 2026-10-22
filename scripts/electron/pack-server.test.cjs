const { test, expect } = require("bun:test");
const { mkdtemp, mkdir, writeFile, readFile, rm, access } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const { packServer } = require("./pack-server.cjs");
const { run } = require("./ci-build.cjs");

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "pofis-asar-"));
  const server = join(root, "server");
  for (const name of [".next", "node_modules/next"]) await mkdir(join(server, name), { recursive: true });
  for (const [name, value] of Object.entries({
    ".next/BUILD_ID": "fixture", "node_modules/next/package.json": '{"main":"index.js"}',
    "node_modules/next/index.js": 'module.exports = "dependency loaded";',
    "asset.txt": "Türkçe static asset", "preload.cjs": "", "ui-text.cjs": "", "pofis-notifications.cjs": "",
  })) await writeFile(join(server, name), value);
  return { root, server };
}

test.skipIf(process.platform !== "win32")("ASAR sunucusu gerçek Electron utility sürecinde bağımlılığı ve dosyayı okur; cwd gerçek dizinde kalır", async () => {
  const { root, server } = await fixture();
  try {
    await writeFile(join(server, "server.js"), `const path = require('node:path');
      process.chdir(__dirname);
      process.parentPort.on('message', () => process.exit(0));
      process.parentPort.postMessage({ cwd: process.cwd(), dependency: require('next'),
        asset: require('node:fs').readFileSync(path.join(__dirname, 'asset.txt'), 'utf8') });`);
    await packServer(server);
    await assertMissing(join(server, "node_modules"));
    const result = join(root, "result.json");
    await writeFile(join(root, "worker.cjs"), `require(${JSON.stringify(join(server, "server.js"))});`);
    await writeFile(join(root, "package.json"), '{"main":"main.cjs"}');
    await writeFile(join(root, "main.cjs"), `const {app,utilityProcess}=require('electron');
      app.setPath('userData', ${JSON.stringify(join(root, "profile"))});
      app.whenReady().then(() => {
        const child=utilityProcess.fork(${JSON.stringify(join(root, "worker.cjs"))},[],{cwd:${JSON.stringify(server)}});
        let received;
        child.on('message', result => { received = result; child.postMessage('shutdown'); });
        child.on('exit', code => {
          if (code || !received) { app.exit(code || 1); return; }
          require('node:fs').writeFileSync(${JSON.stringify(result)}, JSON.stringify(received));
          app.quit();
        });
      });`);
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    await run(resolve("node_modules/electron/dist/electron.exe"), [root], root, env, { timeoutMs: 10000 });
    expect(JSON.parse(await readFile(result, "utf8"))).toEqual({ cwd: server, dependency: "dependency loaded", asset: "Türkçe static asset" });
  } finally { await rm(root, { recursive: true, force: true }); }
}, 15000);

async function assertMissing(path) {
  await expect(access(path)).rejects.toHaveProperty("code", "ENOENT");
}

test("Next giriş biçimi değişmişse paketleme açıklayıcı hatayla durur ve kaynağı korur", async () => {
  const { root, server } = await fixture();
  try {
    const contents = "unexpected Next entry";
    await writeFile(join(server, "server.js"), contents);
    await expect(packServer(server)).rejects.toThrow("ASAR uyarlamasını kontrol et");
    expect(await readFile(join(server, "server.js"), "utf8")).toBe(contents);
    await assertMissing(join(root, "server.asar"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
