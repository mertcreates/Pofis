const { ui } = require("./ui-text.cjs");
function installBackground({ app, window, Tray, Menu, nativeImage, icon, platform, showWindow, isQuitting }) {
  const image = nativeImage.createFromPath(icon).resize({ width: platform === "darwin" ? 18 : 24 });
  if (platform === "darwin") image.setTemplateImage(true);
  const tray = new Tray(image);
  tray.setToolTip(ui.desktop.trayTooltip);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: ui.desktop.open, click: showWindow },
    { type: "separator" },
    { label: ui.desktop.quit, click: () => app.quit() },
  ]));
  tray.on("click", showWindow);
  window.on("close", event => {
    if (isQuitting()) return;
    event.preventDefault();
    window.hide();
  });
  // Windows logoff/shutdown and macOS Cmd+Q must retain real application exit.
  window.on("query-session-end", () => app.quit());
  return { stop: () => tray.destroy() };
}

module.exports = { installBackground };
