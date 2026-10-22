// Run against the generated Windows folder; no Playwright or installed Node is needed.
const { spawn, execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, rm, writeFile, mkdir, readdir, readFile } = require("node:fs/promises");
const { randomBytes } = require("node:crypto");
const { join, resolve } = require("node:path");
const assert = require("node:assert/strict");
const { stopProcessTree, ORIGIN } = require("../../electron/server.cjs");
const { platformTarget } = require("../../electron/platform.cjs");
const { connect } = require("./cdp.cjs");
const { readStoredPlans } = require("../../src/lib/plan-storage.js");
const { createSessionStorage } = require("../../src/server/session-storage.js");
const { CookieJar } = require("tough-cookie");

async function until(check, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const result = await check();
    if (result) return result;
    await Bun.sleep(100);
  }
  throw new Error("Pofis açılış testi zaman aşımına uğradı.");
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
  const env = { ...process.env, PATH: target.platform === "win32" ? join(process.env.SystemRoot, "System32") : "/usr/bin:/bin:/usr/sbin:/sbin" };
  env.POFIS_TEST_BLOCK_ANALYTICS = "1";
  delete env.ELECTRON_RUN_AS_NODE;
  const fromIndex = process.argv.indexOf("--from");
  const previous = fromIndex === -1 ? null : resolve(process.argv[fromIndex + 1]);
  assert.ok(!previous || !sourceMode, "--from iki paket klasörüyle kullanılır.");
  const checks = join(root, "dist", "electron", "checks");
  await mkdir(checks, { recursive: true });
  const profile = await mkdtemp(join(checks, "profile-"));
  let child;
  let cdp;
  let debugOrigin;
  let serverOrigin;
  let occupied;
  const launch = async (packageFolder = folder) => {
    let output = "";
    const id = randomBytes(16).toString("hex");
    child = spawn(packageFolder === folder ? executable : join(packageFolder, target.executable),
      [...appArgs, `--user-data-dir=${profile}`, `--startup-id=${id}`, "--remote-debugging-port=0"],
      { env, cwd: packageFolder, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("error", error => { output += error.message; });
    const address = await until(() => output.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1]);
    debugOrigin = address.replace(/^ws:/, "http:").split("/devtools/")[0];
    const pageTarget = await until(async () => {
      const targets = await (await fetch(`${debugOrigin}/json/list`)).json();
      return targets.find(target => target.type === "page" && target.url.startsWith(ORIGIN));
    });
    cdp = await connect(pageTarget.webSocketDebuggerUrl);
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
    await evaluate("window.close(); true");
    assert.equal(child.exitCode, null, "Pencere kapatması uygulamayı sonlandırmamalı.");
    assert.equal(await fetch(`${serverOrigin}/api/health`).then(response => response.ok), true);
    const quit = spawn(executable, [...appArgs, `--user-data-dir=${profile}`, "--pofis-quit"],
      { env, cwd: folder, windowsHide: true, stdio: "ignore" });
    await until(() => quit.exitCode !== null || quit.signalCode !== null, 15000);
    await until(() => child.exitCode !== null || child.signalCode !== null, 15000);
    cdp.close();
    cdp = null;
    assert.equal(await fetch(`${serverOrigin}/api/health`, { signal: AbortSignal.timeout(500) }).then(() => true, () => false), false);
  };
  const plan = JSON.stringify({ defaultPlan: [480, 480, 480, 480, 420, 0, 0],
    weekOverrides: { "2026-10-19": [480, 480, 0, 480, 0, 0, 0] },
    weekTargets: { "2026-10-19": 144000 }, weekLeaves: { "2026-10-19": [2] },
    weekZeroOpenDays: { "2026-10-19": [4] } });
  const demoPlan = JSON.stringify({ defaultPlan: [360, 360, 360, 360, 360, 0, 0], weekOverrides: {} });
  const token = randomBytes(32).toString("hex");
  const sessionPath = join(profile, "sessions", `${token}.json`);
  // Scope the synthetic cookie away from UI requests, which could otherwise contact real PDKS.
  const cookieUrl = `${ORIGIN}/transition-check`;
  let sessionRecord;
  const checkTransition = async () => {
    await until(() => evaluate("document.documentElement.dataset.theme === 'dark'"));
    assert.equal(await evaluate("localStorage.getItem('pofis:theme:v1')"), "dark");
    assert.equal(await evaluate("localStorage.getItem('pofis:work-plans:v1')"), plan);
    assert.equal(await evaluate("localStorage.getItem('demo:pofis:work-plans:v1')"), demoPlan);
    const cookies = (await cdp.send("Network.getCookies", { urls: [cookieUrl] })).cookies;
    const cookie = cookies.find(cookie => cookie.name === "pofis_session");
    assert.equal(cookie?.value, token);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite, "Strict");
    assert.ok(Math.abs(cookie.expires - sessionRecord.expiresAt / 1000) < 1);
    const response = await fetch(`${serverOrigin}/api/session`, { headers: { Cookie: `pofis_session=${token}` } });
    const sessionData = await response.json();
    assert.equal(sessionData.connected, true);
    assert.match(sessionData.notificationSession.accountId, /^[a-f0-9]{64}$/);
    assert.equal(sessionData.notificationSession.expiresAt, sessionRecord.expiresAt);
    assert.deepEqual(JSON.parse(await readFile(sessionPath, "utf8")), sessionRecord);
  };
  try {
    if (previous) {
      const execute = promisify(execFile);
      const engines = [];
      for (const directory of [previous, folder]) {
        const pkg = JSON.parse(await readFile(join(directory, target.resources, "app/package.json"), "utf8"));
        const { stdout } = await execute(join(directory, target.executable), ["-p", "JSON.stringify(process.versions)"],
          { env: { ...env, ELECTRON_RUN_AS_NODE: "1" }, windowsHide: true, timeout: 15000 });
        const versions = JSON.parse(stdout);
        console.log(`${target.id}: Pofis ${pkg.version}; Electron ${versions.electron}; Chromium ${versions.chrome}; Node ${versions.node}; ABI ${versions.modules}`);
        engines.push(versions.electron);
      }
      assert.notEqual(engines[0], engines[1], "Motor geçişi için iki farklı gerçek Electron paketi gerekli.");
      assert.equal(engines[1], require("../../package.json").devDependencies.electron);
      readStoredPlans(plan); readStoredPlans(demoPlan);
      const jar = new CookieJar();
      jar.setCookieSync("fixture=preserved; Path=/; HttpOnly", "https://fixture.invalid");
      await createSessionStorage(join(profile, "sessions")).save(token, {
        expiresAt: Date.now() + 3600000, jar: jar.serializeSync(),
        self: { pofiKey: "desktop-transition-fixture" }, lastRequestAt: Date.now(),
      });
      sessionRecord = JSON.parse(await readFile(sessionPath, "utf8"));
      await launch(previous);
      await evaluate(`localStorage.setItem('pofis:theme:v1','dark'); localStorage.setItem('pofis:work-plans:v1',${JSON.stringify(plan)}); localStorage.setItem('demo:pofis:work-plans:v1',${JSON.stringify(demoPlan)}); true`);
      await cdp.send("Network.setCookie", { url: cookieUrl, path: "/transition-check", name: "pofis_session",
        value: token, httpOnly: true, sameSite: "Strict", expires: sessionRecord.expiresAt / 1000 });
      await cdp.send("Page.reload");
      await checkTransition();
      await close();
    }
    await launch();
    if (previous) await checkTransition();
    const image = await fetch(`${serverOrigin}/pofi/pofi-mark-256.png`);
    assert.equal(image.status, 200);
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), await readFile(join(root, "public/pofi/pofi-mark-256.png")));
    assert.equal((await fetch(`${serverOrigin}/_next/image?url=%2Fpofi%2Fpofi-mark-256.png&w=256&q=75`)).status, 404);
    console.log("PASS: paketli görsel aynı baytlarla sunuluyor; görseller doğrudan yükleniyor.");
    await until(() => evaluate("!!document.querySelector('input[name=username]') && !document.querySelector('input[name=username]').disabled"));
    assert.equal(await evaluate("typeof require + ':' + typeof process"), "undefined:undefined");
    assert.equal(await evaluate("typeof window.pofisUpdates"), "object");
    assert.equal(await evaluate("typeof window.pofisNotifications"), "object");
    assert.equal((await evaluate("window.pofisNotifications.get()")).active, false);
    if (!sourceMode) {
      assert.deepEqual(await evaluate("Object.keys(window.pofisUpdates).sort()"), ["copyCommand", "get", "subscribe"]);
      // Read through the real packaged authorization gate without changing the system clipboard.
      assert.equal(await evaluate("window.pofisUpdates.get().then(() => true)"), true);
    }
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
      const fontLoaded = await evaluate(`document.fonts.ready.then(() =>
        [...document.fonts].some(font => font.family === 'GeistSans' && font.status === 'loaded'))`);
      assert.equal(fontLoaded, true, "Görsel kabul için Geist fontu yüklenmeli.");
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
    if (previous) {
      await checkTransition();
      console.log("PASS: eski → yeni motor ve yeniden açılış; tema, canlı/demo planları, HttpOnly çerez ve sunucu oturumu/TTL korundu.");
    }
    await close();
    if (target.platform === "darwin" && !sourceMode) {
      await promisify(execFile)("/usr/bin/codesign",
        ["--verify", "--deep", "--strict", "--verbose=3", join(folder, "Pofis.app")]);
      console.log("PASS: açılış, demo ve yeniden başlatma sonrasında uygulama imzası geçerli.");
    }
    console.log(`PASS: ${target.id}; ${sourceMode ? "Kaynak electron/" : "Pofis paketi"}; Node/Bun içermeyen PATH; giriş ekranı/API doğrulaması; demo; tek örnek; gezinme sınırı; kalıcı profil; üç açılış/kapanışta port temizliği.`);
    console.log(`PASS: başka uygulama 3210'da kalırken boş port; portlar arasında kalıcı ayarlar; alternatif portta tek örnek; HTTP POST ve HttpOnly çerez temizleme.\nGeçici görsel inceleme: ${artifactDirectory}`);
  } finally {
    cdp?.close();
    await stopProcessTree(child);
    occupied?.stop(true);
    await until(() => rm(profile, { recursive: true, force: true }).then(() => true, error => {
      if (error.code !== "EBUSY" && error.code !== "EPERM" && error.code !== "ENOTEMPTY") throw error;
      return false;
    }), 10000);
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
