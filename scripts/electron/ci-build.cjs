const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { readFile, readdir, appendFile } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { platformTarget } = require("../../electron/platform.cjs");
const execute = promisify(execFile);
const root = resolve(__dirname, "../..");

function assertVersion(version, actual) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) || version !== actual) {
    throw new Error("Seçilen sürüm package.json sürümüyle eşleşen x.y.z biçiminde olmalı.");
  }
}

async function run(command, args, cwd = root, env = process.env) {
  try {
    const result = await execute(command, args, { cwd, env, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    return result.stdout.trim();
  } catch (error) {
    if (error.stdout) process.stdout.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    throw new Error(`${command.split(/[\\/]/).at(-1)} başarısız (${error.code}).`);
  }
}

async function checkVersion(version) {
  assertVersion(version, JSON.parse(await readFile(join(root, "package.json"), "utf8")).version);
}

async function timed(label, task, summary = process.env.GITHUB_STEP_SUMMARY) {
  const start = performance.now();
  let status = "başarısız";
  try {
    const result = await task();
    status = "başarılı";
    return result;
  } finally {
    const seconds = ((performance.now() - start) / 1000).toFixed(2);
    console.log(`${label}: ${status}, ${seconds} s`);
    if (summary) {
      try { await appendFile(summary, `| ${label} | ${status} | ${seconds} |\n`); }
      catch (error) { console.error(`Süre özeti yazılamadı: ${error.message}`); }
    }
  }
}

async function preflight(acceptance, execute = run, summary = process.env.GITHUB_STEP_SUMMARY) {
  await timed("Electron kurulumu", () => execute(process.execPath, ["run", "desktop:install"]), summary);
  if (acceptance) {
    await timed("Masaüstü birim testleri", () => execute(process.execPath, ["test", "./electron", "./scripts/electron"]), summary);
    await timed("Pano kabulü", () => execute(process.execPath, [join(__dirname, "clipboard-smoke.cjs"), "--isolated-desktop"]), summary);
  }
}

async function build(version, siteDirectory, { execute = run, summary = process.env.GITHUB_STEP_SUMMARY } = {}) {
  await checkVersion(version);
  const target = platformTarget();
  if (process.env.RELEASE_TARGET && process.env.RELEASE_TARGET !== target.id) {
    throw new Error("Derleme ortamının mimarisi seçilen yayın hedefiyle eşleşmiyor.");
  }
  if (!siteDirectory) throw new Error("CI kurulum testi için tanıtım sitesinin klasörü gerekli.");
  // Intel CI deliberately keeps static package checks only; all other targets retain full acceptance.
  const acceptance = target.id !== "darwin-x64";
  const stage = (label, task) => timed(label, task, summary);
  if (summary) await appendFile(summary,
    `\n## ${target.id} aşama süreleri\n\n| Aşama | Sonuç | Saniye |\n| --- | --- | --- |\n`);
  await preflight(acceptance, execute, summary);
  await stage("Next standalone derlemesi", () => execute(process.execPath, [join(__dirname, "build.cjs")]));
  await stage("Electron paketleme ve imza", () => execute(process.execPath, [join(__dirname, "package.cjs")]));
  const packages = join(root, "dist", target.outputDirectory);
  const names = (await readdir(packages)).filter(name => name.startsWith(`Pofis-${target.id}-`));
  if (names.length !== 1) throw new Error("CI temiz çalışma alanında tam bir yeni paket üretmeli.");
  const directory = join(packages, names[0]);
  if (acceptance) await stage("Paket açılış ve süreç kabulü", () => execute(process.execPath, ["run", "test:desktop:smoke", directory]));
  else await stage("Intel statik paket kontrolü", () => execute(process.execPath, [join(__dirname, "macos-static-check.cjs"), directory]));
  await stage("Dağıtım ZIP ve manifest", () => execute(process.execPath, ["run", "desktop:release", "-PackageDirectory", directory]));
  if (!acceptance) await stage("Intel ZIP bütünlüğü", () => execute("/usr/bin/unzip", ["-tq",
    join(root, "dist/releases", target.releaseDirectory, version, `Pofis-${version}-${target.id}.zip`)]));
  const { prepareSite } = require("./prepare-site.cjs");
  await stage("Dağıtım dosyalarını doğrula ve siteyi hazırla", () => prepareSite({ siteDirectory, releaseDirectory: join(root, "dist/releases", target.releaseDirectory),
    installerPath: join(__dirname, target.platform === "win32" ? "install.ps1" : "install.sh") }));
  if (!acceptance) return;
  await stage("Kurulum ve güncelleme kabulü", async () => {
    if (target.platform === "win32") {
      await execute(process.execPath, ["run", "test:desktop:distribution", "--site", siteDirectory]);
    } else {
      await execute(process.execPath, [join(__dirname, "macos-distribution-test.cjs"), "--site", siteDirectory]);
    }
  });
}

if (require.main === module) {
  const action = process.argv[2];
  const version = process.env.RELEASE_VERSION;
  (action === "check" ? checkVersion(version) : action === "build" ? build(version, process.env.SITE_DIRECTORY)
    : Promise.reject(new Error("Kullanım: RELEASE_VERSION=x.y.z bun scripts/electron/ci-build.cjs check|build")))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { assertVersion, run, checkVersion, timed, build };
