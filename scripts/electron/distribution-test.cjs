// All successful startup checks below use the packaged Electron/Next standalone application.
const { spawn } = require("node:child_process");
const { mkdir, mkdtemp, readFile, writeFile, rm, readdir, access } = require("node:fs/promises");
const { join, resolve, dirname, basename } = require("node:path");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { connect } = require("./cdp.cjs");
const { ORIGIN, stopProcessTree } = require("../../electron/server.cjs");
const { readStoredPlans } = require("../../src/lib/plan-storage.js");

const root = resolve(__dirname, "../..");
if (process.platform !== "win32") {
  throw new Error("Bu betik Windows kurulumunu sınar. Ortak paket kabulü için bun run test:desktop:smoke kullan.");
}
const powershell = join(process.env.SystemRoot, "System32/WindowsPowerShell/v1.0/powershell.exe");
const env = { ...process.env, PATH: join(process.env.SystemRoot, "System32") };
env.POFIS_TEST_BLOCK_ANALYTICS = "1";
env.PSModulePath = join(process.env.SystemRoot, "System32/WindowsPowerShell/v1.0/Modules");
delete env.ELECTRON_RUN_AS_NODE;
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
async function until(check, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await check(); if (value) return value; await Bun.sleep(100); }
  throw Error("Dağıtım kabul kontrolü zaman aşımı.");
}
function ps(code, policy = "Bypass") {
  const child = spawn(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", policy, "-Command",
    "[Console]::OutputEncoding = [Text.UTF8Encoding]::new(); $ErrorActionPreference='Stop'; " + code],
    { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  const done = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", code => resolve({ code, output }));
  });
  return { child, done };
}

