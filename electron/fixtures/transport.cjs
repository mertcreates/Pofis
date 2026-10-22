const { app, BrowserWindow, session } = require("electron");
const { createDesktopTransport } = require("../transport.cjs");
const { ORIGIN } = require("../server.cjs");
const assert = require("node:assert/strict");

app.whenReady().then(async () => {
  const serverOrigin = process.argv.find(arg => arg.startsWith("--fixture-origin="))?.slice(17);
  session.defaultSession.protocol.handle("http", createDesktopTransport({ serverOrigin,
    fetch: (url, options) => session.defaultSession.fetch(url, options) }));
  const window = new BrowserWindow({ show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  await window.loadURL(ORIGIN);
  const result = await window.webContents.executeJavaScript(`(async () => {
    await document.fonts.ready;
    const response = await fetch('/echo?probe=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"fixture":true}' });
    const data = await response.json();
    return { origin: location.origin, fontLoaded: [...document.fonts].some(font => font.family === 'Geist' && font.status === 'loaded'),
      data, cookieVisible: document.cookie.includes('transport_fixture=') };
  })()`);
  assert.equal(result.origin, ORIGIN);
  assert.equal(result.fontLoaded, true);
  assert.equal(result.data.cookie, "transport_fixture=isolated");
  assert.equal(result.data.body, '{"fixture":true}');
  assert.equal(result.data.url, "/echo?probe=1");
  assert.equal(result.cookieVisible, false);
  console.log("PASS: mapped font, fixed origin, HttpOnly cookie and POST body");
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
