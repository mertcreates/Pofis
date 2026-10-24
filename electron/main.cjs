const { product, ui } = require("./ui-text.cjs");
const { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, session, shell, utilityProcess, Tray, nativeImage, Notification, safeStorage, powerMonitor, globalShortcut, screen } = require("electron");
const { join } = require("node:path");
const { createDesktopServer, ORIGIN } = require("./server.cjs");
const { startupId, writeStartupResult } = require("./startup.cjs");
const { platformTarget } = require("./platform.cjs");
const { checkForUpdates } = require("./updates.cjs");
const { installUpdateBridge } = require("./update-bridge.cjs");
const { createWindowOpenHandler } = require("./external-links.cjs");
const { installPermissions } = require("./permissions.cjs");
const { isolateAcceptanceAnalytics } = require("./acceptance-network.cjs");
const { installBackground, showWindow: showNativeWindow, registerMiniShortcut } = require("./background.cjs");
const { createDesktopTransport } = require("./transport.cjs");
const { createMiniWindow } = require("./mini-window.cjs");
const { createMenuClockPreference } = require("./menu-clock.cjs");
const target = platformTarget();
const scenarioMode = process.argv.includes("--pofis-scenarios");
const serverDirectory = app.isPackaged ? join(__dirname, "..", "server") : join(__dirname, "..", ".next", "standalone");
const scenarioLibrary = scenarioMode ? require(join(serverDirectory, "pofis-scenarios.cjs")) : null;
const scenario = scenarioLibrary?.createScenarioRuntime();
const additionalArguments = scenarioMode ? ["--pofis-scenarios"] : [];

// Electron also uses this name in HTTP User-Agent, which must remain ASCII.
app.setName(scenarioMode ? `${product.name} Senaryo` : product.name);
if (target.platform === "linux") app.setDesktopName("app.pofis.client.desktop");
// Development and packaged runtimes own separate Windows shortcut identities.
if (target.platform === "win32") app.setAppUserModelId(app.isPackaged ? "app.pofis.client" : "app.pofis.client.dev");
app.setPath("userData", scenarioMode ? join(app.commandLine.getSwitchValue("user-data-dir") || app.getPath("appData"), "Pofis-Scenarios")
  : app.commandLine.getSwitchValue("user-data-dir") || join(app.getPath("appData"), "Pofis"));

let window;
let server;
let serverOrigin;
let quitting = false;
let reportingFailure = false;
let ready = false;
let updateTimer;
let notifications;
let background;
let mini;
let stopScenarioClock;
let scenarioReload = Promise.resolve();
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
    await report("error", ui.desktop.notReady);
    return;
  }
  showNativeWindow({ app, window, platform: target.platform });
  await report("ready");
}

async function fail(error) {
  if (quitting || reportingFailure) return;
  reportingFailure = true;
  const installerIsWaiting = requests.size > 0;
  try { await report("error", error.message); }
  catch {
    // A profile write failure must still release the server and single-instance lock.
    console.error(ui.diagnostics.startupReportFailed);
  }
  if (window && !window.isDestroyed()) window.hide();
  if (!installerIsWaiting) await dialog.showMessageBox({ type: "error", title: ui.desktop.startupFailed, message: error.message });
  app.quit();
}