async function run() {
  const startupOnly = process.argv.includes("--startup-only");
  const groupIndex = process.argv.indexOf("--group");
  const group = groupIndex === -1 ? null : process.argv[groupIndex + 1];
  if (group && !["update", "recovery"].includes(group)) throw new Error("Kabul grubu update veya recovery olmalı.");
  const checks = join(root, "dist/electron/checks");
  await mkdir(checks, { recursive: true });
  const directory = await mkdtemp(join(checks, "distribution test-"));
  const install = join(directory, "installed");
  const profile = join(directory, "profile");
  const shortcut = join(directory, "Pofis.lnk");
  const registry = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Pofis-' + randomBytes(16).toString('hex');
  const siteIndex = process.argv.indexOf("--site");
  let siteCommand;
  let siteInstaller;
  if (siteIndex !== -1) {
    assert.ok(process.argv[siteIndex + 1], "--site landing klasörünü gerektirir.");
    const site = resolve(process.argv[siteIndex + 1]);
    const { content } = require(join(site, "src/content.ts"));
    siteCommand = content.install.platforms.find(item => item.id === "windows")?.command;
    assert.equal(siteCommand, "irm https://pofis.app/install.ps1 | iex");
    siteInstaller = await readFile(join(site, "public/install.ps1"), "utf8");
    assert.equal(siteInstaller, (await readFile(join(__dirname, "install.ps1"), "utf8")).replace(/^\uFEFF/, ""));
    // Exercise the public command without writing to the real user's profile or Start menu.
    // Only the four parameter defaults differ; the downloaded installer body is unchanged.
    for (const [original, replacement] of [
      ["[string]$ManifestUrl = 'https://pofis.app/releases/windows/latest.json'", "[string]$ManifestUrl = '__LOCAL_MANIFEST__'"],
      ["[string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'Programs\\Pofis')", `[string]$InstallRoot = ${quote(install)}`],
      ["[string]$ShortcutPath = (Join-Path ([Environment]::GetFolderPath('Programs')) 'Pofis.lnk')", `[string]$ShortcutPath = ${quote(shortcut)}`],
      ["[string]$UserDataDir = (Join-Path $env:APPDATA 'Pofis')", `[string]$UserDataDir = ${quote(profile)}`],
      ["[string]$RegistryPath = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Pofis'", `[string]$RegistryPath = ${quote(registry)}`],
    ]) {
      assert.ok(siteInstaller.includes(original), "İzole kurulum parametresi bulunamadı.");
      siteInstaller = siteInstaller.replace(original, replacement);
    }
  }
  const releases = join(root, "dist/releases/windows");
  const candidate = JSON.parse(await readFile(join(releases, "latest.json"), "utf8"));
  const fromIndex = process.argv.indexOf("--from-release");
  const previousManifest = fromIndex === -1 ? null : resolve(process.argv[fromIndex + 1]);
  const first = previousManifest ? JSON.parse(await readFile(previousManifest, "utf8")) : candidate;
  if (previousManifest) first.url = basename(new URL(first.url, "https://fixture.invalid").pathname);
  const [major, minor, patch] = candidate.version.split(".").map(Number);
  const updatedVersion = previousManifest ? candidate.version : `${major}.${minor}.${patch + 1}`;
  const [brokenVersion, repairedVersion] = [2, 3].map(offset => `${major}.${minor}.${patch + offset}`);
  let active = first;
  let delayManifest = false;
  let manifestRequests = 0;
  let zipRequests = 0;
  let cdp;
  let debugChild;
  let serverOrigin;
  let healthIdentity;
  const host = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
    const path = decodeURIComponent(new URL(request.url).pathname);
    if (path === "/install.ps1") return new Response(siteInstaller
      ? siteInstaller.replace("__LOCAL_MANIFEST__", base + "/latest.json")
      : Bun.file(join(__dirname, "install.ps1")), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    if (path === "/latest.json") {
      manifestRequests++;
      if (delayManifest) await Bun.sleep(2000);
      return Response.json(active);
    }
    if (path === "/broken.zip") return new Response("corrupt archive");
    if (path.endsWith(".zip")) zipRequests++;
    if (previousManifest && path === `/${first.url}`) return new Response(Bun.file(join(dirname(previousManifest), first.url)));
    const local = [updatedVersion, brokenVersion, repairedVersion].some(version => path === `/${version}.zip`)
      ? join(directory, path.slice(1)) : resolve(releases, `.${path}`);
    if (!local.startsWith(directory) && !local.startsWith(releases)) return new Response("", { status: 404 });
    return await Bun.file(local).exists() ? new Response(Bun.file(local)) : new Response("", { status: 404 });
  } });
  const base = `http://127.0.0.1:${host.port}`;
  const flags = `-ManifestUrl ${quote(base + "/latest.json")} -InstallRoot ${quote(install)} -ShortcutPath ${quote(shortcut)} -UserDataDir ${quote(profile)} -RegistryPath ${quote(registry)}`;
  const installer = (bootstrap, consent = false) => ps((consent ? "$global:PofisTestUpdatePrompts=0; function Read-Host { $global:PofisTestUpdatePrompts++; 'e' }; " : "") + (bootstrap
    ? siteCommand ? siteCommand.replace("https://pofis.app/install.ps1", base + "/install.ps1")
      : `& ([scriptblock]::Create((Invoke-RestMethod ${quote(base + "/install.ps1")}).TrimStart([char]0xFEFF))) ${flags}`
    : `& ${quote(join(__dirname, "install.ps1"))} ${flags}`) + (consent
      ? "; if ($global:PofisTestUpdatePrompts -ne 1) { throw 'Normal kapanış bir onayla tamamlanmalı.' }" : ""), bootstrap ? "Restricted" : "Bypass");
  const state = async () => JSON.parse(await readFile(join(install, "installed.json"), "utf8"));
  const executable = async () => join(install, "versions", (await state()).directory, "Pofis.exe");
  const healthy = async () => {
    if (!serverOrigin) return false;
    return fetch(`${serverOrigin}/api/health`, { signal: AbortSignal.timeout(500) })
      .then(r => r.ok && r.headers.get("X-Pofis-Desktop") === healthIdentity, () => false);
  };
  const identifyServer = async () => {
    const id = randomBytes(16).toString("hex");
    const resultPath = join(profile, "launch-results", `${id}.json`);
    const file = await executable();
    const probe = spawn(file, [`--startup-id=${id}`, `--user-data-dir=${profile}`],
      { env, windowsHide: true, stdio: "ignore" });
    try {
      const result = await until(async () => {
        try { return JSON.parse(await readFile(resultPath, "utf8")); }
        catch (error) { if (error.code !== "ENOENT") throw error; }
      });
      assert.equal(result.requestId, id);
      assert.equal(result.schemaVersion, 1);
      assert.equal(result.status, "ready", result.message);
      assert.equal(result.windowReady, true);
      assert.notEqual(result.pid, probe.pid, "Açılış kontrolü önceden çalışan uygulamayı doğrulamalı.");
      assert.equal(result.version, (await state()).version);
      assert.equal(result.executable.toLowerCase(), file.toLowerCase());
      const url = new URL(result.origin);
      assert.equal(url.protocol, "http:");
      assert.equal(url.hostname, "127.0.0.1");
      serverOrigin = url.origin;
      const response = await fetch(`${serverOrigin}/api/health`);
      assert.equal(response.ok, true);
      healthIdentity = response.headers.get("X-Pofis-Desktop");
      assert.ok(healthIdentity);
      await until(() => probe.exitCode !== null || probe.signalCode !== null);
    } finally {
      await stopProcessTree(probe);
      await rm(resultPath, { force: true });
    }
  };
  const close = async () => {
    const owned = `try { $_.Path -like ${quote(install + "\\versions\\*")} } catch { $false }`;
    // Health can become ready before Electron creates the window.
    const result = await ps(`$deadline=[DateTime]::UtcNow.AddSeconds(20);
      do {
        $windows=@(Get-Process | Where-Object { ${owned} } | Where-Object { $_.MainWindowHandle -ne 0 });
        if ($windows.Count) { break }
        Start-Sleep -Milliseconds 100
      } while ([DateTime]::UtcNow -lt $deadline);
      if (-not $windows.Count) { throw 'Kapatılacak Pofis penceresi bulunamadı.' }
      $windows | ForEach-Object { $null = $_.CloseMainWindow() };
      $deadline=[DateTime]::UtcNow.AddSeconds(20);
      do {
        if (@(Get-Process | Where-Object { ${owned} }).Count -eq 0) { return }
        Start-Sleep -Milliseconds 100
      } while ([DateTime]::UtcNow -lt $deadline);
      $remaining=Get-Process | Where-Object { ${owned} } | Select-Object Id,ProcessName,MainWindowHandle,Path | ConvertTo-Json -Compress;
      throw ('Pofis süreçleri kapanmadı: '+$remaining)`).done;
    assert.equal(result.code, 0, result.output);
    assert.equal(await healthy(), false);
  };
  const expectInstall = async (success, bootstrap = false, consent = false) => {
    const result = await installer(bootstrap, consent).done;
    assert.equal(result.code === 0, success, result.output);
    if (success) await identifyServer();
    return result;
  };
  const evaluate = async expression => {
    const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const debugOpen = async (throughShortcut = false) => {
    let origin;
    if (throughShortcut) {
      const reservation = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("") });
      const port = reservation.port;
      reservation.stop(true);
      const result = await ps(`Start-Process -FilePath ${quote(shortcut)} -ArgumentList ${quote(`--remote-debugging-port=${port}`)} -WindowStyle Normal`).done;
      assert.equal(result.code, 0, result.output);
      origin = `http://127.0.0.1:${port}`;
    } else {
      let stderr = "";
      debugChild = spawn(await executable(), [`--user-data-dir=${profile}`, "--remote-debugging-port=0"],
        { env, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
      debugChild.stderr.on("data", chunk => { stderr += chunk; });
      const address = await until(() => stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1]);
      origin = address.replace(/^ws:/, "http:").split("/devtools/")[0];
    }
    const target = await until(async () => {
      try { return (await (await fetch(`${origin}/json/list`)).json()).find(t => t.url.startsWith(ORIGIN)); }
      catch (error) { if (error.code !== "ECONNREFUSED") throw error; }
    });
    cdp = await connect(target.webSocketDebuggerUrl);
    await until(() => evaluate(`location.origin === ${JSON.stringify(ORIGIN)} && document.readyState === 'complete' && !!document.body`));
    await identifyServer();
  };
  let lastPass = Date.now();
  const passed = name => {
    const now = Date.now();
    console.log(`PASS [${group || "yaşam döngüsü"}]: ${name} (${((now - lastPass) / 1000).toFixed(2)} s)`);
    lastPass = now;
  };
  try {
    if (!startupOnly) {
      console.log("Dağıtım testleri için ZIP paketleri hazırlanıyor…");
      const variants = await ps(`& ${quote(join(__dirname, "fixtures/release-variants.ps1"))} -SourceArchive ${quote(join(releases, candidate.url))} -OutputDirectory ${quote(directory)} -BaseVersion ${quote(candidate.version)} -Group ${quote(group || "all")}`).done;
      assert.equal(variants.code, 0, variants.output);
      passed("kabul grubunun ZIP'leri hazır");
    }
    if (group !== "recovery") {
      const policy = await ps("Get-ExecutionPolicy", "Restricted").done;
      assert.equal(policy.code, 0, policy.output);
      assert.equal(policy.output.trim(), "Restricted");
      await expectInstall(true, true);
      assert.equal((await state()).version, first.version);
      assert.equal(await healthy(), true);
      passed("Restricted politikası altında ilk kurulum, HTTP bootstrap ve otomatik pencere açılışı");
      const registration = await ps(`(Get-ItemProperty -LiteralPath ${quote(registry)}).DisplayName`).done;
      assert.equal(registration.code, 0, registration.output);
      assert.equal(registration.output.trim(), 'Pofis');
      const initial = await state();
      const count = zipRequests;
      const healthToken = healthIdentity;
      await expectInstall(true, true);
      assert.equal(zipRequests, count);
      assert.equal((await state()).directory, initial.directory);
      assert.equal(healthIdentity, healthToken);
      passed("Restricted politikası altında aynı sürüm tekrar indirilmiyor; çalışan tek örnek korunuyor");
      if (!startupOnly) {
        await close();
        await debugOpen(true);
        passed("normal uygulama simgesinden açılış");
        const plan = JSON.stringify({ defaultPlan: [480, 480, 480, 480, 420, 0, 0], weekOverrides: {} });
        readStoredPlans(plan);
        await evaluate(`localStorage.setItem('pofis:theme:v1','dark'); localStorage.setItem('pofis:work-plans:v1',${JSON.stringify(plan)}); true`);
        await mkdir(join(profile, "sessions"), { recursive: true });
        await writeFile(join(profile, "sessions/preservation-fixture.txt"), "fixture-session-preserved");
        active = previousManifest ? candidate
          : JSON.parse((await readFile(join(directory, `${updatedVersion}.json`), "utf8")).replace(/^\uFEFF/, ""));
        // Non-interactive execution must refuse to close the running release without consent.
        const blocked = await expectInstall(false);
        assert.match(blocked.output, /Pofis açık/);
        assert.equal((await state()).version, first.version);
        assert.equal(await healthy(), true);
        passed("açık uygulamada güncelleme mevcut sürümü bozmuyor");
        // Supply only the answer; exercise real window closure, server shutdown and relaunch.
        await expectInstall(true, false, true);
        cdp.close(); cdp = null;
        assert.equal((await state()).version, updatedVersion);
        assert.notEqual((await state()).directory, initial.directory);
        assert.deepEqual(await readdir(join(install, 'versions')), [(await state()).directory]);
        await close();
        await debugOpen();
        assert.equal(await evaluate("localStorage.getItem('pofis:theme:v1')"), "dark");
        const restoredPlan = await evaluate("localStorage.getItem('pofis:work-plans:v1')");
        assert.equal(restoredPlan, plan);
        const { defaultPlan } = readStoredPlans(restoredPlan);
        assert.equal(defaultPlan[0], 8 * 60);
        assert.equal(defaultPlan[4], 7 * 60);
        assert.equal(defaultPlan.reduce((total, minutes) => total + minutes, 0), 39 * 60);
        assert.equal(await readFile(join(profile, "sessions/preservation-fixture.txt"), "utf8"), "fixture-session-preserved");
        passed("yeni sürüm, tema/plan ve oturum dosyalarının korunması");
        // Kill only our main PID. The owned Node utility process must exit when its main PID disappears.
        debugChild.kill();
        cdp.close(); cdp = null;
        await until(async () => !(await healthy()));
        await expectInstall(true);
        passed("beklenmedik ana süreç kapanışı sonrası yeniden açılış");
        await close();
      } else {
        await close();
      }
    }
    if (group !== "update" && !startupOnly) {
      if (group === "recovery") {
        await expectInstall(true);
        await close();
        passed("başlangıç hatasından önce çalışan sürüm kuruldu");
      }
      active = JSON.parse((await readFile(join(directory, `${brokenVersion}.json`), "utf8")).replace(/^\uFEFF/, ""));
      const failed = await expectInstall(false);
      assert.match(failed.output, /42/);
      assert.equal((await state()).version, brokenVersion);
      assert.equal(await healthy(), false);
      assert.deepEqual(await readdir(join(install, 'versions')), [(await state()).directory]);
      passed("gerçek başlangıç hatası raporlanır; eski sürümler açılışı beklemeden kaldırılır");
      const previousState = await state();
      active = { ...active, version: repairedVersion, url: "missing.zip" };
      await expectInstall(false);
      assert.deepEqual(await state(), previousState);
      active = { ...active, url: "broken.zip" };
      await expectInstall(false);
      assert.deepEqual(await state(), previousState);
      passed("başarısız indirme ve bozuk pakette kurulumun korunması");
      active = JSON.parse((await readFile(join(directory, `${repairedVersion}.json`), "utf8")).replace(/^\uFEFF/, ""));
    }
    if (group === "update") return;
    // Grouped acceptance shares the parent's outside app on 3210; profiles use their own origins.
    const occupied = group ? null : Bun.serve({ hostname: "127.0.0.1", port: 3210, fetch: () => new Response("another app") });
    try {
      await expectInstall(true);
      assert.equal(await (await fetch(ORIGIN)).text(), "another app");
      await expectInstall(true);
      await close();
      assert.equal(await (await fetch(ORIGIN)).text(), "another app");
    } finally { occupied?.stop(true); }
    passed("3210 başka uygulamadayken kurulum/açılış ve ikinci açılış başarılı; diğer süreç korunuyor");
    delayManifest = true;
    const previousRequests = manifestRequests;
    const one = installer(false);
    await until(() => manifestRequests > previousRequests);
    const two = await installer(false).done;
    assert.notEqual(two.code, 0);
    assert.match(two.output, /başka bir Pofis kurulumu/);
    const firstResult = await one.done;
    assert.equal(firstResult.code, 0, firstResult.output);
    passed("eşzamanlı iki kurulumda tek sahip kilidi");
    await writeFile(join(profile, 'uninstall-preserve.txt'), 'preserve');
    // The lock winner already opened this installation; use it for open-app removal refusal.
    const blockedRemoval = await ps(`& ${quote(join(install, 'uninstall.ps1'))} -Confirmed`).done;
    assert.notEqual(blockedRemoval.code, 0);
    assert.match(blockedRemoval.output, /Pofis açık/);
    await close();
    const removal = await ps(`& ${quote(join(install, 'uninstall.ps1'))} -Confirmed`).done;
    assert.equal(removal.code, 0, removal.output);
    await assert.rejects(access(install));
    await assert.rejects(access(shortcut));
    assert.equal((await ps(`Test-Path -LiteralPath ${quote(registry)}`).done).output.trim(), 'False');
    assert.equal(await readFile(join(profile, 'uninstall-preserve.txt'), 'utf8'), 'preserve');
    passed("kaldırma kaydı, açıkken kaldırmanın reddi, uygulama/kısayol/kayıt temizliği ve profil koruması");
    console.log("Dağıtım kabulü tamamlandı. Gerçek PDKS hesabı ve temiz cihaz/SmartScreen kabulü ayrıca yapılmalı.");
  } catch (error) {
    console.error("Kabul hatası:", error);
    throw error;
  } finally {
    cdp?.close();
    // Uninstall may already have removed the entire installation.
    await stopProcessTree(debugChild);
    await ps(`Get-Process | Where-Object { $_.Path -like ${quote(install + "\\versions\\*")} } | Stop-Process -Force`).done;
    await ps(`if (Test-Path -LiteralPath ${quote(registry)}) { Remove-Item -LiteralPath ${quote(registry)} -Recurse -Force }`).done;
    host.stop(true);
    // Only this test's generated install/profile/archives are removed.
    await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}
async function runAll() {
  const { run: execute } = require("./ci-build.cjs");
  const args = process.argv.slice(2);
  let occupied;
  try {
    occupied = Bun.serve({ hostname: "127.0.0.1", port: 3210, fetch: () => new Response("another app") });
    const results = await Promise.allSettled([
      execute(process.execPath, [__filename, ...args, "--group", "update"]),
      execute(process.execPath, [__filename, ...args, "--group", "recovery"]),
    ]);
    assert.equal(await (await fetch(ORIGIN)).text(), "another app");
    const failures = results.filter(result => result.status === "rejected").map(result => result.reason);
    if (failures.length) throw new AggregateError(failures, "Windows güncelleme ve onarım kabulünü kontrol et.");
  } finally {
    occupied?.stop(true);
  }
}

(process.argv.includes("--group") || process.argv.includes("--startup-only") ? run() : runAll())
  .catch(error => { console.error(error); process.exitCode = 1; });
