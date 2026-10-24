// Uses the same native package, inspector and bounded DOM polling as smoke.cjs.
const { spawn } = require("node:child_process");
const { mkdtemp, rm, readdir, readFile, mkdir, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { platformTarget } = require("../../electron/platform.cjs");
const { stopProcessTree, ORIGIN } = require("../../electron/server.cjs");
const { connect } = require("./cdp.cjs");
const { until, fetchLocal } = require("./acceptance-wait.cjs");
const { PLAN_STORAGE_KEY, serializePlans } = require("../../src/lib/plan-storage.js");

async function run() {
  const root = resolve(__dirname, "../..");
  const target = platformTarget();
  const packages = join(root, "dist", target.outputDirectory);
  const names = process.argv[2] ? [] : (await readdir(packages)).filter(name => name.startsWith(`Pofis-${target.id}-`)).sort();
  const folder = process.argv[2] ? resolve(process.argv[2]) : join(packages, names.at(-1));
  const profileRoot = await mkdtemp(join(tmpdir(), "pofis-scenario-acceptance-"));
  const profile = join(profileRoot, "Pofis-Scenarios");
  const id = randomBytes(16).toString("hex");
  const env = { ...process.env, POFIS_TEST_BLOCK_ANALYTICS: "1" }; delete env.ELECTRON_RUN_AS_NODE;
  let child, debuggerConnection;
  let phase = "başlatma", output = "";
  try {
    child = spawn(join(folder, target.executable), ["--pofis-scenarios", `--user-data-dir=${profileRoot}`,
      `--startup-id=${id}`, "--inspect=127.0.0.1:0"], { env, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("error", error => { output += error.message; });
    const debugURL = await until(() => output.match(/Debugger listening on (ws:\/\/[^\s]+)/)?.[1]);
    debuggerConnection = await connect(debugURL);
    const main = async expression => {
      const value = await debuggerConnection.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      assert.equal(value.exceptionDetails, undefined, JSON.stringify(value.exceptionDetails));
      return value.result.value;
    };
    const receipt = await until(() => readFile(join(profile, "launch-results", `${id}.json`), "utf8").then(JSON.parse, () => false));
    assert.equal(receipt.status, "ready", receipt.message);
    assert.equal(await main("process.mainModule.require('electron').app.getPath('userData')"), profile);
    const renderer = (expression, mini = false) => main(`(() => {
      const window = process.mainModule.require('electron').BrowserWindow.getAllWindows().find(window =>
        ${mini ? "window.webContents.getURL().endsWith('/mini')" : "window.webContents.getURL() === " + JSON.stringify(ORIGIN + "/")});
      return window ? window.webContents.executeJavaScript(${JSON.stringify(expression)}, true) : null;
    })()`);
    const capture = async name => {
      if (!process.argv.includes("--capture")) return;
      await renderer("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))", true);
      const directory = join(root, "dist/electron/checks/preview");
      await mkdir(directory, { recursive: true });
      const png = await main(`process.mainModule.require('electron').BrowserWindow.getAllWindows()
        .find(w => w.webContents.getURL().endsWith('/mini')).webContents.capturePage().then(image => image.toPNG().toString('base64'))`);
      await writeFile(join(directory, name), Buffer.from(png, "base64"));
    };
    const choose = (id, checked) => main(`(() => {
      const menu = process.mainModule.require('electron').Menu.getApplicationMenu();
      const item = menu.getMenuItemById(${JSON.stringify("pofis-scenario:" + id)});
      if (!item) throw new Error('Senaryo menüsü bulunamadı');
      ${typeof checked === "boolean" ? `if (item.checked === ${checked}) return true;` : ""}
      item.click(item); return true;
    })()`);
    phase = "ana pencere";
    await until(() => renderer("document.querySelector('.dashboard-person')?.textContent.includes('Mesai sürüyor')"));
    assert.equal(await renderer("typeof require + ':' + typeof process"), "undefined:undefined");
    assert.equal(await renderer("typeof window.pofisScenario"), "object");
    const measureOpen = () => main(`new Promise(resolve => {
      const { app, BrowserWindow } = process.mainModule.require('electron');
      const started = performance.now();
      const opened = window => window.once('show', () => resolve(performance.now() - started));
      const existing = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/mini'));
      if (existing) {
        if (existing.isVisible()) throw new Error('Mini must be hidden before the warm sample');
        app.emit('pofis:acceptance:mini');
        if (!existing.isVisible()) throw new Error('Warm Mini did not become visible');
        resolve(performance.now() - started); return;
      }
      app.once('browser-window-created', (_event, window) => opened(window));
      app.emit('pofis:acceptance:mini');
    })`);
    const firstOpenMs = await measureOpen();
    phase = "Mini ilk açılış";
    await until(() => renderer("!!document.querySelector('.pofi-mini-duration')", true));
    const mainSeed = await renderer("window.pofisScenario.seed");
    assert.deepEqual(await renderer("window.pofisScenario.seed", true), mainSeed);
    assert.match(await renderer("document.querySelector('.pofi-mini-duration').textContent", true), /5 sa 30/);
    // Keep desktop focus changes outside the repeated show/hide timing samples.
    assert.equal((await renderer("window.pofisMini.pin()", true)).pinned, true);
    const warmOpenMs = [];
    for (let index = 0; index < 5; index++) {
      phase = `Mini tekrar açılış ${index + 1}`;
      await main("process.mainModule.require('electron').app.emit('pofis:acceptance:mini')");
      await until(() => main("!process.mainModule.require('electron').BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/mini')).isVisible()"));
      warmOpenMs.push(await measureOpen());
    }
    await main("process.mainModule.require('electron').app.emit('pofis:acceptance:mini')");
    await until(() => renderer("document.visibilityState === 'hidden'", true));
    const idle = await main(`(async () => {
      const { app, BrowserWindow } = process.mainModule.require('electron');
      const mini = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/mini'));
      const pid = mini.webContents.getOSProcessId();
      app.getAppMetrics();
      await new Promise(resolve => setTimeout(resolve, 2000));
      const metric = app.getAppMetrics().find(value => value.pid === pid);
      return { cpuPercent: metric.cpu.percentCPUUsage, workingSetKB: metric.memory.workingSetSize };
    })()`);
    console.log(JSON.stringify({ platform: target.id, firstOpenMs, warmOpenMs, hiddenSampleMs: 2000, idle }));
    await measureOpen();
    assert.equal((await renderer("window.pofisMini.pin()", true)).pinned, false);
    phase = "Mini tema senkronizasyonu";
    await renderer("localStorage.setItem('pofis:theme:v1', 'dark'); true");
    await until(() => renderer("document.documentElement.dataset.theme === 'dark'", true));
    await capture("scenario-dark.png");
    await renderer("localStorage.setItem('pofis:theme:v1', 'light'); true");
    await until(() => renderer("document.documentElement.dataset.theme === 'light'", true));
    await capture("scenario-light.png");
    phase = "pencereler arası plan senkronizasyonu";
    const editedPlans = { ...mainSeed.plans, defaultPlan: [420, 420, 420, 420, 420, 0, 0] };
    await renderer(`localStorage.setItem(${JSON.stringify(PLAN_STORAGE_KEY)}, ${JSON.stringify(serializePlans(editedPlans))}); true`);
    await until(() => renderer("document.querySelector('.pofi-mini-grid')?.textContent.includes('16:00:00') && document.querySelector('.pofi-mini-week')?.textContent.includes('35 sa')", true));
    await renderer(`localStorage.setItem(${JSON.stringify(PLAN_STORAGE_KEY)}, ${JSON.stringify(serializePlans(mainSeed.plans))}); true`);
    await until(() => renderer("document.querySelector('.pofi-mini-grid')?.textContent.includes('17:00:00')", true));
    phase = "klavye ve metin taşması";
    assert.equal(await renderer(`(() => {
      const pin = document.querySelector('.pofi-mini-pin'); pin.focus();
      return document.activeElement === pin && getComputedStyle(pin).outlineStyle !== 'none';
    })()`, true), true);
    assert.equal(await renderer("document.body.scrollWidth <= document.documentElement.clientWidth", true), true);
    await until(() => renderer("window.pofisNotifications.get().then(value => value.active)"));
    await choose("offline", true);
    phase = "bağlantı kesintisi";
    await until(() => renderer("!!document.querySelector('[role=alert]')", true));
    assert.equal(await renderer("!!document.querySelector('.pofi-mini-week')", true), false);
    await choose("offline", false);
    phase = "bağlantı toparlanması";
    await until(() => renderer("!document.querySelector('[role=alert]') && !!document.querySelector('.pofi-mini-duration')", true));
    await choose("leave");
    phase = "izinli gün";
    await until(() => renderer("document.querySelector('.dashboard-person')?.textContent.includes('İzinli gün')"));
    await main("process.mainModule.require('electron').app.emit('pofis:acceptance:mini')");
    await until(() => renderer("document.querySelector('.pofi-mini-summary')?.textContent.includes('Bugün planlı mesai yok')", true));
    assert.equal(await renderer("!!document.querySelector('.pofi-mini-grid')", true), false);
    const seed = await renderer("window.pofisScenario.seed");
    assert.notEqual(seed.revision, mainSeed.revision);
    assert.deepEqual(await renderer("window.pofisScenario.seed", true), seed);
    await choose("expired", true);
    phase = "oturum bitişi";
    await until(() => renderer("!!document.querySelector('input[name=username]')"));
    await until(() => renderer("document.querySelector('.pofi-mini-empty')?.textContent.includes('PDKS bağlantısı yok')", true));
    await choose("expired", false);
    phase = "oturum toparlanması";
    await until(() => renderer("!!document.querySelector('.dashboard-person')"));
    await until(() => renderer("!!document.querySelector('.pofi-mini-summary')", true));
    for (const [id, label, expected] of [
      ["near-goal", "Hedefe 1 dakika kaldı", "7 sa 59"],
      ["overtime", "Hedef aşıldı", "8 sa 30"],
      ["completed", "Mesai tamamlandı", "8 sa"],
      ["weekend", "Hafta sonu", "Bugün planlı mesai yok"],
      ["no-entry", "Henüz giriş yok", "Bugünkü mesai"],
      ["uncertain", "Belirsiz geçişler", "Bugünkü mesai"],
    ]) {
      phase = label;
      await choose(id);
      await until(() => renderer(`document.querySelector('.dashboard-person')?.textContent.includes(${JSON.stringify(label)})`));
      await main("process.mainModule.require('electron').app.emit('pofis:acceptance:mini')");
      await until(() => renderer(`!!document.querySelector('.pofi-mini-week') && document.body.innerText.includes(${JSON.stringify(expected)})`, true));
      assert.deepEqual(await renderer("window.pofisScenario.seed", true), await renderer("window.pofisScenario.seed"));
    }
    assert.equal(await renderer("fetch('https://example.invalid').then(() => false, () => true)"), true);
    assert.equal(await renderer("fetch('/api/meals').then(response => response.status)"), 503);
    phase = "kapanış";
    const serverOrigin = receipt.origin;
    await main("process.mainModule.require('electron').app.quit()");
    debuggerConnection.close(); debuggerConnection = null;
    await until(() => child.exitCode !== null || child.signalCode !== null);
    assert.equal(await fetchLocal(`${serverOrigin}/api/health`).then(() => true, () => false), false);
    console.log("PASS: paketli senaryo profili, sandbox, ortak saat/plan, sekiz senaryo, Mini, native menü, bağlantı/oturum toparlanması ve kapanış.");
  } catch (error) {
    console.error(`Başarısız kabul adımı: ${phase}\n${output}`);
    if (debuggerConnection) {
      const state = await debuggerConnection.send("Runtime.evaluate", { expression: `Promise.all(process.mainModule.require('electron').BrowserWindow.getAllWindows().map(async w => ({url:w.webContents.getURL(), text:await w.webContents.executeJavaScript('document.body.innerText'), status:await w.webContents.executeJavaScript('window.pofisNotifications.get().catch(e => e.message)')})))`, returnByValue: true, awaitPromise: true }).catch(() => null);
      console.error(JSON.stringify(state?.result?.value));
    }
    throw error;
  } finally {
    debuggerConnection?.close();
    if (child && child.exitCode === null && child.signalCode === null) await stopProcessTree(child);
    await rm(profileRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
