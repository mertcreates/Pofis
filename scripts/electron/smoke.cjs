// Run against the generated Windows folder; no Playwright or installed Node is needed.
const { spawn } = require("node:child_process");
const { mkdtemp, rm, writeFile, mkdir, readdir, readFile } = require("node:fs/promises");
const { randomBytes } = require("node:crypto");
const { join, resolve } = require("node:path");
const assert = require("node:assert/strict");
const { stopProcessTree, ORIGIN } = require("../../electron/server.cjs");
const { platformTarget } = require("../../electron/platform.cjs");

async function until(check, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const result = await check();
    if (result) return result;
    await Bun.sleep(100);
  }
  throw new Error("Pofis açılış testi zaman aşımına uğradı.");
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    socket.onopen = () => resolve({
      close: () => socket.close(),
      send: (method, params = {}) => new Promise((done, fail) => {
        pending.set(++id, { done, fail });
        socket.send(JSON.stringify({ id, method, params }));
      }),
    });
    socket.onerror = reject;
    socket.onclose = () => {
      for (const request of pending.values()) request.fail(new Error("CDP bağlantısı kapandı."));
      pending.clear();
    };
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.fail(new Error(message.error.message));
      else request.done(message.result);
    };
  });
}

async function run() {
  const root = resolve(__dirname, "../..");
  const target = platformTarget();
  const packages = join(root, "dist", target.outputDirectory);
  const sourceMode = process.argv[2] === "--source";
  const folder = sourceMode ? join(root, "node_modules", "electron", "dist")
    : process.argv[2] ? resolve(process.argv[2])
    : join(packages, (await readdir(packages)).filter(name => name.startsWith(`Pofis-${target.id}-`)).sort().at(-1));
  const executable = join(folder, sourceMode ? target.electronExecutable : target.executable);
  const appArgs = sourceMode ? [join(root, "electron")] : [];
  const checks = join(root, "dist", "electron", "checks");
  await mkdir(checks, { recursive: true });
  const profile = await mkdtemp(join(checks, "profile-"));
  const env = { ...process.env, PATH: target.platform === "win32" ? join(process.env.SystemRoot, "System32") : "/usr/bin:/bin:/usr/sbin:/sbin" };
  delete env.ELECTRON_RUN_AS_NODE;
  let child;
  let cdp;
  let debugOrigin;
  let serverOrigin;
  let occupied;
  const launch = async () => {
    let output = "";
    const id = randomBytes(16).toString("hex");
    child = spawn(executable, [...appArgs, `--user-data-dir=${profile}`, `--startup-id=${id}`, "--remote-debugging-port=0"],
      { env, cwd: folder, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("error", error => { output += error.message; });
    const address = await until(() => output.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1]);
    debugOrigin = address.replace(/^ws:/, "http:").split("/devtools/")[0];
    const target = await until(async () => {
      const targets = await (await fetch(`${debugOrigin}/json/list`)).json();
      return targets.find(target => target.type === "page" && target.url.startsWith(ORIGIN));
    });
    cdp = await connect(target.webSocketDebuggerUrl);
    // A CDP target URL can be assigned while its document is still about:blank.
    await until(async () => {
      const result = await cdp.send("Runtime.evaluate", {
        expression: `location.origin === ${JSON.stringify(ORIGIN)} && document.readyState === 'complete' && !!document.body`,
        returnByValue: true,
      });
      return result.result?.value === true;
    });
    const receipt = await until(() => readFile(join(profile, "launch-results", `${id}.json`), "utf8").then(JSON.parse, () => false));
    assert.equal(receipt.status, "ready");
    serverOrigin = receipt.origin;
  };
  const evaluate = async expression => {
    const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const close = async () => {
    await evaluate("window.close(); true").catch(() => {});
    await until(() => child.exitCode !== null || child.signalCode !== null, 15000);
    cdp.close();
    cdp = null;
    assert.equal(await fetch(`${serverOrigin}/api/health`, { signal: AbortSignal.timeout(500) }).then(() => true, () => false), false);
  };
  try {
    await launch();
    await until(() => evaluate("!!document.querySelector('input[name=username]') && !document.querySelector('input[name=username]').disabled"));
    assert.equal(await evaluate("typeof require + ':' + typeof process"), "undefined:undefined");
    const health = await fetch(`${ORIGIN}/api/health`);
    const identity = health.headers.get("X-Pofis-Desktop");
    assert.ok(identity);
    const session = await evaluate("fetch('/api/session').then(r => r.json())");
    assert.equal(session.connected, false);
    assert.equal(await evaluate("fetch('/api/session', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'}).then(r => r.status)"), 400);
    await cdp.send("Network.setCookie", { url: ORIGIN, name: "pofis_session", value: "a".repeat(64), httpOnly: true, sameSite: "Strict" });
    assert.equal(await evaluate("fetch('/api/report?person=self&from=2026-10-12&to=2026-10-18').then(r => r.status)"), 401);
    assert.equal((await cdp.send("Network.getCookies", { urls: [ORIGIN] })).cookies.some(cookie => cookie.name === "pofis_session"), false);
    await evaluate("localStorage.setItem('desktop-smoke', 'persisted'); true");
    const second = spawn(executable, [...appArgs, `--user-data-dir=${profile}`],
      { env, cwd: folder, windowsHide: true, stdio: "ignore" });
    await until(() => second.exitCode !== null || second.signalCode !== null, 10000);
    assert.equal(child.exitCode, null);
    assert.equal((await fetch(`${ORIGIN}/api/health`)).headers.get("X-Pofis-Desktop"), identity);
    const targets = await (await fetch(`${debugOrigin}/json/list`)).json();
    assert.equal(targets.filter(target => target.type === "page").length, 1);
    await evaluate("window.open('https://example.invalid'); true");
    await evaluate("location.href = 'https://example.invalid'; true");
    await Bun.sleep(200);
    assert.equal(await evaluate("location.origin"), ORIGIN);
    const artifactDirectory = join(checks, "preview");
    await mkdir(artifactDirectory, { recursive: true });
    const screenshot = async name => {
      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      await writeFile(join(artifactDirectory, name), Buffer.from(shot.data, "base64"));
    };
    await screenshot("login.png");
    await cdp.send("Page.navigate", { url: `${ORIGIN}/demo` });
    await until(() => evaluate("!!document.body && (!!document.querySelector('.dashboard') || document.body.innerText.includes('Kayıtlı süre'))"));
    await screenshot("demo.png");
    await close();
    occupied = Bun.serve({ hostname: "127.0.0.1", port: 3210, fetch: () => new Response("another app") });
    await launch();
    assert.notEqual(serverOrigin, ORIGIN);
    assert.equal(await evaluate("fetch('/api/health').then(r => r.json()).then(b => b.status)"), "ok");
    assert.equal(await evaluate("fetch('/api/session', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'}).then(r => r.status)"), 400);
    assert.equal(await evaluate("localStorage.getItem('desktop-smoke')"), "persisted");
    const fallbackIdentity = (await fetch(`${serverOrigin}/api/health`)).headers.get("X-Pofis-Desktop");
    const fallbackSecond = spawn(executable, [...appArgs, `--user-data-dir=${profile}`], { env, cwd: folder, windowsHide: true, stdio: "ignore" });
    await until(() => fallbackSecond.exitCode !== null || fallbackSecond.signalCode !== null);
    assert.equal((await fetch(`${serverOrigin}/api/health`)).headers.get("X-Pofis-Desktop"), fallbackIdentity);
    assert.equal(await (await fetch(ORIGIN)).text(), "another app");
    await close();
    assert.equal(await (await fetch(ORIGIN)).text(), "another app");
    occupied.stop(true); occupied = null;
    await launch();
    assert.equal(serverOrigin, ORIGIN);
    assert.equal(await evaluate("localStorage.getItem('desktop-smoke')"), "persisted");
    await close();
    console.log(`PASS: ${target.id}; ${sourceMode ? "Kaynak electron/" : "Pofis paketi"}; Node/Bun içermeyen PATH; giriş ekranı/API doğrulaması; demo; tek örnek; gezinme sınırı; kalıcı profil; üç açılış/kapanışta port temizliği.`);
    console.log(`PASS: başka uygulama 3210'da kalırken boş port; portlar arasında kalıcı ayarlar; alternatif portta tek örnek; HTTP POST ve HttpOnly çerez temizleme.\nGeçici görsel inceleme: ${artifactDirectory}`);
  } finally {
    cdp?.close();
    await stopProcessTree(child);
    occupied?.stop(true);
    await rm(profile, { recursive: true, force: true });
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
