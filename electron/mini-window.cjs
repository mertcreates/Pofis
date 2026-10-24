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

function createMiniWindow({ BrowserWindow, screen, ipcMain, preload, platform, showMain, isQuitting, icon, additionalArguments = [], getAnchorBounds = () => undefined }) {
  let mini = null;
  let loading = null;
  let loaded = false;
  let pinned = false;
  let visible = false;
  let anchorBounds;
  let movedBounds = null;
  let stopped = false;
  const width = 356;
  let height = 240;
  const valid = () => mini && !mini.isDestroyed();
  function hide() {
    visible = false;
    if (valid()) mini.hide();
  }
  function authorize(event) {
    if (!valid() || event.sender !== mini.webContents ||
      event.senderFrame !== mini.webContents.mainFrame ||
      new URL(event.senderFrame.url).origin !== ORIGIN) {
      throw new Error("Pofi Mini isteğine izin verilmedi.");
    }
  }
  function fit() {
    if (!movedBounds) anchorBounds = getAnchorBounds() || anchorBounds;
    const anchor = movedBounds || anchorBounds;
    const point = { x: anchor.x + anchor.width / 2, y: anchor.y + anchor.height / 2 };
    const { workArea } = screen.getDisplayNearestPoint(point);
    const fittedWidth = Math.min(width, Math.max(1, workArea.width - 16));
    const fittedHeight = Math.min(height, 600, Math.max(1, workArea.height - 16));
    const position = movedBounds ? {
      x: Math.max(workArea.x, Math.min(workArea.x + workArea.width - fittedWidth, movedBounds.x)),
      y: Math.max(workArea.y, Math.min(workArea.y + workArea.height - fittedHeight, movedBounds.y)),
    } : miniPosition(anchorBounds, workArea, fittedWidth, fittedHeight, platform);
    mini.setSize(fittedWidth, fittedHeight);
    mini.setPosition(position.x, position.y);
  }
  const refit = () => { if (valid() && visible) fit(); };
  screen.on("display-metrics-changed", refit);
  screen.on("display-removed", refit);
  ipcMain.handle("pofis:mini:resize", (event, nextHeight) => {
    authorize(event);
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) throw new Error("Pofi Mini boyutu geçersiz.");
    const next = Math.max(160, Math.ceil(nextHeight));
    if (height === next) return;
    height = next;
    fit();
  });
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
    hide();
    showMain();
  });

  function ensure() {
    if (valid()) return;
    mini = new BrowserWindow({
      icon, width, height, show: false, frame: false, resizable: false,
      minimizable: false, maximizable: false, fullscreenable: false, skipTaskbar: true,
      backgroundColor: "#FAF9FD",
      ...(platform === "darwin" ? { type: "panel" } : {}),
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, preload, additionalArguments },
    });
    mini.setAlwaysOnTop(pinned, "floating");
    if (platform === "darwin") mini.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mini.on("will-move", (_event, bounds) => { movedBounds = bounds; });
    mini.on("blur", () => { if (!pinned && !isQuitting()) hide(); });
    mini.on("close", event => {
      if (isQuitting()) return;
      event.preventDefault();
      hide();
    });
    mini.on("closed", () => { mini = null; visible = false; loaded = false; loading = null; });
    mini.webContents.on("render-process-gone", () => { if (valid()) mini.destroy(); });
    mini.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    mini.webContents.on("will-navigate", (event, url) => {
      if (new URL(url).origin !== ORIGIN) event.preventDefault();
    });
    mini.webContents.on("will-redirect", (event, url) => {
      if (new URL(url).origin !== ORIGIN) event.preventDefault();
    });
    mini.webContents.on("before-input-event", (event, input) => {
      if (input.key === "Escape" && !pinned) { event.preventDefault(); hide(); }
    });
  }

  async function toggle(bounds) {
    if (stopped || isQuitting()) return;
    if (visible) {
      if (pinned) {
        if (valid() && loaded) {
          mini.show();
          mini.focus();
        }
      } else hide();
      return;
    }
    visible = true;
    const anchor = bounds || getAnchorBounds();
    const point = anchor ? null : screen.getCursorScreenPoint();
    anchorBounds = anchor || { ...point, width: 0, height: 0 };
    movedBounds = null;
    if (loading) return loading;
    ensure();
    if (loaded) {
      fit();
      mini.show();
      mini.focus();
      return;
    }
    const openingWindow = mini;
    const pending = openingWindow.loadURL(`${ORIGIN}/mini`);
    loading = pending;
    try {
      await pending;
      if (mini !== openingWindow || !valid()) return;
      loaded = true;
      if (!visible || stopped || isQuitting()) return;
      fit();
      mini.show();
      mini.focus();
    } catch (error) {
      if (mini !== openingWindow || stopped) return;
      hide();
      if (valid()) mini.destroy();
      throw error;
    } finally {
      if (loading === pending) loading = null;
    }
  }

  return {
    toggle,
    hide,
    getWindow: () => valid() ? mini : undefined,
    stop: () => {
      stopped = true;
      visible = false;
      screen.removeListener("display-metrics-changed", refit);
      screen.removeListener("display-removed", refit);
      ipcMain.removeHandler("pofis:mini:get");
      ipcMain.removeHandler("pofis:mini:pin");
      ipcMain.removeHandler("pofis:mini:open-main");
      ipcMain.removeHandler("pofis:mini:resize");
      if (valid()) mini.destroy();
    },
  };
}

module.exports = { miniPosition, createMiniWindow };
