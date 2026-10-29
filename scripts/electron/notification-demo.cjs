const { resolve, join, dirname } = require("node:path");
const { EventEmitter } = require("node:events");
const { createHash } = require("node:crypto");

if (process.versions.electron) {
  const { app, BrowserWindow, session, ipcMain, safeStorage, powerMonitor } = require("electron");
  const assert = require("node:assert/strict");
  const { installUpdateBridge } = require("../../electron/update-bridge.cjs");
  const { installBackground } = require("../../electron/background.cjs");
  const { Tray, Menu, nativeImage } = require("electron");
  const { ORIGIN } = require("../../electron/server.cjs");
  const { createDesktopTransport } = require("../../electron/transport.cjs");
  const profile = process.argv.find(value => value.startsWith("--user-data-dir=")).slice("--user-data-dir=".length);
  const upstream = process.argv.find(value => value.startsWith("--fixture-origin=")).slice("--fixture-origin=".length);
  app.setPath("userData", profile);
  app.setAppPath(resolve(__dirname, "../.."));
  let notifications, window, background, quitting = false;
  app.on("before-quit", () => { quitting = true; notifications?.stop(); background?.stop(); });
  app.on("window-all-closed", () => {}); // The acceptance owns shutdown after its final assertion.
  app.whenReady().then(async () => {
    require("../../electron/acceptance-network.cjs").isolateAcceptanceAnalytics(session.defaultSession, true);
    const now = Date.now();
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(now);
    const monday = new Date(`${today}T12:00:00+03:00`);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const from = monday.toISOString().slice(0, 10);
    const sunday = new Date(monday); sunday.setUTCDate(sunday.getUTCDate() + 6);
    const passages = [];
    for (let day = new Date(monday); day.toISOString().slice(0, 10) <= today; day.setUTCDate(day.getUTCDate() + 1)) {
      const date = day.toISOString().slice(0, 10);
      if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
      passages.push({ date, time: "09:00:00", direction: "in" });
      if (date !== today) passages.push({ date, time: "17:00:00", direction: "out" });
    }
    const workPlanSession = "b".repeat(64);
    const identity = { accountId: "a".repeat(64), expiresAt: now + 8 * 3600_000, workPlanSession };
    let plans = { defaultPlan: [480, 480, 480, 480, 480, 0, 0], weekOverrides: {} };
    const revision = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
    const report = { person: { id: "self", name: "Bildirim önizlemesi", title: "", unit: "" },
      from, to: sunday.toISOString().slice(0, 10), fetchedAt: new Date(now).toISOString(), passages, notificationSession: identity };
    const telegramMessages = [];
    let failTelegram = false;
    const transport = createDesktopTransport({ serverOrigin: upstream,
      fetch: (url, options) => session.defaultSession.fetch(url, options) });
    await session.defaultSession.protocol.handle("http", async request => {
      const url = new URL(request.url);
      if (url.origin !== ORIGIN) return new Response("Forbidden", { status: 403 });
      if (url.pathname === "/api/session") return Response.json({ connected: true, notificationSession: identity, workPlanSession });
      if (url.pathname === "/api/session/heartbeat") return Response.json({ connected: true });
      if (url.pathname === "/api/report") return Response.json(report);
      if (url.pathname === "/api/work-plans") {
        if (request.method === "PUT") {
          const input = await request.json();
          if (input.session !== workPlanSession || input.revision !== revision(plans))
            return Response.json({ code: "PLAN_CONFLICT" }, { status: 409 });
          plans = input.plans;
        }
        return Response.json({ plans, revision: revision(plans), session: workPlanSession });
      }
      return transport(request);
    });
    window = new BrowserWindow({ show: !process.argv.includes("--verify"), width: 1280, height: 950,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false,
        preload: resolve(__dirname, "../../.next/standalone/preload.cjs") } });
    window.webContents.on("console-message", event => {
      if (event.level === "error") console.error("Fixture renderer:", event.message);
    });
    installUpdateBridge({ ipcMain, getWindow: () => window, isPackaged: true, platform: process.platform, writeClipboard() {} });
    const shown = [];
    const nativeNotifications = [];
    class FakeNotification extends EventEmitter {
      static isSupported() { return true; }
      constructor(value) { super(); this.value = value; }
      show() { nativeNotifications.push(this); shown.push(this.value); this.emit("show"); }
      close() { this.emit("close"); }
    }
    const showWindow = () => { window.show(); window.focus(); };
    notifications = require(resolve(__dirname, "../../.next/standalone/pofis-notifications.cjs")).installDesktopNotifications({
      app, ipcMain, session: session.defaultSession, safeStorage, powerMonitor, Notification: FakeNotification,
      getWindow: () => window, origin: ORIGIN, showWindow,
      telegramFetch: async (url, options) => {
        if (failTelegram) throw new Error("fixture offline");
        const body = JSON.parse(options.body);
        const result = url.endsWith("getMe") ? { is_bot: true, username: "pofis_fixture_bot" }
          : url.endsWith("getChat") ? { type: "private", id: 12345678 }
          : url.endsWith("getUpdates") ? [{ message: { chat: { type: "private", id: 12345678, first_name: "Önizleme" } } }]
          : (telegramMessages.push(body), { message_id: 1 });
        return Response.json({ ok: true, result });
      },
    });
    background = installBackground({ app, window, Tray, Menu, nativeImage, icon: resolve(__dirname, "../../public/pofi/pofi-mark-256.png"),
      platform: process.platform, showWindow, isQuitting: () => quitting });
    await window.loadURL(ORIGIN);
    if (!process.argv.includes("--verify")) return;
    const evaluate = code => window.webContents.executeJavaScript(code, true);
    const until = (expression, message) => evaluate(`new Promise((resolve, reject) => {
      const deadline = Date.now() + 20000;
      const check = () => (${expression}) ? resolve() : Date.now() >= deadline ? reject(new Error(${JSON.stringify(message)})) : setTimeout(check, 50);
      check();
    })`);
    const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    await until(`Array.from(document.querySelectorAll('.sidebar-nav button')).some(button => button.textContent === 'Bildirimler')`, "Bildirim menüsü bulunamadı");
    await evaluate(`(() => { const button = Array.from(document.querySelectorAll('.sidebar-nav button')).find(button => button.textContent === 'Bildirimler'); button.focus(); button.click(); })()`);
    await until(`document.querySelector('.notification-reminders .notification-channel-switch input:not(:disabled)')`, "Ayarlar yüklenemedi");
    assert.equal(await evaluate(`document.querySelectorAll('.notification-channel-switch input:checked').length`), 0);
    assert.equal(await evaluate(`!!document.querySelector('.notification-setup-toggle')`), true);
    await click(`input[aria-label='Hedef çıkışa yaklaşınca · Masaüstü']`);
    await click(`.notification-settings form button[type=submit]`);
    await until(`document.querySelector('#notification-save-feedback')?.textContent.includes('kaydedildi')`, "Tercihler kaydedilmedi");
    assert.equal((await evaluate(`window.pofisNotifications.get()`)).preferences.approaching.native, true);
    await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Masaüstünde dene').click()`);
    await until(`document.querySelector('#notification-native-feedback')?.textContent.includes('işletim sistemine')`, "Native deneme tamamlanmadı");
    assert.equal(shown.length, 1);
    assert.equal(shown[0].title, "Pofis bildirimi hazır");
    assert.equal(shown[0].body, "Mesai hatırlatmaların burada görünecek.");
    assert.equal(require("node:fs").existsSync(shown[0].icon), true);
    assert.deepEqual(require("node:fs").readFileSync(shown[0].icon), require("node:fs").readFileSync(resolve(__dirname, "../../public/pofi/pofi-mark-256.png")));
    await click('.notification-setup-toggle');
    assert.equal(await evaluate(`document.querySelector('#telegram-setup').hidden`), false);
    const preview = require('node:fs/promises');
    await preview.mkdir(resolve(__dirname, '../../work/notification-preview'), { recursive: true });
    window.setSize(390, 844);
    await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    assert.equal(await evaluate(`document.documentElement.scrollWidth > window.innerWidth`), false);
    await preview.writeFile(resolve(__dirname, '../../work/notification-preview/setup-390.png'), (await window.webContents.capturePage()).toPNG());
    await evaluate(`document.querySelector('#telegram-token').scrollIntoView({block:'center'})`);
    await preview.writeFile(resolve(__dirname, '../../work/notification-preview/setup-fields-390.png'), (await window.webContents.capturePage()).toPNG());
    await click('#telegram-setup .notification-setup-cancel');
    await click('.mobile-menu-toggle');
    await click('.sidebar-nav button');
    assert.equal(await evaluate(`document.querySelector('.header-menu').dataset.open`), 'false');
    await click('.mobile-menu-toggle');
    await evaluate(`Array.from(document.querySelectorAll('.sidebar-nav button')).find(button => button.textContent === 'Bildirimler').click()`);
    await until(`document.activeElement?.id === 'notifications-title'`, 'Mobil sayfa odağı alınamadı');
    assert.equal(await evaluate(`document.querySelector('#notifications-title').getBoundingClientRect().top >= 0`), true);
    assert.equal(await evaluate(`document.querySelector('.header-menu').dataset.open`), 'false');
    window.setSize(1280, 1000);
    await click('.notification-setup-toggle');
    const token = "123456:abcdefghijklmnopqrstuvwxyzABCDEF";
    await evaluate(`(() => { const input = document.querySelector('#telegram-token');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(token)});
      input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
    await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Sohbeti bul').click()`);
    await until(`document.querySelector('#telegram-chats option[value="12345678"]')`, "Sohbet bulunamadı");
    await evaluate(`(() => { const input = document.querySelector('#telegram-chats'); input.value = '12345678'; input.dispatchEvent(new Event('change', {bubbles:true})); })()`);
    await click(`#telegram-setup form button[type=submit]`);
    await until(`document.querySelector('.notification-telegram-channel .notification-channel-info span')?.textContent === '@pofis_fixture_bot'`, "Telegram bağlanamadı");
    assert.equal((await evaluate(`window.pofisNotifications.get()`)).telegram.connected, true);
    const fs = require("node:fs/promises");
    const stored = await fs.readFile(join(profile, "notifications", `${identity.accountId}.json`), "utf8");
    assert.equal(stored.includes(token), false);
    assert.equal(stored.includes("12345678"), false);
    failTelegram = true;
    await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Telegram’da dene').click()`);
    await until(`document.querySelector('#notification-telegram-feedback')?.textContent.includes('doğrulanamadı')`, "Gönderim hatası gösterilmedi");
    failTelegram = false;
    await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Telegram’da dene').click()`);
    await until(`document.querySelector('#notification-telegram-feedback')?.textContent.includes('Telegram’a gönderildi')`, "Telegram tekrar denemesi tamamlanmadı");
    assert.equal(telegramMessages.length, 1);
    assert.equal(await evaluate(`window.pofisNotifications.save({leadMinutes: 0}).then(() => false, () => true)`), true);
    assert.equal((await evaluate(`window.pofisNotifications.get()`)).preferences.leadMinutes, 10);
    const evil = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, sandbox: true, preload: resolve(__dirname, "../../.next/standalone/preload.cjs") } });
    await evil.loadURL(`${ORIGIN}/demo`);
    assert.equal(await evil.webContents.executeJavaScript(`window.pofisNotifications.get().then(() => false, () => true)`), true);
    evil.destroy();
    await click(`input[aria-label='Hedef çıkış saatinde · Masaüstü']`);
    await click('.sidebar-nav button');
    assert.equal(await evaluate(`document.querySelector('.notification-page').hidden`), true);
    await evaluate(`Array.from(document.querySelectorAll('.sidebar-nav button')).find(button => button.textContent === 'Bildirimler').click()`);
    await until(`document.activeElement?.id === 'notifications-title'`, "Başlık odağı alınamadı");
    assert.equal(await evaluate(`document.querySelectorAll('.sidebar-nav [aria-current="page"]').length`), 1);
    assert.equal(await evaluate(`document.querySelector('input[aria-label="Hedef çıkış saatinde · Masaüstü"]').checked`), true);
    assert.equal(await evaluate(`document.querySelector('dialog[open]') === null`), true);
    assert.equal(await evaluate(`document.querySelector('.notification-page').textContent.includes('Son arka plan')`), false);
    window.showInactive();
    await fs.mkdir(resolve(__dirname, "../../work/notification-preview"), { recursive: true });
    for (const [theme, width, height] of [["light", 1280, 1000], ["dark", 800, 800], ["light", 390, 844]]) {
      window.setSize(width, height);
      await evaluate(`document.documentElement.dataset.theme = '${theme}'`);
      await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
      await evaluate(`Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})))`);
      assert.equal(await evaluate(`!document.querySelector('.notification-page').hidden`), true);
      const overflow = await evaluate(`Array.from(document.querySelectorAll('.notification-page, .notification-reminders, .notification-channels')).some(element => element.scrollWidth > element.clientWidth + 1)`);
      assert.equal(overflow, false, `Yatay taşma: ${width}`);
      await fs.writeFile(resolve(__dirname, `../../work/notification-preview/${theme}-${width}.png`), (await window.webContents.capturePage()).toPNG());
    }
    const browserOnly = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, sandbox: true } });
    await browserOnly.loadURL(ORIGIN);
    const browserEvaluate = code => browserOnly.webContents.executeJavaScript(code, true);
    await browserEvaluate(`new Promise((resolve, reject) => {
      const deadline = Date.now() + 20000;
      const check = () => document.querySelector('.sidebar-nav button') ? resolve() : Date.now() > deadline ? reject(new Error('Web menüsü bulunamadı')) : setTimeout(check, 50);
      check();
    })`);
    const openSettings = `Array.from(document.querySelectorAll('.sidebar-nav button')).find(button => button.textContent === 'Bildirimler').click()`;
    await browserEvaluate(openSettings);
    assert.equal(await browserEvaluate(`document.querySelector('.notification-context').textContent.includes('masaüstü uygulamasını aç')`), true);
    assert.equal(await browserEvaluate(`Array.from(document.querySelectorAll('.notification-settings input, .notification-settings button')).every(element => element.matches(':disabled'))`), true);
    await browserOnly.loadURL(`${ORIGIN}/demo`);
    await browserEvaluate(`new Promise(resolve => { const check = () => document.querySelector('.sidebar-nav button') ? resolve() : setTimeout(check, 50); check(); })`);
    assert.equal(await browserEvaluate(`Array.from(document.querySelectorAll('.sidebar-nav button')).some(button => button.textContent === 'Bildirimler')`), true);
    browserOnly.destroy();
    window.close(); assert.equal(window.isDestroyed(), false); assert.equal(window.isVisible(), false);
    const status = await evaluate(`window.pofisNotifications.get()`); assert.equal(status.active, true);
    await new Promise(resolve => { window.once("show", resolve); nativeNotifications[0].emit("click"); });
    assert.equal(window.isVisible(), true);
    console.log("Bildirim kabulü geçti: opt-in, kalıcılık/şifreleme, native/Telegram, hata/tekrar, IPC, açık/koyu/dar görünüm, web/demo izolasyonu, arka plan.");
    process.send?.({ type: "notification-acceptance-complete" });
    app.quit();
  }).catch(async error => {
    console.error(error.stack);
    if (window && !window.isDestroyed()) console.error(await window.webContents.executeJavaScript(`JSON.stringify({url:location.href,bridge:!!window.pofisNotifications,text:document.body.innerText.slice(0,1600)})`));
    notifications?.stop(); background?.stop(); app.exit(1);
  });
} else {
  const { spawn } = require("node:child_process");
  const { mkdtemp, rm } = require("node:fs/promises");
  const { tmpdir } = require("node:os");
  (async () => {
    await require("./build-notifications.cjs").buildNotifications();
    const profile = await mkdtemp(join(tmpdir(), "pofis-notification-demo-"));
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    const listener = require("node:net").createServer();
    await new Promise(resolve => listener.listen(0, "127.0.0.1", resolve));
    const port = listener.address().port;
    await new Promise(resolve => listener.close(resolve));
    const upstream = `http://127.0.0.1:${port}`;
    const server = spawn(process.execPath, ["--bun", resolve(__dirname, "../../.next/standalone/server.js")],
      { env: { ...env, PORT: String(port), HOSTNAME: "127.0.0.1" }, stdio: "ignore", windowsHide: true });
    let child;
    let timer;
    let completed = false;
    try {
      const deadline = Date.now() + 30_000;
      while (!await fetch(`${upstream}/api/health`, { signal: AbortSignal.timeout(1000) }).then(response => response.ok, () => false)) {
        if (Date.now() >= deadline || server.exitCode !== null) throw new Error("Önce bun run desktop:prepare ile standalone çıktısını hazırla.");
        await Bun.sleep(100);
      }
      child = spawn(require("electron"), [__filename, `--user-data-dir=${profile}`, `--fixture-origin=${upstream}`, ...process.argv.slice(2)], { env, stdio: ["ignore", "inherit", "inherit", "ipc"], windowsHide: true });
      child.on("message", message => { if (message?.type === "notification-acceptance-complete") completed = true; });
      timer = process.argv.includes("--verify") ? setTimeout(() => { console.error("Bildirim kabulü zaman aşımı"); child.kill(); }, 90_000) : null;
      process.exitCode = await new Promise((resolve, reject) => { child.on("exit", code => {
        const success = code === 0 && (!process.argv.includes("--verify") || completed);
        if (code === 0 && !success) console.error("Bildirim kabulü tamamlanmadan kapandı");
        resolve(success ? 0 : 1);
      }); child.on("error", reject); });
    }
    finally {
      if (timer) clearTimeout(timer);
      await require("../../electron/server.cjs").stopProcessTree(server);
      if (dirname(profile) !== tmpdir()) throw new Error("Profil temizleme sınırı geçersiz");
      await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
