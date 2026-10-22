// Native macOS acceptance: every successful launch uses a real packaged Electron/Next app.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { promisify } = require("node:util");
const { execFile } = require("node:child_process");
const { mkdtemp, mkdir, readFile, writeFile, cp, rm, realpath, readdir, access, lstat } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { createHash } = require("node:crypto");
const { createReadStream } = require("node:fs");
const { platformTarget } = require("../../electron/platform.cjs");
const { signMacBundle } = require("./macos.cjs");
const { releaseManifest } = require("./release.cjs");
const { UNIX_INSTALL_COMMAND, readSiteContent } = require("./install-command.cjs");
const { unixInstaller } = require("./unix-installer.cjs");
const { until, fetchLocal: fetch } = require("./acceptance-wait.cjs");
const executeFile = promisify(execFile);
const execute = (command, args, options = {}) => executeFile(command, args, { timeout: 60000, ...options });
const root = resolve(__dirname, "../..");

async function run() {
  assert.equal(process.platform, "darwin", "Bu kabul gerçek macOS runner'ı gerektirir.");
  const target = platformTarget();
  const directory = await realpath(await mkdtemp(join(tmpdir(), "pofis distribution-")));
  const installRoot = join(directory, "installer");
  const appPath = join(directory, "Applications/Pofis.app");
  const profile = join(directory, "profile");
  let host, occupied, active, bundle, fixturePreparation;
  const installer = await unixInstaller();
  const siteIndex = process.argv.indexOf("--site");
  const command = UNIX_INSTALL_COMMAND;
  if (siteIndex !== -1) {
    const site = resolve(process.argv[siteIndex + 1]);
    const content = readSiteContent(await readFile(join(site, "src/content.ts"), "utf8"));
    assert.equal(content.install.platforms.find(item => item.id === "unix").command, command);
    assert.equal(await readFile(join(site, "public/install.sh"), "utf8"), installer);
  }
  let zipRequests = 0, manifestRequests = 0, slow = false;
  const archives = new Map();
  const env = { ...process.env, PATH: "/usr/bin:/bin:/usr/sbin:/sbin" };
  env.POFIS_TEST_BLOCK_ANALYTICS = "1";
  delete env.ELECTRON_RUN_AS_NODE;
  const install = (consent = false) => {
    // Only the terminal answer is stubbed for native CI. Quit and process checks remain real.
    const script = (consent ? 'source "$INSTALLER_SOURCE"; prompts=0; confirm_close() { prompts=$((prompts + 1)); return 0; }; main' :
      command.replace("https://pofis.app/install.sh", `${base}/install.sh`) + ' -s --') +
      ' --manifest-url "$MANIFEST_URL" --install-root "$INSTALL_ROOT" --app-path "$APP_PATH" --user-data-dir "$USER_DATA"' +
      (consent ? '; [[ "$prompts" == 1 ]]' : '');
    const child = spawn("/bin/bash", ["-o", "pipefail", "-c", script], { env: { ...env,
      MANIFEST_URL: `${base}/latest.json`, INSTALL_ROOT: installRoot, APP_PATH: appPath, USER_DATA: profile,
      INSTALLER_SOURCE: join(__dirname, "install-macos.sh") },
      stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", data => output += data);
    child.stderr.on("data", data => output += data);
    return new Promise((done, fail) => { child.on("error", fail); child.on("close", code => done({ code, output })); });
  };
  const expectInstall = async () => { await assertInstalled(await install()); };
  const expectFailure = async pattern => {
    const result = await install(); assert.notEqual(result.code, 0, result.output); assert.match(result.output, pattern);
  };
  const pids = async () => {
    const { stdout } = await execute("/bin/ps", ["-ww", "-axo", "pid=,comm="]);
    return stdout.split("\n").map(line => line.trim().match(/^(\d+)\s+(.*)$/)).filter(Boolean)
      .filter(([, , path]) => path === appPath + "/Contents/MacOS/Pofis")
      .map(([, pid]) => Number(pid));
  };
  const assertInstalled = async result => {
    if (result.code !== 0) {
      // Only this disposable fixture's exact executable is sampled. A blocked
      // main thread cannot write a startup receipt or explain itself over IPC.
      try {
        for (const pid of await pids()) {
          const samplePath = join(directory, `startup-${pid}.txt`);
          await execute("/usr/bin/sample", [String(pid), "1", "-file", samplePath], { timeout: 8000 });
          const sample = await readFile(samplePath, "utf8");
          const start = sample.indexOf("Call graph:");
          console.error(`Pofis startup PID ${pid}:\n${sample.slice(start < 0 ? 0 : start).split("\n").slice(0, 65).join("\n")}`);
        }
      } catch (error) { console.error(`Açılış süreç örneği alınamadı: ${error.message}`); }
    }
    assert.equal(result.code, 0, result.output);
  };
  const close = async () => {
    // TERM only this test's main process; Electron's shutdown owns its UtilityProcess.
    for (const pid of await pids()) { try { process.kill(pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; } }
    await until(async () => (await pids()).length === 0);
  };
  const marker = join(profile, "preserve-test.txt");
  const fixture = async (version, broken = false) => {
    const folder = join(directory, `fixture-${version}`);
    await mkdir(folder);
    const app = join(folder, "Pofis.app");
    await execute("/bin/cp", ["-c", "-R", bundle, app]).catch(() =>
      cp(bundle, app, { recursive: true, verbatimSymlinks: true }));
    const resources = join(app, "Contents/Resources");
    const pkgPath = join(resources, "app/package.json");
    const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
    await writeFile(pkgPath, JSON.stringify({ ...pkg, version }));
    await writeFile(join(resources, "release.json"), JSON.stringify({ schemaVersion: 1, version, platform: "darwin", arch: target.arch }));
    for (const key of ["CFBundleShortVersionString", "CFBundleVersion"]) {
      await execute("/usr/libexec/PlistBuddy", ["-c", `Set :${key} ${version}`, join(app, "Contents/Info.plist")]);
    }
    if (broken) await writeFile(join(resources, "app/electron/server-entry.cjs"), "process.exit(23);\n");
    await execute("/usr/bin/codesign", ["--force", "--sign", "-", "--preserve-metadata=entitlements,flags", app]);
    await execute("/usr/bin/codesign", ["--verify", "--deep", "--strict", app]);
    const archive = join(directory, `${version}.zip`);
    // Fixture archives stay on loopback: store bytes directly and preserve symlinks.
    await execute("/usr/bin/zip", ["-q", "-r", "-0", "-y", archive, "Pofis.app"], { cwd: folder })
      .catch(() => execute("/usr/bin/ditto", ["-c", "-k", "--zlibCompressionLevel", "0", "--sequesterRsrc", "--keepParent", app, archive]));
    const bytes = Bun.file(archive);
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(archive)) hash.update(chunk);
    const manifest = releaseManifest(target, version, bytes.size, hash.digest("hex"));
    archives.set("/" + manifest.url, archive);
    return manifest;
  };
  let base;
  try {
    const releases = join(root, "dist/releases", target.releaseDirectory);
    const first = JSON.parse(await readFile(join(releases, "latest.json"), "utf8"));
    archives.set("/" + first.url, join(releases, first.url));
    active = first;
    host = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/install.sh") return new Response(installer, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      if (path === "/latest.json") { manifestRequests++; if (slow) await Bun.sleep(1500); return Response.json(active); }
      if (path === "/corrupt.zip") return new Response("corrupt archive");
      if (archives.has(path)) { zipRequests++; return new Response(Bun.file(archives.get(path))); }
      return new Response("not found", { status: 404 });
    } });
    base = `http://127.0.0.1:${host.port}`;
    await expectInstall();
    bundle = appPath;
    assert.equal((await lstat(appPath)).isSymbolicLink(), false);
    assert.deepEqual(await readdir(join(installRoot, 'versions')), []);
    const initialPid = (await pids())[0];
    assert.ok(initialPid);
    await writeFile(marker, "settings/session-file boundary preserved");
    console.log("PASS: gerçek ZIP, HTTP kurulum komutu, otomatik pencere ve Node/Bun içermeyen PATH");
    const [a, b, c] = first.version.split(".").map(Number);
    // These copies read the installed bundle; launches write only to the separate profile.
    fixturePreparation = Promise.allSettled([
      fixture(`${a}.${b}.${c + 1}`),
      fixture(`${a}.${b}.${c + 2}`, true),
      fixture(`${a}.${b}.${c + 3}`),
    ]);
    const requests = zipRequests;
    await expectInstall();
    assert.equal(zipRequests, requests);
    assert.deepEqual(await pids(), [initialPid]);
    console.log("PASS: aynı sürüm indirilmez; açık uygulama ikinci sunucu oluşturmadan öne gelir");
    await close();
    // The normal application icon points to a genuine .app; use LaunchServices to open it.
    await execute("/usr/bin/open", [appPath, "--args", `--user-data-dir=${profile}`], { env });
    await until(async () => (await pids()).length === 1);
    await expectInstall(); // the existing instance must also report a healthy server/window
    await close();
    occupied = Bun.serve({ hostname: "127.0.0.1", port: 3210, fetch: () => new Response("another app") });
    await expectInstall();
    assert.equal(await (await fetch("http://127.0.0.1:3210")).text(), "another app");
    console.log("PASS: uygulama simgesi, yeniden açılış ve dolu 3210'da alternatif port; diğer süreç korunur");
    active = { ...first, url: `${base}/missing.zip`, version: "999.0.0" };
    await expectFailure(/İndirme tamamlanamadı/);
    active = { ...first, url: `${base}/corrupt.zip`, version: "999.0.0" };
    await expectFailure(/SHA-256/);
    assert.equal(JSON.parse(await readFile(join(installRoot, 'installed.json'), 'utf8')).version, first.version);
    const variants = await fixturePreparation;
    const failure = variants.find(result => result.status === "rejected");
    if (failure) throw failure.reason;
    const [next, broken, repaired] = variants.map(result => result.value);
    // The port-fallback instance remains open for the denied/consented update chain.
    active = next;
    await expectFailure(/Pofis açık/);
    assert.equal(JSON.parse(await readFile(join(installRoot, 'installed.json'), 'utf8')).version, first.version);
    const updated = await install(true);
    await assertInstalled(updated);
    assert.equal(JSON.parse(await readFile(join(installRoot, 'installed.json'), 'utf8')).version, next.version);
    assert.deepEqual(await readdir(join(installRoot, 'versions')), []);
    assert.equal(await readFile(marker, "utf8"), "settings/session-file boundary preserved");
    await close();
    assert.equal(await (await fetch("http://127.0.0.1:3210")).text(), "another app");
    occupied.stop(true); occupied = null;
    console.log("PASS: bozuk/eksik indirme, onaysız güncelleme reddi, onaylı normal kapanış ve sürüm yükseltme, profil korunması");
    active = broken;
    await expectFailure(/Pofis sunucusu kapandı \(kod: 23\)/);
    assert.equal(JSON.parse(await readFile(join(installRoot, 'installed.json'), 'utf8')).version, broken.version);
    await until(async () => (await pids()).length === 0);
    assert.deepEqual(await readdir(join(installRoot, 'versions')), []);
    assert.equal(await readFile(marker, "utf8"), "settings/session-file boundary preserved");
    await close();
    console.log("PASS: gerçek başlangıç hatası raporlanır; eski sürümler açılışı beklemeden kaldırılır");
    active = repaired; slow = true;
    const before = manifestRequests;
    const one = install();
    await until(() => manifestRequests > before);
    await expectFailure(/Başka bir Pofis kurulumu/);
    const result = await one;
    await assertInstalled(result);
    slow = false;
    // The lock winner is the repaired app; exercise its crash and recovery directly.
    const [onePid] = await pids();
    assert.ok(onePid);
    process.kill(onePid, "SIGKILL");
    await until(async () => (await pids()).length === 0);
    await Bun.sleep(100);
    await expectInstall();
    await close();
    console.log(`PASS: ${target.id}; kurulum kilidi, beklenmedik kapanış, yeniden başlatma ve normal kapanış`);
    // Remove only the test bundle. Finder/Trash interaction remains real-device acceptance.
    await rm(appPath, { recursive: true });
    await assert.rejects(access(appPath));
    assert.deepEqual(await readdir(join(installRoot, 'versions')), []);
    assert.equal(await readFile(marker, 'utf8'), 'settings/session-file boundary preserved');
    console.log('PASS: gerçek macOS paketini kaldırma, gizli sürüm paketi bırakmama ve profil koruması');
    await expectInstall();
    await close();
    assert.equal(await readFile(marker, 'utf8'), 'settings/session-file boundary preserved');
    console.log('PASS: paket kaldırıldıktan sonra aynı komutla yeniden kurulum');
    console.log("Gerçek PDKS hesabı ve indirilen uygulamanın Gatekeeper kabulü ayrıca bekler.");
  } finally {
    await close().catch(() => {});
    occupied?.stop(true); host?.stop(true);
    await fixturePreparation;
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}

if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
