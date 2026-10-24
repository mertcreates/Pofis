const { ui } = require("../src/lib/ui-text.js");
const { contextBridge, ipcRenderer } = require("electron");

const invokeNotification = async (name, input) => {
  const result = await ipcRenderer.invoke(`pofis:notifications:${name}`, input);
  if (!result?.ok) throw new Error(result?.error || ui.notificationErrors.bridgeFailed);
  return result.value;
};
const subscribeNotification = (name, callback) => {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(`pofis:notifications:${name}`, listener);
  return () => ipcRenderer.removeListener(`pofis:notifications:${name}`, listener);
};
contextBridge.exposeInMainWorld("pofisNotifications", {
  get: () => invokeNotification("get"),
  sync: plans => invokeNotification("sync", plans),
  pause: () => invokeNotification("pause"),
  refresh: () => invokeNotification("refresh"),
  save: preferences => invokeNotification("save", preferences),
  connectTelegram: input => invokeNotification("connectTelegram", input),
  telegramChats: token => invokeNotification("telegramChats", token),
  disconnectTelegram: () => invokeNotification("disconnectTelegram"),
  test: channel => invokeNotification("test", channel),
  subscribe: callback => subscribeNotification("status", callback),
  onReport: callback => subscribeNotification("report", callback),
  onExpired: callback => subscribeNotification("expired", callback),
});

contextBridge.exposeInMainWorld("pofisMini", {
  get: () => ipcRenderer.invoke("pofis:mini:get"),
  pin: () => ipcRenderer.invoke("pofis:mini:pin"),
  openMain: () => ipcRenderer.invoke("pofis:mini:open-main"),
  resize: height => ipcRenderer.invoke("pofis:mini:resize", height),
});

contextBridge.exposeInMainWorld("pofisUpdates", {
  get: () => ipcRenderer.invoke("pofis:update:get"),
  copyCommand: () => ipcRenderer.invoke("pofis:update:copy"),
  subscribe: callback => {
    const listener = (_event, update) => callback(update);
    ipcRenderer.on("pofis:update:available", listener);
    return () => ipcRenderer.removeListener("pofis:update:available", listener);
  },
});
