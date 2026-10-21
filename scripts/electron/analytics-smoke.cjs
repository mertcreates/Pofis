// Run after `bun run build` and `bun run start --port 3210`.
const { join, resolve, dirname } = require("node:path");
const origin = "http://127.0.0.1:3210";

if (process.versions.electron) {
  const assert = require("node:assert/strict");
  const { setTimeout: delay } = require("node:timers/promises");
  const { app, BrowserWindow, session } = require("electron");
  app.setPath("userData", app.commandLine.getSwitchValue("user-data-dir"));
  app.whenReady().then(async () => {
    const isolated = session.fromPartition("analytics-smoke");
    const requests = [];
    let tagRequests = 0;
    let offline = false;
    const identities = { alpha: `pofis_ga_v1_${"a".repeat(64)}`, beta: `pofis_ga_v1_${"b".repeat(64)}` };
    let account = null;
    let expireReport = false;
    let failLogout = false;
    // All authentication/report traffic stays in this disposable browser fixture.
    isolated.protocol.handle("http", async request => {
      const url = new URL(request.url);
      if (url.origin !== origin) return new Response("Blocked", { status: 403 });
      if (url.pathname === "/api/session") {
        if (request.method === "POST") account = (await request.json()).username;
        if (request.method === "DELETE") {
          if (failLogout) return Response.json({ error: "Fixture failure", code: "INTERNAL_ERROR" }, { status: 500 });
          account = null;
        }
        return Response.json({ connected: !!account });
      }
      if (url.pathname === "/api/session/heartbeat") return Response.json({ connected: !!account });
      if (url.pathname === "/api/report") {
        if (expireReport) {
          account = null;
          return Response.json({ error: "Fixture expiry", code: "SESSION_EXPIRED" }, { status: 401 });
        }
        return Response.json({
          from: url.searchParams.get("from"), to: url.searchParams.get("to"),
          fetchedAt: new Date().toISOString(), passages: [], pofiNotes: [],
          person: { id: "self", name: "Private Fixture Name", unit: "", title: "" },
          analyticsUserId: identities[account],
        });
      }
      if (url.pathname.startsWith("/api/")) return new Response("Blocked fixture API", { status: 403 });
      return isolated.fetch(request.url, { bypassCustomProtocolHandlers: true });
    });
    // Cancel every collection request before it leaves the machine.
    isolated.webRequest.onBeforeRequest((details, callback) => {
      const url = new URL(details.url);
      if (url.origin === origin) return callback({});
      if (url.hostname.endsWith(".google-analytics.com") && url.pathname.endsWith("/collect")) {
        const body = details.uploadData?.map(item => item.bytes?.toString() || "").join("") || "";
        for (const line of body.split("\n")) {
          requests.push(new URLSearchParams(`${url.search.slice(1)}&${line}`));
        }
      }
      if (!offline && url.hostname === "www.googletagmanager.com" && url.pathname === "/gtag/js") {
        tagRequests++;
        return callback({});
      }
      callback({ cancel: true });
    });
    const window = new BrowserWindow({ show: false, webPreferences: {
      session: isolated, nodeIntegration: false, contextIsolation: true, sandbox: true,
    } });
    const evaluate = code => window.webContents.executeJavaScript(code);
    const until = async check => {
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        if (await check()) return;
        await delay(100);
      }
      throw new Error("Analytics kabulü zaman aşımına uğradı.");
    };
    const pageviews = () => requests.filter(request => request.get("en") === "page_view");
    const login = async username => {
      await until(() => evaluate("!!document.querySelector('input[type=password]:not(:disabled)')"));
      await evaluate(`(() => {
        document.querySelector('input[name=username]').value = ${JSON.stringify(username)};
        document.querySelector('input[name=password]').value = 'private-fixture-password';
        document.querySelector('input[name=password]').form.requestSubmit();
      })()`);
      await until(() => evaluate(`window.pofisAnalyticsUserId === ${JSON.stringify(identities[username])}`));
    };
    const logout = () => evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Bağlantıyı kes').click()");
    const probe = async (label, userId) => {
      await evaluate(`gtag('event', 'analytics_probe', { probe: ${JSON.stringify(label)} })`);
      await until(() => requests.some(request => request.get("ep.probe") === label));
      const request = requests.find(request => request.get("ep.probe") === label);
      assert.equal(request.get("uid") || null, userId);
    };
    try {
      await window.loadURL(`${origin}/?email=private%40example.com#secret`);
      await until(() => pageviews().length >= 1);
      assert.equal(pageviews().length, 1);
      assert.equal(tagRequests, 1);
      assert.equal(pageviews()[0].get("tid"), "G-MV4MG71CDB");
      assert.equal(pageviews()[0].get("dl"), "https://pofis.app/app");
      assert.equal(pageviews()[0].get("dt"), "Pofis");
      assert.equal(pageviews()[0].get("ep.app_release"), require("../../package.json").version);
      assert.ok(!pageviews()[0].get("dr"));
      assert.ok(!pageviews()[0].get("uid"));
      await login("alpha");
      await probe("alpha", identities.alpha);
      failLogout = true;
      await logout();
      await until(() => evaluate(`window.pofisAnalyticsUserId === ${JSON.stringify(identities.alpha)} && !document.querySelector('button.text-button:disabled')`));
      await probe("failed_logout", identities.alpha);
      failLogout = false;
      await logout();
      await until(() => evaluate("window.pofisAnalyticsUserId === null"));
      await probe("signed_out", null);
      await login("beta");
      await probe("beta", identities.beta);
      expireReport = true;
      await evaluate("document.querySelector('button[aria-label=\"Raporu yenile\"]').click()");
      await until(() => evaluate("window.pofisAnalyticsUserId === null && !!document.querySelector('input[type=password]')"));
      await probe("expired", null);
      expireReport = false;
      await login("alpha");
      await probe("alpha_again", identities.alpha);
      await evaluate("history.pushState({}, '', '/demo?email=private%40example.com#secret')");
      await until(() => pageviews().length >= 2);
      await delay(1500);
      assert.equal(pageviews().length, 2, "Her yol geçişi tek sayfa olayı üretmeli");
      assert.equal(tagRequests, 1, "SPA geçişinde betik yeniden yüklenmemeli");
      assert.equal(pageviews()[1].get("dl"), "https://pofis.app/demo");
      assert.equal(pageviews()[1].get("dt"), "Pofis Demo");
      assert.ok(!pageviews()[1].get("uid"), "Demo canlı hesabın kimliğini taşımamalı");
      for (const request of requests) {
        const values = [...request.values()].join(" ");
        for (const secret of ["private@example.com", "secret", "127.0.0.1", "Private Fixture Name", "private-fixture-password"]) {
          assert.ok(!values.includes(secret));
        }
      }
      account = null;
      offline = true;
      await window.loadURL(`${origin}/`);
      await until(() => evaluate("!!document.querySelector('input[type=password]')"));
      assert.equal(await evaluate("document.querySelectorAll('script#google-analytics').length"), 1);
      console.log("PASS: gerçek Google etiketi; tekil sayfa olayları; alpha → çıkış hatası → çıkış → beta → TTL → alpha → demo kimlik ayrımı; hassas alan kontrolü; Google engelliyken giriş ekranı. Ölçüm istekleri yerelde iptal edildi.");
    } finally {
      window.destroy();
    }
    app.quit();
  }).catch(error => { console.error(error); app.exit(1); });
} else {
  const { spawn } = require("node:child_process");
  const { mkdtemp, rm } = require("node:fs/promises");
  const { tmpdir } = require("node:os");
  (async () => {
    const temporaryRoot = resolve(tmpdir());
    const profile = await mkdtemp(join(temporaryRoot, "pofis-analytics-smoke-"));
    try {
      const env = { ...process.env };
      delete env.ELECTRON_RUN_AS_NODE;
      const code = await new Promise((done, fail) => {
        const child = spawn(require("electron"), [__filename, `--user-data-dir=${profile}`], {
          cwd: resolve(__dirname, "../.."), env, stdio: "inherit", windowsHide: true,
        });
        const timer = setTimeout(() => child.kill(), 45000);
        child.on("error", fail);
        child.on("exit", code => { clearTimeout(timer); done(code ?? 1); });
      });
      if (code !== 0) throw new Error(`Analytics kabulü başarısız: ${code}`);
    } finally {
      if (dirname(profile) !== temporaryRoot || !profile.startsWith(join(temporaryRoot, "pofis-analytics-smoke-"))) {
        throw new Error("Geçici profil temizleme sınırı geçersiz.");
      }
      await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
