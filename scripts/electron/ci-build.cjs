const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { readFile, readdir } = require("node:fs/promises");
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

async function build(version, siteDirectory) {
  await checkVersion(version);
  const target = platformTarget();
  if (process.env.RELEASE_TARGET && process.env.RELEASE_TARGET !== target.id) {
    throw new Error("Derleme ortamının mimarisi seçilen yayın hedefiyle eşleşmiyor.");
  }
  // bunfig's default test root is src/; desktop/installer tests need explicit paths.
  await run(process.execPath, ["test", "./electron", "./scripts/electron"]);
  await run(process.execPath, ["run", "desktop:package"]);
  const packages = join(root, "dist", target.outputDirectory);
  const names = (await readdir(packages)).filter(name => name.startsWith(`Pofis-${target.id}-`));
  if (names.length !== 1) throw new Error("CI temiz çalışma alanında tam bir yeni paket üretmeli.");
  const directory = join(packages, names[0]);
  await run(process.execPath, ["run", "test:desktop:smoke", directory]);
  await run(process.execPath, ["run", "desktop:release", "-PackageDirectory", directory]);
  if (!siteDirectory) throw new Error("CI kurulum testi için tanıtım sitesinin klasörü gerekli.");
  const { prepareSite } = require("./prepare-site.cjs");
  await prepareSite({ siteDirectory, releaseDirectory: join(root, "dist/releases", target.releaseDirectory),
    installerPath: join(__dirname, target.platform === "win32" ? "install.ps1" : "install.sh") });
  if (target.platform === "win32") {
    await run(process.execPath, ["run", "test:desktop:distribution", "--site", siteDirectory]);
  } else {
    await run(process.execPath, [join(__dirname, "macos-distribution-test.cjs"), "--site", siteDirectory]);
  }
}

if (require.main === module) {
  const action = process.argv[2];
  const version = process.env.RELEASE_VERSION;
  (action === "check" ? checkVersion(version) : action === "build" ? build(version, process.env.SITE_DIRECTORY)
    : Promise.reject(new Error("Kullanım: RELEASE_VERSION=x.y.z bun scripts/electron/ci-build.cjs check|build")))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { assertVersion, run, checkVersion };
