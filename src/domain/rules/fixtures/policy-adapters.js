import { plugin } from "bun";
import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const altered = process.argv.includes("altered");
// Change policies in memory; render the established-session and manual-chat states.
plugin({ name: "adapter-policy-fixture", setup(build) {
  build.onLoad({ filter: /(?:session-policy|report-access|pdks-state|pdks-failure|telegram-input|telegram-setup|navigation)\.tsx?$/ }, async ({ path }) => {
    let contents = await Bun.file(path).text();
    if (path.endsWith("pdks-state.ts")) contents = contents.replace('connected: null, busy: "session"', 'connected: true, busy: ""');
    if (path.endsWith("telegram-setup.tsx")) contents = contents.replace("[manualChat, setManualChat] = useState(false)", "[manualChat, setManualChat] = useState(true)");
    if (altered) contents = contents.replace('person: "self"', 'person: "current"')
      .replace("heartbeatTimeoutMs: 10_000", "heartbeatTimeoutMs: 25")
      .replace("error.status === 401", "error.status === 419")
      .replace("[1-9][0-9]{3,19}", "[1-9][0-9]{5,19}")
      .replace("EXTRA_TIME_STEP_MINUTES = 15", "EXTRA_TIME_STEP_MINUTES = 30");
    return { loader: path.endsWith(".tsx") ? "tsx" : "ts", contents };
  });
}});
const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { usePdks } = await import("../../../data/use-pdks.ts");
const { startSessionHeartbeat } = await import("../../../lib/session-heartbeat.js");
const { installDesktopNotifications } = await import("../../../desktop/install-notifications.ts");
const { demoData } = await import("../../../demo/report.ts");
const { emptyWorkPlans } = await import("../work-plan.ts");
const { PdksClient } = await import("../../../server/pdks.js");
const { load } = await import("cheerio");
const { DemoDayPicker } = await import("../../../demo/day-picker.tsx");
const { previewDemoDay } = await import("../../../demo/navigation.ts");
const { TelegramSetup } = await import("../../../components/notifications/telegram-setup.tsx");
const { createTelegram, readTelegramInput } = await import("../../../desktop/telegram.ts");
const person = altered ? "current" : "self";
globalThis.window = new EventTarget();
globalThis.document = new EventTarget();
let hook;
function Probe() { hook = usePdks("2026-10-19"); return null; }
renderToStaticMarkup(createElement(Probe));
const report = (from, to) => ({ person: { id: person, name: "Test", unit: "", title: "" }, from, to,
  fetchedAt: new Date().toISOString(), passages: [] });
let webPerson;
globalThis.fetch = async path => {
  const url = new URL(path, "http://localhost");
  webPerson = url.searchParams.get("person");
  return Response.json(report(url.searchParams.get("from"), url.searchParams.get("to")));
};
await hook.refresh();
const profile = new PdksClient();
profile.request = async () => ({ html: '<span id="fixture_RPPersonel_LblKisiAdiSoyadi">Test</span>' });
const profilePerson = (await profile.personalProfile()).id;

const capturedAt = Date.parse("2026-10-15T12:00:00Z");
const demoHtml = load(renderToStaticMarkup(createElement(DemoDayPicker, {
  dates: ["2026-10-15"], selected: "2026-10-15", now: capturedAt, capturedAt,
  extraMinutes: 0, maxExtraMinutes: 120, onExtraMinutesChange() {}, onSelect() {},
})));
const demoStep = Number(demoHtml("#demo-extra-time").attr("step"));
const preview = { ...report("2026-10-12", "2026-10-18"), passages: [{ date: "2026-10-15", time: "08:00:00", direction: "in" }] };
const demoNext = previewDemoDay(preview, "2026-10-15", capturedAt, demoStep);
let fifteenAccepted = true;
try { previewDemoDay(preview, "2026-10-15", capturedAt, 15); } catch { fifteenAccepted = false; }
const emptyDemoHtml = load(renderToStaticMarkup(createElement(DemoDayPicker, {
  dates: ["2026-10-15"], selected: "2026-10-15", now: capturedAt, capturedAt,
  extraMinutes: 0, maxExtraMinutes: 0, onExtraMinutesChange() {}, onSelect() {},
})));
const demo = { step: demoStep, nextAt: demoNext.now, fifteenAccepted,
  disabledMaximum: Number(emptyDemoHtml("#demo-extra-time").attr("max")), disabled: emptyDemoHtml("#demo-extra-time").attr("disabled") !== undefined };

