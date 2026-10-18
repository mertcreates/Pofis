const { app, BrowserWindow, dialog, Menu, session, utilityProcess } = require("electron");
const { join } = require("node:path");
const { createDesktopServer, ORIGIN } = require("./server.cjs");
const { startupId, writeStartupResult } = require("./startup.cjs");
const { platformTarget } = require("./platform.cjs");
const target = platformTarget();

app.setName("Pofis");
app.setPath("userData", app.commandLine.getSwitchValue("user-data-dir") || join(app.getPath("appData"), "Pofis"));

let window;
let server;
let serverOrigin;
let quitting = false;
let reportingFailure = false;
let ready = false;
const requests = new Set();
const firstRequest = startupId(process.argv);
if (firstRequest) requests.add(firstRequest);

async function report(status, message) {
  const batch = [...requests];
  requests.clear();
  for (const id of batch) {
    await writeStartupResult(app.getPath("userData"), id, {
      status, message, version: app.getVersion(), pid: process.pid,
      executable: process.execPath, origin: serverOrigin, windowReady: status === "ready",
    });
  }
}

async function focusAndReport() {
  if (!ready || quitting || reportingFailure) return;
  if (!window || window.isDestroyed() || window.webContents.isDestroyed() || !(await server.isHealthy())) {
    await report("error", "Pofis açık ancak kullanıma hazır değil. Uygulamayı kapatıp yeniden aç.");
    return;
  }
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
  await report("ready");
}

async function fail(error) {
  if (quitting || reportingFailure) return;
  reportingFailure = true;
  const installerIsWaiting = requests.size > 0;
  try { await report("error", error.message); }
  catch {
    // A profile write failure must still release the server and single-instance lock.
    console.error("Pofis başlangıç sonucu kaydedilemedi.");
  }
  if (window && !window.isDestroyed()) window.hide();
  if (!installerIsWaiting) await dialog.showMessageBox({ type: "error", title: "Pofis açılamadı", message: error.message });
  app.quit();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const id = startupId(argv);
    if (id) requests.add(id);
    focusAndReport().catch(fail);
  });
  app.on("activate", () => { focusAndReport().catch(fail); });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", (event) => {
    if (quitting) return;
    event.preventDefault();
    quitting = true;
    if (!server) { app.quit(); return; }
    server.stop().then(() => app.quit()).catch(async () => {
      await dialog.showMessageBox({ type: "error", title: "Pofis", message:
        "Pofis'in sunucu süreci kapatılamadı. Sistem süreç yöneticisinden kontrol et." });
      app.quit();
    });
  });
  app.whenReady().then(async () => {
    const icon = join(__dirname, "..", "public", "pofi", "pofi-mark-256.png");
    if (app.dock) app.dock.setIcon(icon);
    Menu.setApplicationMenu(target.platform === "darwin" ? Menu.buildFromTemplate([
      { label: "Pofis", submenu: [
        { label: "Pofis Hakkında", role: "about" }, { type: "separator" },
        { label: "Pofis'i Gizle", role: "hide" }, { label: "Tümünü Göster", role: "unhide" },
        { type: "separator" }, { label: "Pofis'ten Çık", role: "quit" },
      ] },
      { label: "Düzenle", submenu: [
        { label: "Geri Al", role: "undo" }, { label: "Yinele", role: "redo" },
        { type: "separator" }, { label: "Kes", role: "cut" }, { label: "Kopyala", role: "copy" },
        { label: "Yapıştır", role: "paste" }, { label: "Tümünü Seç", role: "selectAll" },
      ] },
    ]) : null);
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.on("will-download", (event) => event.preventDefault());
    server = createDesktopServer({
      root: app.isPackaged ? join(__dirname, "..", "server") : join(__dirname, "..", ".next", "standalone"),
      fork: (entry, args, options) => utilityProcess.fork(entry, args, options),
      sessionDirectory: join(app.getPath("userData"), "sessions"),
      onUnexpectedExit: fail,
    });
    serverOrigin = await server.start();
    if (quitting) return;
    // Keep Chromium storage on one origin while the server can move to a free port.
    // This intercepts only this Electron session, never the other local application.
    session.defaultSession.protocol.handle("http", async request => {
      const url = new URL(request.url);
      if (url.origin !== ORIGIN) return new Response("Forbidden", { status: 403 });
      const destination = new URL(serverOrigin);
      destination.pathname = url.pathname;
      destination.search = url.search;
      return session.defaultSession.fetch(destination.href, {
        method: request.method, headers: request.headers,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
        redirect: "manual", credentials: "include", bypassCustomProtocolHandlers: true,
      });
    });
    window = new BrowserWindow({
      icon,
      title: "Pofis", width: 1280, height: 900, minWidth: 800, minHeight: 600,
      show: false, autoHideMenuBar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    const restrictNavigation = (event, url) => {
      if (new URL(url).origin !== ORIGIN) event.preventDefault();
    };
    window.webContents.on("will-navigate", restrictNavigation);
    window.webContents.on("will-redirect", restrictNavigation);
    window.webContents.on("will-attach-webview", (event) => event.preventDefault());
    window.webContents.on("render-process-gone", () => fail(new Error("Pofis arayüzü kapandı. Uygulamayı yeniden aç.")));
    const painted = new Promise(resolve => window.once("ready-to-show", resolve));
    await window.loadURL(ORIGIN);
    await painted;
    ready = true;
    await focusAndReport();
  }).catch(fail);
}
