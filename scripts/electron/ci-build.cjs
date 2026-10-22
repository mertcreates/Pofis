const { execFile } = require("node:child_process");
const { existsSync } = require("node:fs");
const { promisify } = require("node:util");
const { readFile, readdir, appendFile, rm } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { platformTarget } = require("../../electron/platform.cjs");
const execute = promisify(execFile);
const root = resolve(__dirname, "../..");

function assertVersion(version, actual) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) || version !== actual) {
    throw new Error("Seçilen sürüm package.json sürümüyle eşleşen x.y.z biçiminde olmalı.");
  }
}

async function run(command, args, cwd = root, env = process.env, { timeoutMs = 600000 } = {}) {
  let timer, stopping, expired = false;
  try {
    const pending = execute(command, args, { cwd, env, windowsHide: true,
      detached: process.platform !== "win32", maxBuffer: 16 * 1024 * 1024 });
    pending.child.stdout.on("data", chunk => process.stdout.write(chunk));
    pending.child.stderr.on("data", chunk => process.stderr.write(chunk));
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        expired = true;
        stopping = require("../../electron/server.cjs").stopProcessTree(pending.child, { processGroup: process.platform !== "win32" });
        stopping.then(() => reject(new Error("timeout")), reject);
      }, timeoutMs);
    });
    const result = await Promise.race([pending, deadline]);
    return result.stdout.trim();
  } catch (error) {
    if (stopping) await stopping;
    throw new Error(`${command.split(/[\\/]/).at(-1)} ${expired ? `${timeoutMs / 1000} saniyede tamamlanmadı` : `başarısız (${error.code})`}.`);
  } finally {
    clearTimeout(timer);
  }
}

async function checkVersion(version) {
  assertVersion(version, JSON.parse(await readFile(join(root, "package.json"), "utf8")).version);
}

async function timed(label, task, summary = process.env.GITHUB_STEP_SUMMARY) {
  const start = Date.now();
  console.log(`${label} başlıyor…`);
  let status = "başarısız";
  try {
    const result = await task();
    status = "başarılı";
    return result;
  } finally {
    const seconds = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`${label}: ${status}, ${seconds} s`);
    if (summary) {
      try { await appendFile(summary, `| ${label} | ${status} | ${seconds} |\n`); }
      catch (error) { console.error(`Süre özeti yazılamadı: ${error.message}`); }
    }
  }
}

async function preflight(target, acceptance, execute = run, summary = process.env.GITHUB_STEP_SUMMARY) {
  if (typeof target === "boolean") {
    summary = execute;
    execute = acceptance || run;
    acceptance = target;
    target = platformTarget();
  }
  const electronDist = join(root, "node_modules", "electron", "dist");
  if (target.id === "darwin-x64") {
    const binary = join(electronDist, target.electronExecutable);
    if (existsSync(binary)) {
      const isX64 = await execute("/usr/bin/lipo", [binary, "-verify_arch", "x86_64"]).then(() => true, () => false);
      if (!isX64) await rm(electronDist, { recursive: true, force: true });
    }
  }
  const env = {
    ...process.env,
    npm_config_arch: target.arch,
    npm_config_platform: target.platform,
    ELECTRON_INSTALL_ARCH: target.arch,
    ELECTRON_INSTALL_PLATFORM: target.platform,
  };
  await timed("Electron kurulumu", () => execute(process.execPath, ["run", "desktop:install"], root, env), summary);
  if (target.id === "darwin-x64") {
    const binary = join(electronDist, target.electronExecutable);
    await timed("Intel Electron mimarisi", () => execute("/usr/bin/lipo", [binary, "-verify_arch", "x86_64"]), summary);
  }
  if (acceptance) {
    const results = await Promise.allSettled([
      timed("Tür kontrolü", () => execute(process.execPath, ["run", "typecheck"]), summary),
      timed("Uygulama testleri", () => execute(process.execPath, ["test", "./src"]), summary),
      timed("Masaüstü birim testleri", () => execute(process.execPath, ["test", "--parallel=2", "./electron", "./scripts/electron"]), summary),
    ]);
    const failures = results.filter(result => result.status === "rejected").map(result => result.reason);
    if (failures.length === 1) throw failures[0];
    if (failures.length) throw new AggregateError(failures, "Derleme öncesi doğrulamaları kontrol et.");
    await timed("Pano kabulü", () => execute(process.execPath, [join(__dirname, "clipboard-smoke.cjs"), "--isolated-desktop"]), summary);
  }
}

