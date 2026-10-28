const { app, BrowserWindow, ipcMain, session, safeStorage, Notification, powerMonitor } = require("electron");
const { createServer } = require("node:http");
const { readFile, access } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { createDesktopTransport } = require("../../../electron/transport.cjs");
const { ORIGIN } = require("../../../electron/server.cjs");

const argument = name => process.argv.find(value => value.startsWith(`--${name}=`)).slice(name.length + 3);
const directory = argument("fixture");
const profile = argument("profile");
const stage = argument("stage");
const screenshot = process.argv.find(value => value.startsWith("--screenshot="))?.slice(13);
app.setPath("userData", profile);
app.commandLine.appendSwitch("user-data-dir", profile);

const credentials = { username: "fixture-user", password: "fixture-password" };
let authenticated = false, invalid = false, loginUnavailable = false, reportUnavailable = false, logins = 0, expiresAt = 0;
const trace = [];
const json = (response, value, status = 200, headers = {}) => {
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...headers });
  response.end(JSON.stringify(value));
};
const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) trace.push(`${request.method} ${url.pathname} ${logins}`);
  if (url.pathname === "/") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end('<!doctype html><html lang="tr"><head><meta charset="utf-8"><link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/pofis.css"><link rel="stylesheet" href="/modal.css"><link rel="stylesheet" href="/fixture.css"><style>@font-face{font-family:FixtureGeist;src:url(/fixture-font.woff2)}:root{--font-geist-sans:FixtureGeist}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
    return;
  }
  if (["/fixture.js", "/fixture.css", "/globals.css", "/pofis.css", "/modal.css"].includes(url.pathname)) {
    response.writeHead(200, { "content-type": url.pathname.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/css; charset=utf-8" });
    response.end(await readFile(join(directory, url.pathname.slice(1))));
    return;
  }
  if (url.pathname === "/fixture-font.woff2" || ["/pofi/states/idle.webp", "/pofi/states/working.webp"].includes(url.pathname)) {
    const file = url.pathname === "/fixture-font.woff2"
      ? resolve(__dirname, "../../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2")
      : resolve(__dirname, "../../../public", url.pathname.slice(1));
    response.writeHead(200, { "content-type": url.pathname.endsWith(".woff2") ? "font/woff2" : "image/webp" });
    response.end(await readFile(file));
    return;
  }
  if (url.pathname === "/api/session" && request.method === "POST") {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    if (loginUnavailable) return json(response, { error: "fixture timeout", code: "CONNECTION_FAILED" }, 502);
    if (invalid || body.username !== credentials.username || body.password !== credentials.password)
      return json(response, { error: "fixture rejected", code: "AUTH_FAILED" }, 401);
    logins++; authenticated = true; expiresAt = Date.now() + 3_600_000 + logins * 1000;
    return json(response, { connected: true }, 200, { "set-cookie": "pofis_session=fixture; Path=/; HttpOnly; SameSite=Strict" });
  }
  if (url.pathname === "/api/session" && request.method === "DELETE") {
    authenticated = false;
    return json(response, { connected: false }, 200, { "set-cookie": "pofis_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict" });
  }
  const active = authenticated && request.headers.cookie?.includes("pofis_session=fixture");
  const identity = { accountId: "a".repeat(64), expiresAt };
  if (url.pathname === "/api/session") return json(response, { connected: !!active, ...(active ? { notificationSession: identity } : {}) });
  if (url.pathname === "/api/session/heartbeat" && active) return json(response, { connected: true });
  if (url.pathname === "/api/meals" && active) return json(response, { menu: null, commentary: null });
  if (url.pathname === "/api/report" && active && reportUnavailable) {
    reportUnavailable = false;
    return json(response, { error: "fixture timeout", code: "CONNECTION_FAILED" }, 502);
  }
  if (url.pathname === "/api/report" && active) return json(response, {
    person: { id: "self", name: "Fixture", title: "", unit: "" },
    from: url.searchParams.get("from"), to: url.searchParams.get("to"),
    fetchedAt: new Date().toISOString(), passages: [], notificationSession: identity,
  });
  if (url.pathname.startsWith("/api/"))
    return json(response, { error: "fixture expired", code: "SESSION_EXPIRED" }, 401);
  response.writeHead(404); response.end();
});

