const { ui } = require("./ui-text.cjs");
const { ORIGIN } = require("./server.cjs");

function installUpdateBridge({ ipcMain, getWindow, isPackaged, platform, writeClipboard }) {
  let update = null;
  const command = platform === "win32" ? "irm https://pofis.app/install.ps1 | iex"
    : "curl -fsSL https://pofis.app/install.sh | bash";
  function authorize(event) {
    const contents = getWindow()?.webContents;
    if (!isPackaged || !contents || contents.isDestroyed() || event.sender !== contents ||
        event.senderFrame !== contents.mainFrame || new URL(event.senderFrame.url).origin !== ORIGIN) {
      throw new Error(ui.desktop.updateForbidden);
    }
  }
  ipcMain.handle("pofis:update:get", event => {
    authorize(event);
    return update;
  });
  ipcMain.handle("pofis:update:copy", event => {
    authorize(event);
    if (!update) throw new Error(ui.desktop.updateMissing);
    writeClipboard(command);
  });
  return next => {
    update = next ? { ...next, command } : null;
    const contents = getWindow()?.webContents;
    if (update && contents && !contents.isDestroyed()) contents.send("pofis:update:available", update);
  };
}

module.exports = { installUpdateBridge };
