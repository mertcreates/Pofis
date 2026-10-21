const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pofisUpdates", {
  get: () => ipcRenderer.invoke("pofis:update:get"),
  copyCommand: () => ipcRenderer.invoke("pofis:update:copy"),
  subscribe: callback => {
    const listener = (_event, update) => callback(update);
    ipcRenderer.on("pofis:update:available", listener);
    return () => ipcRenderer.removeListener("pofis:update:available", listener);
  },
});