async function build(version, siteDirectory, { execute = run, summary = process.env.GITHUB_STEP_SUMMARY, distribution = true } = {}) {
  await checkVersion(version);
  const [platform, arch] = process.env.RELEASE_TARGET?.split("-") || [process.platform, process.arch];
  const target = platformTarget(platform, arch);
  const crossLinux = process.platform === "darwin" && target.id === "linux-x64";
  const crossIntel = process.platform === "darwin" && process.arch === "arm64" && target.id === "darwin-x64";
  const nativeTarget = target.platform === process.platform && target.arch === process.arch;
  if ((process.env.RELEASE_TARGET && process.env.RELEASE_TARGET !== target.id) ||
      (!nativeTarget && !crossLinux && !crossIntel)) {
    throw new Error("Derleme ortamı seçilen yayın hedefini desteklemiyor.");
  }
  if (crossLinux && !process.env.POFIS_SHARED_STANDALONE) throw new Error("Linux çapraz paketi için doğrulanmış ortak standalone çıktısı gerekli.");
  if (!siteDirectory) throw new Error("CI kurulum testi için tanıtım sitesinin klasörü gerekli.");
  // Foreign runtimes are inspected statically; native targets retain full acceptance.
  const acceptance = target.id !== "darwin-x64" && !crossLinux;
  const stage = (label, task) => timed(label, task, summary);
  if (summary) await appendFile(summary,
    `\n## ${target.id} aşama süreleri\n\n| Aşama | Sonuç | Saniye |\n| --- | --- | --- |\n`);
  await preflight(target, acceptance, execute, summary);
  if (process.env.POFIS_SHARED_STANDALONE) {
    if (target.id !== "darwin-x64" && !crossLinux) throw new Error("Ortak standalone çıktısı Intel macOS ve çapraz Linux paketleri içindir.");
    console.log(`${target.id} paketi ARM64 kabulüyle aynı Next çıktısını kullanıyor.`);
  } else {
    await stage("Next standalone derlemesi", () => execute(process.execPath, [join(__dirname, "build.cjs")]));
  }
  await stage("Electron paketleme ve imza", () => execute(process.execPath, [join(__dirname, "package.cjs"), target.arch, ...(crossLinux ? [target.platform] : [])]));
  const packages = join(root, "dist", target.outputDirectory);
  const names = (await readdir(packages)).filter(name => name.startsWith(`Pofis-${target.id}-`));
  if (names.length !== 1) throw new Error("CI temiz çalışma alanında tam bir yeni paket üretmeli.");
  const directory = join(packages, names[0]);
  // Both stages read the sealed bundle. Wait for both before installer acceptance or staging.
  const checks = await Promise.allSettled([
    acceptance
      ? stage("Paket açılış ve süreç kabulü", () => execute(process.execPath, ["run", "test:desktop:smoke", directory], root, process.env, { timeoutMs: 120000 }))
      : stage(crossLinux ? "Linux statik paket kontrolü" : "Intel statik paket kontrolü", () => execute(process.execPath, [join(__dirname, crossLinux ? "linux-static-check.cjs" : "macos-static-check.cjs"), directory])),
    stage("Dağıtım arşivi ve manifest", () => execute(process.execPath, [join(__dirname, "release.cjs"), "-PackageDirectory", directory, "-Arch", target.arch, ...(crossLinux ? ["-Platform", target.platform] : [])])),
  ]);
  const failures = checks.filter(result => result.status === "rejected").map(result => result.reason);
  if (failures.length) throw new AggregateError(failures, failures.map(error => error.message).join("\n"));
  if (crossLinux) await stage("Linux tar.gz bütünlüğü", () => execute("/usr/bin/tar", ["-tzf",
    join(root, "dist/releases", target.releaseDirectory, version, `Pofis-${version}-${target.id}.tar.gz`)]));
  else if (!acceptance) await stage("Intel ZIP bütünlüğü", () => execute("/usr/bin/unzip", ["-tq",
    join(root, "dist/releases", target.releaseDirectory, version, `Pofis-${version}-${target.id}.zip`)]));
  const { prepareSite } = require("./prepare-site.cjs");
  await stage("Dağıtım dosyalarını doğrula ve siteyi hazırla", () => prepareSite({ siteDirectory, releaseDirectory: join(root, "dist/releases", target.releaseDirectory),
    installerPath: join(__dirname, target.installer) }));
  if (acceptance && distribution) await accept(version, siteDirectory, { execute, summary });
}

async function accept(version, siteDirectory, { execute = run, summary = process.env.GITHUB_STEP_SUMMARY } = {}) {
  await checkVersion(version);
  if (!siteDirectory) throw new Error("Kurulum kabulü için tanıtım sitesinin klasörü gerekli.");
  const target = platformTarget();
  if (target.id === "darwin-x64") throw new Error("Intel paketi statik kontrollerle doğrulanır.");
  await timed("Kurulum ve güncelleme kabulü", async () => {
    if (target.platform === "win32") {
      await execute(process.execPath, ["run", "test:desktop:distribution", "--site", siteDirectory], root, process.env, { timeoutMs: 300000 });
    } else if (target.platform === "linux") {
      await execute(process.execPath, [join(__dirname, "linux-distribution-test.cjs"), "--site", siteDirectory], root, process.env, { timeoutMs: 300000 });
    } else {
      await execute(process.execPath, [join(__dirname, "macos-distribution-test.cjs"), "--site", siteDirectory], root, process.env, { timeoutMs: 300000 });
    }
  }, summary);
}

if (require.main === module) {
  const action = process.argv[2];
  const version = process.env.RELEASE_VERSION;
  (action === "check" ? checkVersion(version) : action === "accept" ? accept(version, process.env.SITE_DIRECTORY)
    : ["build", "package"].includes(action) ? build(version, process.env.SITE_DIRECTORY, { distribution: action === "build" })
    : Promise.reject(new Error("Kullanım: RELEASE_VERSION=x.y.z bun scripts/electron/ci-build.cjs check|build|package|accept")))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { assertVersion, run, checkVersion, timed, build, accept };