const wait = async condition => {
  const deadline = Date.now() + 10_000;
  while (!await condition()) {
    if (Date.now() >= deadline) throw new Error("Fixture acceptance timed out");
    await new Promise(resolve => setTimeout(resolve, 20));
  }
};
const expectNoRememberedFile = async () => {
  try { await access(join(profile, "remembered-session.bin")); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  throw new Error("Remembered credentials were not removed");
};

app.whenReady().then(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const serverOrigin = `http://127.0.0.1:${server.address().port}`;
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const origin = new URL(details.url).origin;
    callback({ cancel: ![ORIGIN, serverOrigin].includes(origin) });
  });
  const transport = createDesktopTransport({ serverOrigin,
    fetch: (url, options) => session.defaultSession.fetch(url, options) });
  session.defaultSession.protocol.handle("http", transport);
  const window = new BrowserWindow({ show: false, width: 1000, height: 800,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, preload: join(directory, "preload.cjs") } });
  const retryTimers = [];
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = (callback, delay, ...args) => {
    const timer = originalSetTimeout(callback, delay, ...args);
    if (delay === 30_000) retryTimers.push(() => { clearTimeout(timer); callback(...args); });
    return timer;
  };
  let notifications;
  try {
    notifications = require(join(directory, "pofis-notifications.cjs")).installDesktopNotifications({
      app, ipcMain, session: session.defaultSession, safeStorage, Notification, powerMonitor,
      getWindow: () => window, origin: ORIGIN, showWindow() {}, rememberEnabled: true,
    });
  } finally { global.setTimeout = originalSetTimeout; }
  await window.loadURL(ORIGIN);
  const execute = code => window.webContents.executeJavaScript(code);
  const connected = () => execute("!!window.rememberFixture?.state.connected && !!window.rememberFixture.state.report");
  const input = async () => {
    await wait(() => execute('!!document.querySelector("input[name=remember]")'));
    await execute(`(() => {
      document.querySelector('input[name=username]').value = 'fixture-user';
      document.querySelector('input[name=password]').value = 'fixture-password';
      document.querySelector('input[name=remember]').click();
      document.querySelector('form').requestSubmit();
    })()`);
  };
  if (stage === "first") {
    await wait(() => execute('!!document.querySelector("input[name=remember]")'));
    if (await execute('document.querySelector("input[name=remember]").checked')) throw new Error("Remember must begin unchecked");
    if (screenshot) {
      await execute("document.fonts.ready");
      await wait(() => execute('document.querySelector("img")?.naturalWidth > 0'));
      require("node:fs").writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG());
    }
    await input(); await wait(connected);
    const encrypted = await readFile(join(profile, "remembered-session.bin"));
    if (encrypted.includes(credentials.username) || encrypted.includes(credentials.password)) throw new Error("Credential plaintext in profile");
    await execute("window.pofisNotifications.sync(window.rememberFixture.plans)");
    await wait(() => execute("window.rememberFixture.notifications.status?.active === true"));
    await execute(`window.fixtureTrace = []; window.fixtureNotificationExpiry = 0;
      window.pofisNotifications.onReport(value => { window.fixtureNotificationExpiry = value.notificationSession.expiresAt; window.fixtureTrace.push(['report', value.notificationSession.expiresAt]); });
      window.pofisNotifications.subscribe(value => window.fixtureTrace.push(['status', value.active, value.refreshError]));
      window.pofisRememberedSession.onRecovered(() => window.fixtureTrace.push(['recovered'])); true`);
    reportUnavailable = true;
    await execute("window.rememberFixture.state.refresh()");
    await wait(async () => logins === 2 && await connected());
    try {
      await wait(() => execute(`window.fixtureNotificationExpiry === ${expiresAt} && window.rememberFixture.notifications.status?.active === true`));
    } catch (error) {
      throw new Error(`${error.message}; expected=${expiresAt}; events=${JSON.stringify(await execute('window.fixtureTrace'))}; requests=${JSON.stringify(trace)}`);
    }
    authenticated = false;
    await execute("window.pofisNotifications.refresh()");
    await wait(async () => logins === 3 && await connected());
    authenticated = false;
    await execute("window.rememberFixture.state.refresh()");
    await wait(async () => logins === 4 && await connected());
    loginUnavailable = true; authenticated = false;
    await execute("window.rememberFixture.state.refresh()");
    await wait(() => retryTimers.length === 1);
    await input();
    await wait(() => retryTimers.length === 2);
    await wait(() => execute('window.rememberFixture.state.failure?.kind === "unavailable" && !window.rememberFixture.state.busy'));
    loginUnavailable = false;
    retryTimers[1]();
    await wait(async () => logins === 5 && await connected());
    await wait(() => execute(`window.fixtureNotificationExpiry === ${expiresAt}`));
    await execute("window.rememberFixture.openMeal()");
    await wait(() => execute('document.querySelector("dialog.meal-menu-modal")?.open && !!document.querySelector(".meal-empty")'));
    const mealTraceStart = trace.length;
    authenticated = false;
    await execute('document.querySelectorAll(".meal-week-day")[2].click()');
    await wait(async () => logins === 6 && await connected());
    await wait(() => execute('!document.querySelector("dialog.meal-menu-modal")'));
    const mealTrace = trace.slice(mealTraceStart);
    const mealRequest = mealTrace.indexOf("GET /api/meals 5");
    const sessionCheck = mealTrace.indexOf("GET /api/session 5", mealRequest + 1);
    const login = mealTrace.indexOf("POST /api/session 5", sessionCheck + 1);
    if (mealRequest < 0 || sessionCheck <= mealRequest || login <= sessionCheck)
      throw new Error(`Meal session recovery used an unexpected sequence: ${JSON.stringify(mealTrace)}`);
  } else {
    await wait(async () => logins === 1 && await connected());
    invalid = true; authenticated = false;
    await execute("window.rememberFixture.state.refresh()");
    await wait(() => execute('window.rememberFixture.state.failure?.kind === "credentials"'));
    await expectNoRememberedFile();
    invalid = false;
    await input(); await wait(connected);
    await execute("window.rememberFixture.state.disconnect()");
    await wait(() => execute("window.rememberFixture.state.connected === false"));
    await expectNoRememberedFile();
  }
  console.log("RESULT:" + JSON.stringify({ stage, logins, connected: authenticated }));
  notifications.stop(); await session.defaultSession.cookies.flushStore();
  window.destroy(); server.close(); app.exit(0);
}).catch(error => { console.error(error); server.close(); app.exit(1); });
