const { ORIGIN } = require("./server.cjs");

function miniPosition(bounds, area, width, height, platform) {
  const center = bounds.x + bounds.width / 2;
  const x = Math.max(area.x, Math.min(area.x + area.width - width, Math.round(center - width / 2)));
  const below = bounds.y + bounds.height + 8;
  const above = bounds.y - height - 8;
  const preferred = platform === "darwin" || below + height <= area.y + area.height ? below : above;
  const y = Math.max(area.y, Math.min(area.y + area.height - height, preferred));
  return { x, y };
}

function createMiniWindow({ BrowserWindow, screen, ipcMain, app, preload, platform, showMain, isQuitting, icon }) {
  let mini = null;
  let loading = null;
  let pinned = false;
  const width = 356;
  const height = 468;
  const valid = () => mini && !mini.isDestroyed();
  function authorize(event) {
    if (!valid() || event.sender !== mini.webContents ||
      event.senderFrame !== mini.webContents.mainFrame ||
      new URL(event.senderFrame.url).origin !== ORIGIN) {
      throw new Error("Pofi Mini isteğine izin verilmedi.");
    }
  }
  ipcMain.handle("pofis:mini:get", event => {
    authorize(event);
    return { pinned };
  });
  ipcMain.handle("pofis:mini:pin", event => {
    authorize(event);
    pinned = !pinned;
    mini.setAlwaysOnTop(pinned, "floating");
    return { pinned };
  });
  ipcMain.handle("pofis:mini:open-main", event => {
    authorize(event);
    mini.hide();
    showMain();
  });

  function ensure() {
    if (valid()) return loading;
    mini = new BrowserWindow({
      icon, width, height, show: false, frame: false, resizable: false,
      maximizable: false, fullscreenable: false, skipTaskbar: true,
      backgroundColor: "#FAF9FD",
      ...(platform === "darwin" ? { type: "panel" } : {}),
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, preload },
    });
    mini.on("blur", () => { if (!pinned && !isQuitting()) mini.hide(); });
    mini.on("close", event => {
      if (isQuitting()) return;
      event.preventDefault();
      mini.hide();
    });
    mini.on("closed", () => { mini = null; loading = null; });
    mini.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    mini.webContents.on("will-navigate", (event, url) => {
      if (new URL(url).origin !== ORIGIN) event.preventDefault();
    });
    mini.webContents.on("before-input-event", (event, input) => {
      if (input.key === "Escape" && !pinned) { event.preventDefault(); mini.hide(); }
    });
    loading = mini.loadURL(`${ORIGIN}/mini`);
    return loading;
  }

  async function toggle(bounds) {
    if (valid() && mini.isVisible()) { mini.hide(); return; }
    await ensure();
    if (!valid() || isQuitting()) return;
    const point = bounds
      ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
      : screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    const anchor = bounds || { x: point.x, y: point.y, width: 0, height: 0 };
    const position = miniPosition(anchor, display.workArea, width, height, platform);
    mini.setPosition(position.x, position.y);
    // Re-open on fresh report and storage state, including changes made in the main window.
    mini.webContents.reload();
    mini.show();
    mini.focus();
  }

  return {
    toggle,
    hide: () => { if (valid()) mini.hide(); },
    stop: () => {
      ipcMain.removeHandler("pofis:mini:get");
      ipcMain.removeHandler("pofis:mini:pin");
      ipcMain.removeHandler("pofis:mini:open-main");
      if (valid()) mini.destroy();
    },
  };
}

module.exports = { miniPosition, createMiniWindow };