const setupHtml = load(renderToStaticMarkup(createElement(TelegramSetup, {
  actions: {}, disabled: false, connectionError: "", onClose() {}, onConnected() {},
})));
const chatPattern = setupHtml("#telegram-chat").attr("pattern");
const token = "123456:" + "a".repeat(30);
const acceptedChats = ["1234", "123456"].filter(chatId => {
  try { readTelegramInput({ token, chatId }); return true; } catch { return false; }
});
const telegram = createTelegram(async () => Response.json({ ok: true, result: [123, 1234, 123456, -123456].map(id => ({ message: { chat: { id, type: "private" } } })) }));
const telegramResult = { inputAccepted: acceptedChats,
  formAccepted: ["1234", "123456"].filter(id => new RegExp("^(?:" + chatPattern + ")$").test(id)),
  discovered: (await telegram.chats(token)).map(chat => chat.id) };

const timeouts = [];
const originalTimeout = AbortSignal.timeout;
AbortSignal.timeout = ms => { timeouts.push(ms); return originalTimeout(ms); };
let webAborted = false;
let webFinished;
const webDone = new Promise(resolve => { webFinished = resolve; });
const stopHeartbeat = startSessionHeartbeat(() => {}, async (_, options) => {
  if (!altered) { webFinished(); return Response.json({ connected: true }); }
  return new Promise((_, reject) => options.signal.addEventListener("abort", () => {
    webAborted = true; webFinished(); reject(options.signal.reason);
  }, { once: true }));
});
async function timeoutGuard(promise) {
  let timer;
  try { await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("heartbeat did not finish")), 1000); })]); }
  finally { clearTimeout(timer); }
}
await timeoutGuard(webDone);
stopHeartbeat();
const webTimeout = timeouts.at(-1);

const directory = await mkdtemp(join(tmpdir(), "pofis-policy-adapters-"));
const handlers = new Map();
const frame = { url: "http://127.0.0.1:3210/" };
const emitted = [];
const contents = { mainFrame: frame, isDestroyed: () => false, send: name => emitted.push(name) };
let sessionFailure = null;
const workPlanSession = "b".repeat(64);
const identity = { accountId: "a".repeat(64), expiresAt: Date.now() + 3600000, workPlanSession };
let tick, desktopPerson, desktopAborted = false, desktopFinished;
const desktopDone = new Promise(resolve => { desktopFinished = resolve; });
const originalInterval = globalThis.setInterval;
globalThis.setInterval = callback => { tick = callback; return originalInterval(() => {}, 60000); };
let desktop;
try {
  desktop = installDesktopNotifications({
    app: { getPath: () => directory },
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    session: { fetch: async (path, options) => {
      const url = new URL(path);
      if (url.pathname === "/api/session") return sessionFailure
        ? Response.json({ code: sessionFailure.code }, { status: sessionFailure.status })
        : Response.json({ connected: true, notificationSession: identity, workPlanSession });
      if (url.pathname === "/api/report") {
        desktopPerson = url.searchParams.get("person");
        return Response.json({ ...report(url.searchParams.get("from"), url.searchParams.get("to")), notificationSession: identity });
      }
      if (url.pathname !== "/api/session/heartbeat") throw new Error("unexpected request");
      if (!altered) { desktopFinished(); return Response.json({ connected: true }); }
      return new Promise((_, reject) => options.signal.addEventListener("abort", () => {
        desktopAborted = true; desktopFinished(); reject(options.signal.reason);
      }, { once: true }));
    } },
    safeStorage: { isEncryptionAvailable: () => true, getSelectedStorageBackend: () => "gnome_libsecret" },
    Notification: { isSupported: () => true }, powerMonitor: new EventEmitter(),
    getWindow: () => ({ isDestroyed: () => false, webContents: contents }),
    origin: "http://127.0.0.1:3210", showWindow() {},
  });
} finally { globalThis.setInterval = originalInterval; }
try {
  const event = { sender: contents, senderFrame: frame };
  const plan = { plans: JSON.stringify(emptyWorkPlans()), session: workPlanSession };
  const synced = await handlers.get("pofis:notifications:sync")(event, plan);
  if (!synced.ok) throw new Error(synced.error);
  await handlers.get("pofis:notifications:refresh")(event);
  tick();
  await timeoutGuard(desktopDone);
  const desktopTimeout = timeouts.at(-1);
  const desktopExpiry = [];
  for (const failure of [{ status: 401, code: "SESSION_EXPIRED" }, { status: 419, code: "SESSION_EXPIRED" },
    { status: 401, code: "AUTH_FAILED" }, { status: 500, code: "SESSION_EXPIRED" }]) {
    sessionFailure = failure;
    const before = emitted.filter(name => name === "pofis:notifications:expired").length;
    await handlers.get("pofis:notifications:sync")(event, plan);
    desktopExpiry.push(emitted.filter(name => name === "pofis:notifications:expired").length > before);
  }
  console.log(JSON.stringify({ webPerson, desktopPerson, profilePerson,
    demoPersons: [...new Set(demoData().reports.map(report => report.person.id))],
    webTimeout, desktopTimeout, webAborted, desktopAborted, demo, telegram: telegramResult, desktopExpiry }));
} finally { desktop.stop(); await rm(directory, { recursive: true, force: true }); }
