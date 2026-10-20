const { test, expect } = require("bun:test");
const { mkdtemp, copyFile, rm } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { createServer } = require("node:net");
const { spawn } = require("node:child_process");
const { createDesktopServer } = require("./server.cjs");

async function fixture(mode, run, { timeoutMs = 1800 } = {}) {
  const root = await mkdtemp(join(tmpdir(), "pofis-desktop-test-"));
  const previous = process.env.POFIS_DESKTOP_TEST_MODE;
  process.env.POFIS_DESKTOP_TEST_MODE = mode;
  await copyFile(join(__dirname, "fixtures", "next.cjs"), join(root, "server.js"));
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const exits = [];
  const fork = (_entry, args, options) => {
    const child = spawn(process.execPath, [join(root, "server.js"), ...args], {
      cwd: options.cwd, env: options.env, windowsHide: true, stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    child.postMessage = message => child.send(message);
    return child;
  };
  const options = { root, fork, sessionDirectory: join(root, "sessions"), port,
    timeoutMs, onUnexpectedExit: error => exits.push(error) };
  const server = createDesktopServer(options);
  try { await run({ server, options, exits }); }
  finally {
    await server.stop();
    if (previous === undefined) delete process.env.POFIS_DESKTOP_TEST_MODE;
    else process.env.POFIS_DESKTOP_TEST_MODE = previous;
    await rm(root, { recursive: true, force: true });
  }
}

test("hazır olmayı bekler; yalnız kendi sunucusunu açar ve kapatır", () => fixture("ok", async ({ server, options, exits }) => {
  const origin = await server.start();
  const response = await fetch(`${origin}/api/health`);
  const body = await response.json();
  expect(body.directory).toBe(options.sessionDirectory);
  await Promise.all([server.stop(), server.stop()]);
  expect(() => process.kill(body.pid, 0)).toThrow();
  expect(exits).toEqual([]);
}));

test.each(["exit", "hang", "wrong-token"])("başarısız açılışı reddeder: %s", mode =>
  fixture(mode, async ({ server }) => {
    await expect(server.start()).rejects.toThrow(mode === "exit" ? "23" : "hazır olmadı");
  }, { timeoutMs: mode === "exit" ? 1800 : 250 }));

test("dolu portta boş port seçer; başka sürece bağlanmaz veya onu kapatmaz", () => fixture("ok", async ({ server, options }) => {
  const occupied = createServer();
  await new Promise(resolve => occupied.listen(options.port, "127.0.0.1", resolve));
  try {
    const origin = await server.start();
    expect(new URL(origin).port).not.toBe(String(options.port));
    expect(await server.isHealthy()).toBe(true);
    await server.stop();
    expect(occupied.listening).toBe(true);
  } finally { await new Promise(resolve => occupied.close(resolve)); }
}));

test("başlamadan iptal edildiğinde sunucu oluşturmaz", () => fixture("ok", async ({ server }) => {
  await server.stop();
  await expect(server.start()).rejects.toThrow("iptal");
}));

test("çalışan sunucunun beklenmedik kapanışını bildirir", () => fixture("ok", async ({ server, exits }) => {
  const origin = await server.start();
  const body = await (await fetch(`${origin}/api/health`)).json();
  process.kill(body.pid);
  for (let attempt = 0; attempt < 30 && !exits.length; attempt++) await Bun.sleep(50);
  expect(exits).toHaveLength(1);
  expect(exits[0].message).toContain("Pofis sunucusu kapandı");
}));

test("eksik standalone sunucu için uygulanabilir hata verir", () => fixture("ok", async ({ options }) => {
  await rm(join(options.root, "server.js"));
  await expect(createDesktopServer(options).start()).rejects.toThrow("desktop:prepare");
}));

test("kapanış mesajını ve SIGTERM'i yok sayan sunucuyu zorla kapatır", () => fixture("stubborn", async ({ server }) => {
  const origin = await server.start();
  const body = await (await fetch(`${origin}/api/health`)).json();
  await server.stop();
  expect(() => process.kill(body.pid, 0)).toThrow();
}), 15000);
