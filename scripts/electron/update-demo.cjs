const { join, resolve, dirname } = require("node:path");

if (process.versions.electron) {
  const { app, BrowserWindow, clipboard, ipcMain, session, utilityProcess } = require("electron");
  const { checkForUpdates } = require("../../electron/updates.cjs");
  const { installUpdateBridge } = require("../../electron/update-bridge.cjs");
  const { createDesktopServer, ORIGIN } = require("../../electron/server.cjs");
  const { isolateAcceptanceAnalytics } = require("../../electron/acceptance-network.cjs");
  const { platformTarget } = require("../../electron/platform.cjs");
  app.setName("Pofis");
  app.setPath("userData", app.commandLine.getSwitchValue("user-data-dir"));
  let quitting = false;
  let server;
  app.on("before-quit", () => { quitting = true; });
  app.on("window-all-closed", () => { server?.stop().finally(() => app.quit()); });
  app.whenReady().then(async () => {
    const target = platformTarget();
    const version = "0.1.1";
    isolateAcceptanceAnalytics(session.defaultSession, true);
    server = createDesktopServer({ root: resolve(__dirname, "../../.next/standalone"),
      fork: (entry, args, options) => utilityProcess.fork(entry, args, options),
      sessionDirectory: join(app.getPath("userData"), "sessions"),
      onUnexpectedExit: error => { console.error(error); app.exit(1); } });
    const origin = await server.start();
    session.defaultSession.protocol.handle("http", async request => {
      const url = new URL(request.url);
      if (url.origin !== ORIGIN) return new Response("Forbidden", { status: 403 });
      return session.defaultSession.fetch(`${origin}${url.pathname}${url.search}`, {
        method: request.method, headers: request.headers,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
        redirect: "manual", credentials: "include", bypassCustomProtocolHandlers: true,
      });
    });
    const verify = process.argv.includes("--verify");
    const copies = [];
    let copyFails = false;
    const window = new BrowserWindow({ show: !verify, width: 1280, height: 900,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: !verify,
        preload: resolve(__dirname, "../../electron/preload.cjs") } });
    const publish = installUpdateBridge({ ipcMain, getWindow: () => window, isPackaged: true,
      platform: target.platform, writeClipboard: text => {
        if (copyFails) throw new Error("Test pano hatası");
        if (verify) copies.push(text); else clipboard.writeText(text);
      } });
    await window.loadURL(ORIGIN);
    publish(await checkForUpdates({
      target, currentVersion: "0.1.0",
      isActive: () => !quitting && !window.isDestroyed(),
      fetchManifest: async () => Response.json({ schemaVersion: 1, platform: target.platform,
        arch: target.arch, version, size: 42, sha256: "a".repeat(64),
        url: `https://github.com/mertcreates/pofis-landing/releases/download/v${version}/Pofis-${version}-${target.id}.zip` }),
    }));
    if (verify) {
      const assert = require("node:assert/strict");
      const evaluate = code => window.webContents.executeJavaScript(code, true);
      const waitFor = (expression, message) => evaluate(`new Promise((resolve, reject) => {
        const deadline = Date.now() + 10000;
        const check = () => (${expression}) ? resolve() : Date.now() > deadline
          ? reject(new Error(${JSON.stringify(message)})) : setTimeout(check, 50);
        check();
      })`);
      await waitFor(`document.querySelector('.desktop-update-trigger') && document.querySelector('input[type="password"]')`,
        "Güncelleme düğmesi ve giriş formu bulunamadı.");
      await evaluate(`document.querySelector('.desktop-update-trigger').focus(); document.querySelector('.desktop-update-trigger').click()`);
      await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
      assert.equal(await evaluate(`document.querySelector('dialog[open] h2').textContent`), "Pofis’in yeni sürümü hazır");
      assert.equal(await evaluate(`document.querySelector('.desktop-update-command').textContent`),
        target.platform === "win32" ? "irm https://pofis.app/install.ps1 | iex" : "curl -fsSL https://pofis.app/install.sh | bash");
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.desktop-update-modal [role=status]')).display !== 'none'`), true);
      await evaluate(`document.querySelector('.desktop-update-actions .primary').click()`);
      await waitFor(`document.querySelector('.desktop-update-actions .primary')?.textContent === 'Kopyalandı'`, "Kopyalama tamamlanmadı.");
      assert.equal(await evaluate(`document.querySelector('.desktop-update-actions .primary').textContent`), "Kopyalandı");
      assert.equal(await evaluate(`document.querySelector('.desktop-update-modal [role=status]').textContent`), "Kopyalandı");
      assert.equal(copies.length, 1);
      await evaluate(`document.querySelector('.desktop-update-actions .text-button').click()`);
      await evaluate(`new Promise(resolve => requestAnimationFrame(resolve))`);
      assert.equal(await evaluate(`!!document.querySelector('dialog[open]')`), false);
      assert.equal(await evaluate(`document.activeElement.classList.contains('desktop-update-trigger')`), true);
      assert.equal(copies.length, 1);
      await window.loadURL(`${ORIGIN}/demo`);
      await waitFor(`document.querySelector('.header-actions .desktop-update-trigger')`, "Menü güncellemesi bulunamadı.");
      assert.equal(await evaluate(`!!document.querySelector('dialog[open]')`), false);
      await evaluate(`document.querySelector('.desktop-update-trigger').focus(); document.querySelector('.desktop-update-trigger').click()`);
      await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
      copyFails = true;
      await evaluate(`document.querySelector('.desktop-update-actions .primary').click()`);
      await waitFor(`document.querySelector('.desktop-update-status')?.textContent.includes('Kopyalanamadı')`, "Kopyalama hatası gösterilmedi.");
      assert.equal(await evaluate(`document.querySelector('.desktop-update-status').textContent`),
        "Kopyalanamadı. Komutu seçip elle kopyalayabilirsin.");
      copyFails = false;
      await evaluate(`document.querySelector('.desktop-update-actions .primary').click()`);
      await waitFor(`document.querySelector('.desktop-update-actions .primary')?.textContent === 'Kopyalandı'`, "Kopyalama yeniden denenemedi.");
      assert.equal(copies.length, 2);
      await evaluate(`document.documentElement.dataset.theme = 'dark'`);
      window.setSize(800, 700);
      await evaluate(`new Promise(resolve => setTimeout(resolve, 250))`);
      assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
      window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
      window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
      await waitFor(`!document.querySelector('dialog[open]')`, "Escape modalı kapatmadı.");
      assert.equal(await evaluate(`!!document.querySelector('dialog[open]')`), false);
      assert.equal(copies.length, 2);
      if (process.argv.includes("--capture")) {
        const { mkdir, writeFile } = require("node:fs/promises");
        await mkdir(resolve(__dirname, "../../work/update-preview"), { recursive: true });
        await evaluate(`document.querySelector('.mobile-menu-toggle').click()`);
        await evaluate(`document.querySelector('.desktop-update-trigger').click()`);
        window.showInactive();
        await evaluate(`new Promise(resolve => setTimeout(resolve, 300))`);
        await writeFile(resolve(__dirname, "../../work/update-preview/dark-narrow.png"), (await window.webContents.capturePage()).toPNG());
        await evaluate(`document.documentElement.dataset.theme = 'light'`);
        window.setSize(1280, 900);
        await evaluate(`new Promise(resolve => setTimeout(resolve, 300))`);
        await writeFile(resolve(__dirname, "../../work/update-preview/modal.png"), (await window.webContents.capturePage()).toPNG());
      }
      console.log("PASS: gerçek preload; giriş/menü; yeniden yüklemede sürüm; kopyalama/hata/tekrar; Daha sonra/Escape; odak dönüşü; dar/koyu görünüm.");
      window.destroy();
    }
  }).catch(async error => { console.error("Güncelleme demosu açılamadı:", error.message); await server?.stop(); app.exit(1); });
} else {
  const { spawn } = require("node:child_process");
  const { mkdtemp, rm } = require("node:fs/promises");
  const { tmpdir } = require("node:os");
  (async () => {
    if (!process.versions.bun) throw new Error("Demoyu bun run desktop:update-demo ile aç.");
    const temporaryRoot = resolve(tmpdir());
    const profile = await mkdtemp(join(temporaryRoot, "pofis-update-demo-"));
    try {
      console.log("Güncelleme demosu · 0.1.0 → 0.1.1\nÖrnek sürüm bilgisi kullanılır; indirme ve kurulum yapılmaz.");
      const env = { ...process.env };
      delete env.ELECTRON_RUN_AS_NODE;
      const child = spawn(require("electron"), [__filename, `--user-data-dir=${profile}`, ...process.argv.slice(2)],
        { env, windowsHide: true, stdio: "inherit" });
      const timer = process.argv.includes("--verify") ? setTimeout(() => {
        console.error("Güncelleme kabulü 90 saniyede tamamlanmadı.");
        child.kill();
      }, 90000) : null;
      try {
        process.exitCode = await new Promise((done, fail) => {
          child.once("error", fail);
          child.once("exit", code => done(code === 0 ? 0 : 1));
        });
      } finally { if (timer) clearTimeout(timer); }
    } finally {
      // Remove only the disposable profile created by this invocation.
      if (dirname(resolve(profile)) !== temporaryRoot) throw new Error("Demo profili temizleme sınırı aşıldı.");
      await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  })().catch(error => { console.error("Güncelleme demosu açılamadı:", error.message); process.exitCode = 1; });
}
