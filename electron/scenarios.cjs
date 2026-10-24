const { ORIGIN } = require("./server.cjs");

function createScenarioTransport({ runtime, transport, reportAccess, delay = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  function failure(status, code, error) { return Response.json({ code, error }, { status }); }
  return async request => {
    const url = new URL(request.url);
    if (url.origin !== ORIGIN) return new Response("Forbidden", { status: 403 });
    if (!url.pathname.startsWith("/api/")) return transport(request);
    const initial = runtime.state();
    if (initial.conditions.slow) await delay(2500);
    if (initial.version !== runtime.state().version) return failure(409, "SCENARIO_CHANGED", "Senaryo değişti; yeniden dene.");
    if (url.pathname === "/api/session" && request.method === "DELETE") {
      runtime.setCondition("expired", true); return Response.json({ connected: false });
    }
    if (!["/api/session", "/api/session/heartbeat", "/api/report"].includes(url.pathname))
      return failure(503, "CONNECTION_FAILED", "Bu kaynak senaryo modunda kullanılmıyor.");
    if (initial.conditions.expired) return failure(401, "SESSION_EXPIRED", "Örnek oturum sona erdi.");
    if (url.pathname !== "/api/report") return Response.json({ connected: true, notificationSession: runtime.session() });
    if (initial.conditions.offline) return failure(503, "NETWORK_ERROR", "Örnek bağlantı kesildi.");
    if (request.method !== "GET") return new Response(null, { status: 405 });
    const from = url.searchParams.get("from"), to = url.searchParams.get("to");
    if (!reportAccess.isOwnReport(url.searchParams.get("person")) || reportAccess.reportRangeIssue(from, to))
      return failure(400, "INVALID_INPUT", "Geçersiz örnek rapor aralığı.");
    return Response.json(runtime.report(from, to));
  };
}

function scenarioMenu({ runtime, desktopScenarios, reload, refresh }) {
  const { id, conditions } = runtime.state();
  return [{ id: "pofis-scenarios", label: "Senaryo modu", submenu: [
      ...desktopScenarios.map(value => ({ id: `pofis-scenario:${value.id}`, label: value.label, type: "radio", checked: id === value.id,
        click: () => { runtime.select(value.id); reload(); } })),
      { type: "separator" },
      ...[["offline", "Bağlantı kesildi"], ["expired", "Oturum sona erdi"], ["slow", "Yavaş yanıt (2,5 sn)"]]
        .map(([key, label]) => ({ id: `pofis-scenario:${key}`, label, type: "checkbox", checked: conditions[key],
          click: item => { runtime.setCondition(key, item.checked); refresh(); } })),
      { type: "separator" }, { label: "Senaryoyu sıfırla", click: () => { runtime.select(id); reload(); } },
    ] }];
}

function installScenarioClock({ ipcMain, getWindows, runtime }) {
  const listener = event => {
    const window = getWindows().find(value => value && !value.isDestroyed() && value.webContents === event.sender);
    const authorized = window && event.senderFrame === event.sender.mainFrame && URL.canParse(event.senderFrame.url) &&
      new URL(event.senderFrame.url).origin === ORIGIN;
    // Electron sends the synchronous reply on the first assignment, not when the listener returns.
    event.returnValue = authorized ? runtime.snapshot() : null;
  };
  ipcMain.on("pofis:scenario:clock", listener);
  return () => ipcMain.removeListener("pofis:scenario:clock", listener);
}
module.exports = { createScenarioTransport, scenarioMenu, installScenarioClock };
