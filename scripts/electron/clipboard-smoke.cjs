const { join, resolve, dirname } = require("node:path");

if (process.versions.electron) {
  const assert = require("node:assert/strict");
  const { app, BrowserWindow, ClipboardItem, clipboard, session } = require("electron");
  const { installPermissions } = require("../../electron/permissions.cjs");
  const { ORIGIN } = require("../../electron/server.cjs");
  app.setPath("userData", app.commandLine.getSwitchValue("user-data-dir"));
  app.whenReady().then(async () => {
    const saved = await Promise.all((await clipboard.read()).map(async item => new ClipboardItem(
      Object.fromEntries(await Promise.all(item.types.map(async type => [type, await item.getType(type)]))),
    )));
    let window;
    try {
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
      assert.equal(await clipboard.readText(), "Pofis · teknik ayrıntı kabul testi");
      const read = await window.webContents.executeJavaScript(`(async () => {
        try { await navigator.clipboard.readText(); return "read"; }
        catch (error) { return error.name; }
      })()`, true);
      assert.equal(read, "NotAllowedError", "Renderer pano okuyamamalı");
      console.log("PASS: eski politika NotAllowedError; yeni politika gerçek panoya yazdı; pano okuma reddedildi.");
    } finally {
      // Restore every clipboard format without logging the user's clipboard data.
      if (saved.length) await clipboard.write(saved);
      else clipboard.clear();
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
      const child = spawn(require("electron"), [__filename, `--user-data-dir=${profile}`],
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
