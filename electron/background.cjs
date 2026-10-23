const { ui } = require("./ui-text.cjs");

function showWindow({ app, window, platform }) {
  if (platform === "darwin") app.show();
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

function installBackground({ app, window, Tray, Menu, nativeImage, icon, platform, showWindow,
  toggleMini = showWindow, isQuitting, login = null }) {
  const image = nativeImage.createFromPath(icon).resize({ width: platform === "darwin" ? 18 : 24 });
  if (platform === "darwin") image.setTemplateImage(true);
  const tray = new Tray(image);
  tray.setToolTip(ui.desktop.trayTooltip);
  const menu = () => Menu.buildFromTemplate([
    { label: ui.desktop.mini, click: () => toggleMini(tray.getBounds()) },
    { label: ui.desktop.open, click: showWindow },
    ...(login ? [
      { type: "separator" },
      { label: ui.desktop.startAtLogin, type: "checkbox", checked: login.get(),
        click: item => { login.set(item.checked); tray.setToolTip(ui.desktop.trayTooltip); } },
    ] : []),
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
  return { stop: () => tray.destroy() };
}

module.exports = { installBackground, showWindow };
