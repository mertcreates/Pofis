const { join, resolve, dirname } = require("node:path");

if (process.versions.electron) {
  const { app, BrowserWindow, clipboard, dialog } = require("electron");
  const { checkForUpdates } = require("../../electron/updates.cjs");
  const { platformTarget } = require("../../electron/platform.cjs");
  app.setName("Pofis güncelleme demosu");
  app.setPath("userData", app.commandLine.getSwitchValue("user-data-dir"));
  let quitting = false;
  app.on("before-quit", () => { quitting = true; });
  app.whenReady().then(async () => {
    const target = platformTarget();
    const version = "0.1.1";
    const window = new BrowserWindow({ show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
    await checkForUpdates({
      target, currentVersion: "0.1.0",
      isActive: () => !quitting && !window.isDestroyed(),
      fetchManifest: async () => Response.json({ schemaVersion: 1, platform: target.platform,
        arch: target.arch, version, size: 42, sha256: "a".repeat(64),
        url: `https://github.com/mertcreates/pofis-landing/releases/download/v${version}/Pofis-${version}-${target.id}.zip` }),
      showMessageBox: options => dialog.showMessageBox(window, options),
      writeClipboard: text => {
        clipboard.writeText(text);
        console.log("Kurulum komutu kopyalandı. Bir metin alanına yapıştırıp kontrol edebilirsin.");
      },
    });
    window.destroy();
    app.quit();
  }).catch(error => { console.error("Güncelleme demosu açılamadı:", error.message); app.exit(1); });
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
      const child = spawn(require("electron"), [__filename, `--user-data-dir=${profile}`],
        { env, windowsHide: true, stdio: "inherit" });
      process.exitCode = await new Promise((done, fail) => {
        child.once("error", fail);
        child.once("exit", code => done(code === 0 ? 0 : 1));
      });
    } finally {
      // Remove only the disposable profile created by this invocation.
      if (dirname(resolve(profile)) !== temporaryRoot) throw new Error("Demo profili temizleme sınırı aşıldı.");
      await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  })().catch(error => { console.error("Güncelleme demosu açılamadı:", error.message); process.exitCode = 1; });
}
