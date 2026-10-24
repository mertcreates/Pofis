const { ui } = require("./ui-text.cjs");
const { formatTrayCountdown } = require("./menu-clock.cjs");

function showWindow({ app, window, platform }) {
  if (platform === "darwin") app.show();
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

function installBackground({ app, window, Tray, Menu, nativeImage, icon, platform, showWindow,
  toggleMini = showWindow, isQuitting, login = null, menuClock = null, now = Date.now,
  interval = setInterval, cancelInterval = clearInterval, extraMenu = () => [] }) {
  const image = nativeImage.createFromPath(icon).resize({ width: platform === "darwin" ? 18 : 24 });
  if (platform === "darwin") image.setTemplateImage(true);
  const tray = new Tray(image);
  tray.setToolTip(ui.desktop.trayTooltip);
  let goal = null;
  let lastTitle;
  function updateTitle() {
    if (platform !== "darwin") return;
    const title = menuClock?.get() === false ? "" : formatTrayCountdown(goal, now());
    if (title === lastTitle) return;
    tray.setTitle(title, { fontType: "monospacedDigit" });
    lastTitle = title;
  }
  const timer = platform === "darwin" ? interval(updateTitle, 15000) : null;
  timer?.unref?.();
  const menu = () => Menu.buildFromTemplate([
    { label: ui.desktop.mini, click: () => toggleMini(tray.getBounds()) },
    { label: ui.desktop.open, click: showWindow },
    ...(menuClock ? [
      { type: "separator" },
      { label: ui.desktop.showRemainingInMenu, type: "checkbox", checked: menuClock.get(),
        click: item => {
          try { menuClock.set(item.checked); }
          catch { item.checked = menuClock.get(); console.warn("Pofis menü çubuğu tercihi kaydedilemedi."); }
          updateTitle();
        } },
    ] : []),
    ...(login ? [
      { type: "separator" },
      { label: ui.desktop.startAtLogin, type: "checkbox", checked: login.get(),
        click: item => { login.set(item.checked); tray.setToolTip(ui.desktop.trayTooltip); } },
    ] : []),
    ...extraMenu(),
    { type: "separator" },
    { label: ui.desktop.quit, click: () => app.quit() },
  ]);
  // On macOS the left click opens Pofi Mini and right click opens native actions.
  // Installing a permanent context menu would consume the left click on macOS.
  if (platform === "darwin") tray.on("right-click", () => tray.popUpContextMenu(menu()));
  else tray.setContextMenu(menu());
  tray.on("click", (_event, bounds) => toggleMini(bounds || tray.getBounds()));
  window.on("close", event => {
    if (isQuitting()) return;
    event.preventDefault();
    window.hide();
  });
  window.on("query-session-end", () => app.quit());
  updateTitle();
  return {
    getBounds() {
      const bounds = tray.getBounds();
      return bounds.width > 0 && bounds.height > 0 ? bounds : undefined;
    },
    setGoal(value) { goal = value; updateTitle(); },
    stop() {
      if (timer !== null) cancelInterval(timer);
      tray.destroy();
    },
  };
}

module.exports = { installBackground, showWindow };
