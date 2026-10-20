const { join, resolve, dirname } = require("node:path");

// The OS clipboard is shared across profiles. Run only on a disposable CI/VM desktop.
if (!process.argv.includes("--isolated-desktop")) {
  throw new Error("Bu test sistem panosunu temizler. İzole CI/VM masaüstünde --isolated-desktop ile çalıştır.");
}

if (process.versions.electron) {
  const assert = require("node:assert/strict");
  const { app, BrowserWindow, clipboard, session } = require("electron");
  const { installPermissions } = require("../../electron/permissions.cjs");
  const { ORIGIN } = require("../../electron/server.cjs");
  const { checkForUpdates } = require("../../electron/updates.cjs");
  const { platformTarget } = require("../../electron/platform.cjs");
  app.setPath("userData", app.commandLine.getSwitchValue("user-data-dir"));
  app.whenReady().then(async () => {
    let window;
    try {
      clipboard.clear();
      const isolated = session.fromPartition("clipboard-smoke");
      isolated.protocol.handle("http", () => new Response("<!doctype html><title>Pofis clipboard acceptance</title>"));
      isolated.setPermissionCheckHandler(() => false);
      isolated.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
      window = new BrowserWindow({ show: false,
        webPreferences: { session: isolated, nodeIntegration: false, contextIsolation: true, sandbox: true } });
      await window.loadURL(ORIGIN);
      window.webContents.focus();
      const write = () => window.webContents.executeJavaScript(`(async () => {
        try { await navigator.clipboard.writeText("Pofis · teknik ayrıntı kabul testi"); return "copied"; }
        catch (error) { return error.name; }
      })()`, true);
      assert.equal(await write(), "NotAllowedError", "Eski politika hatayı yeniden üretmeli");
      installPermissions(isolated, () => window.webContents);
      assert.equal(await write(), "copied", "Pofis ana çerçevesi panoya yazabilmeli");
      assert.equal(clipboard.readText(), "Pofis · teknik ayrıntı kabul testi");
      const read = await window.webContents.executeJavaScript(`(async () => {
        try { await navigator.clipboard.readText(); return "read"; }
        catch (error) { return error.name; }
      })()`, true);
      assert.equal(read, "NotAllowedError", "Renderer pano okuyamamalı");
      const target = platformTarget();
      await checkForUpdates({ target, currentVersion: "0.0.0", isActive: () => true,
        showMessageBox: async () => ({ response: 0 }), writeClipboard: text => clipboard.writeText(text),
        fetchManifest: async () => Response.json({ schemaVersion: 1, platform: target.platform, arch: target.arch,
          version: "0.0.1", size: 1, sha256: "a".repeat(64),
          url: `https://github.com/mertcreates/pofis-landing/releases/download/v0.0.1/Pofis-0.0.1-${target.id}.zip` }),
      });
      assert.equal(clipboard.readText(), target.platform === "win32" ? "irm https://pofis.app/install.ps1 | iex"
        : "curl -fsSL https://pofis.app/install.sh | bash");
      console.log("PASS: renderer yazdı; pano okuma reddedildi; güncelleme komutu gerçek panoya kopyalandı.");
    } finally {
      clipboard.clear();
      window?.destroy();
    }
    app.quit();
  }).catch(error => { console.error(error); app.exit(1); });
} else {
  const { spawn } = require("node:child_process");
  const { mkdtemp, rm } = require("node:fs/promises");
  const { tmpdir } = require("node:os");
  (async () => {
    const temporaryRoot = resolve(tmpdir());
    const profile = await mkdtemp(join(temporaryRoot, "pofis-clipboard-smoke-"));
    try {
      const env = { ...process.env };
      delete env.ELECTRON_RUN_AS_NODE;
      const child = spawn(require("electron"), [__filename, "--isolated-desktop", `--user-data-dir=${profile}`],
        { env, windowsHide: true, stdio: "inherit" });
      const timer = setTimeout(() => child.kill(), 30000);
      try {
        process.exitCode = await new Promise((done, fail) => {
          child.once("error", fail);
          child.once("exit", (code, signal) => {
            if (code !== 0) console.error(`Electron pano testi kapandı: code=${code}, signal=${signal}`);
            done(code === 0 ? 0 : 1);
          });
        });
      } finally { clearTimeout(timer); }
    } finally {
      if (dirname(resolve(profile)) !== temporaryRoot) throw new Error("Test profili temizleme sınırı aşıldı.");
      await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