if (!app.requestSingleInstanceLock() || process.argv.includes("--pofis-quit")) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    if (argv.includes("--pofis-quit")) { app.quit(); return; }
    const id = startupId(argv);
    if (id) requests.add(id);
    focusAndReport().catch(fail);
  });
  app.on("activate", () => { focusAndReport().catch(fail); });
  if (target.platform === "linux") {
    // The installer requests a graceful quit; the existing handler drains the server.
    process.on("SIGTERM", () => app.quit());
    process.on("SIGINT", () => app.quit());
  }
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", (event) => {
    if (quitting) return;
    event.preventDefault();
    quitting = true;
    clearTimeout(updateTimer);
    notifications?.stop();
    background?.stop();
    mini?.stop();
    stopScenarioClock?.();
    globalShortcut.unregisterAll();
    if (!server) { app.quit(); return; }
    server.stop().then(() => app.quit()).catch(async () => {
      await dialog.showMessageBox({ type: "error", title: product.name, message:
        ui.desktop.stopFailed });
      app.quit();
    });
  });
  app.whenReady().then(async () => {
    const icon = join(__dirname, "..", "public", "pofi", "pofi-mark-256.png");
    if (target.platform === "darwin") app.setAboutPanelOptions({
      applicationName: product.name, applicationVersion: app.getVersion(),
      copyright: ui.desktop.copyright, credits: ui.desktop.credits,
    });
    if (app.dock) app.dock.setIcon(icon);
    const applicationMenu = target.platform === "darwin" ? [
      { label: product.name, submenu: [
        { label: ui.desktop.about, role: "about" }, { type: "separator" },
        { label: ui.desktop.services, role: "services", submenu: [] }, { type: "separator" },
        { label: ui.desktop.hide, role: "hide" }, { label: ui.desktop.hideOthers, role: "hideOthers" },
        { label: ui.desktop.showAll, role: "unhide" },
        { type: "separator" }, { label: ui.desktop.menuQuit, role: "quit" },
      ] },
      { label: ui.desktop.edit, submenu: [
        { label: ui.desktop.undo, role: "undo" }, { label: ui.desktop.redo, role: "redo" },
        { type: "separator" }, { label: ui.desktop.cut, role: "cut" }, { label: ui.desktop.copy, role: "copy" },
        { label: ui.desktop.paste, role: "paste" }, { label: ui.desktop.selectAll, role: "selectAll" },
      ] },
      { label: ui.desktop.window, role: "windowMenu", submenu: [
        { label: ui.desktop.minimize, role: "minimize" }, { label: ui.desktop.zoom, role: "zoom" },
        { label: ui.desktop.closeWindow, role: "close" },
        { type: "separator" },
        { label: ui.desktop.mini, click: () => void toggleMini() },
        { label: ui.desktop.open, click: () => showWindow() },
        { type: "separator" }, { label: ui.desktop.bringAllToFront, role: "front" },
      ] },
    ] : [];
    installPermissions(session.defaultSession, () => window?.webContents);
    isolateAcceptanceAnalytics(session.defaultSession, process.env.POFIS_TEST_BLOCK_ANALYTICS === "1");
    session.defaultSession.on("will-download", (event) => event.preventDefault());
    server = createDesktopServer({
      root: serverDirectory,
      fork: (entry, args, options) => utilityProcess.fork(entry, args, options),
      sessionDirectory: join(app.getPath("userData"), "sessions"),
      onUnexpectedExit: fail,
    });
    serverOrigin = await server.start();
    if (quitting) return;
    // Keep Chromium storage on one origin while the server can move to a free port.
    // This intercepts only this Electron session, never the other local application.
    const transport = createDesktopTransport({ serverOrigin,
      fetch: (url, options) => session.defaultSession.fetch(url, options) });
    session.defaultSession.protocol.handle("http", scenario
      ? require("./scenarios.cjs").createScenarioTransport({ runtime: scenario, transport, reportAccess: scenarioLibrary.reportAccess }) : transport);
    if (scenario) {
      // The isolated profile may load only this app's loopback server, including inner transport hops.
      session.defaultSession.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*"] }, (details, callback) => {
        callback({ cancel: ![ORIGIN, serverOrigin].includes(new URL(details.url).origin) });
      });
      stopScenarioClock = require("./scenarios.cjs").installScenarioClock({ ipcMain, runtime: scenario,
        getWindows: () => [window, mini?.getWindow()] });
    }
    const publishUpdate = installUpdateBridge({ ipcMain, getWindow: () => window,
      isPackaged: app.isPackaged, platform: target.platform, writeClipboard: text => clipboard.writeText(text) });
    window = new BrowserWindow({
      icon,
      title: scenarioMode ? `${product.name} · Senaryo` : product.name, width: 1280, height: 900, minWidth: 800, minHeight: 600,
      show: false, autoHideMenuBar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true,
        additionalArguments, preload: app.isPackaged ? join(__dirname, "..", "server", "preload.cjs")
          : join(__dirname, "..", ".next", "standalone", "preload.cjs") },
    });
    if (scenario) window.webContents.on("preload-error", (_event, _path, error) => {
      console.error("Senaryo preload yüklenemedi:", error.message);
      void fail(error);
    });
    const showWindow = () => {
      if (quitting || reportingFailure || !window || window.isDestroyed()) return;
      showNativeWindow({ app, window, platform: target.platform });
    };
    const preload = app.isPackaged ? join(__dirname, "..", "server", "preload.cjs")
      : join(__dirname, "..", ".next", "standalone", "preload.cjs");
    mini = createMiniWindow({ BrowserWindow, screen, ipcMain, preload,
      platform: target.platform, icon, showMain: showWindow, isQuitting: () => quitting, additionalArguments,
      getAnchorBounds: () => background?.getBounds() });
    const buildScenarioMenu = () => scenario ? require("./scenarios.cjs").scenarioMenu({
      runtime: scenario, desktopScenarios: scenarioLibrary.desktopScenarios,
      reload: () => {
        rebuildApplicationMenu();
        scenarioReload = scenarioReload.then(async () => {
          if (quitting) return;
          notifications?.pause();
          mini.getWindow()?.destroy();
          await window.loadURL(ORIGIN);
        }).catch(fail);
      },
      refresh: () => {
        rebuildApplicationMenu();
        for (const targetWindow of [window, mini.getWindow()]) {
          if (targetWindow && !targetWindow.isDestroyed() && !targetWindow.webContents.isDestroyed())
            targetWindow.webContents.send("pofis:scenario:refresh");
        }
        void notifications?.refresh().catch(error => console.warn("Senaryo yenilenemedi:", error.message));
      },
    }) : [];
    const rebuildApplicationMenu = () => Menu.setApplicationMenu(applicationMenu.length || scenario
      ? Menu.buildFromTemplate([...applicationMenu, ...buildScenarioMenu()]) : null);
    const toggleMini = bounds => mini.toggle(bounds).catch(error => {
      console.error("Pofi Mini açılamadı:", error);
      showWindow();
    });
    rebuildApplicationMenu();
    // The native menu title uses the same verified goal as notifications.
    background = installBackground({ app, window, Tray, Menu, nativeImage, icon,
      platform: target.platform, showWindow, toggleMini, isQuitting: () => quitting,
      extraMenu: buildScenarioMenu, now: scenario?.now,
      menuClock: target.platform === "darwin"
        ? createMenuClockPreference(join(app.getPath("userData"), "menu-clock.json")) : null,
      login: !scenarioMode && target.platform === "darwin" && app.isPackaged ? {
        get: () => app.getLoginItemSettings().openAtLogin,
        set: enabled => app.setLoginItemSettings({ openAtLogin: enabled }),
      } : null });
    registerMiniShortcut(globalShortcut, toggleMini);
    // The packaged-app smoke test drives the real menu action through the main inspector.
    if (process.env.POFIS_TEST_BLOCK_ANALYTICS === "1")
      app.on("pofis:acceptance:mini", () => void toggleMini());
    if (app.dock) app.dock.setMenu(Menu.buildFromTemplate([
      { label: ui.desktop.mini, click: () => void toggleMini() },
      { label: ui.desktop.open, click: showWindow },
    ]));
    const runtimePath = app.isPackaged ? join(__dirname, "..", "server", "pofis-notifications.cjs")
      : join(__dirname, "..", ".next", "standalone", "pofis-notifications.cjs");
    notifications = require(runtimePath).installDesktopNotifications({ app, ipcMain, session: session.defaultSession,
      Notification, safeStorage, powerMonitor, getWindow: () => window, getMiniWindow: () => mini.getWindow(), origin: ORIGIN, showWindow,
      onGoal: goal => background?.setGoal(goal), now: scenario?.now,
      ...(scenario ? { telegramFetch: async () => { throw new Error("Senaryo modunda Telegram gönderilmez."); } } : {}) });
    window.webContents.on("did-start-navigation", (_event, _url, isInPlace, isMainFrame) => {
      if (isMainFrame && !isInPlace) notifications.pause();
    });
    window.webContents.setWindowOpenHandler(createWindowOpenHandler({
      openExternal: url => shell.openExternal(url),
      onError: () => {
        console.error(ui.diagnostics.externalLinkFailed);
        dialog.showMessageBox(window, { type: "error", title: ui.desktop.linkFailedTitle,
          message: ui.desktop.linkFailed })
          .catch(() => console.error(ui.diagnostics.linkDialogFailed));
      },
    }));
    const restrictNavigation = (event, url) => {
      if (new URL(url).origin !== ORIGIN) event.preventDefault();
    };
    window.webContents.on("will-navigate", restrictNavigation);
    window.webContents.on("will-redirect", restrictNavigation);
    window.webContents.on("will-attach-webview", (event) => event.preventDefault());
    window.webContents.on("render-process-gone", () => fail(new Error(ui.desktop.rendererClosed)));
    await window.loadURL(ORIGIN);
    // Show the loaded page without waiting for a paint from an initially hidden window.
    ready = true;
    await focusAndReport();
    if (app.isPackaged && !scenarioMode) {
      updateTimer = setTimeout(() => {
        checkForUpdates({
          target, currentVersion: app.getVersion(),
          isActive: () => !quitting && !reportingFailure && !window.isDestroyed() && !window.webContents.isDestroyed(),
        }).then(publishUpdate).catch(() => {
          // Update failures are optional diagnostics and must never fail application startup.
          console.warn(ui.diagnostics.updateCheckFailed);
        });
      }, 3000);
      updateTimer.unref();
    }
  }).catch(fail);
}
