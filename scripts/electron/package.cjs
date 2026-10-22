const { cp, mkdir, copyFile, rename, writeFile, readFile, access } = require("node:fs/promises");
const { join, resolve, basename } = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { platformTarget } = require("../../electron/platform.cjs");
const { rebrandMacBundle, signMacBundle } = require("./macos.cjs");
const { prepareIcons } = require("./icons.cjs");
const { assertPortableStandalone } = require("./standalone.cjs");

async function verifyRuntime(electronDist, target, version, run = promisify(execFile)) {
  const electronExecutable = join(electronDist, target.electronExecutable);
  await access(electronExecutable);
  let installed;
  if (target.id === "darwin-x64") {
    // Intel packaging verifies runtime metadata and Mach-O architecture statically.
    const framework = join(electronDist, "Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A");
    const { stdout } = await run("/usr/libexec/PlistBuddy",
      ["-c", "Print :CFBundleVersion", join(framework, "Resources/Info.plist")], { timeout: 15000 });
    const frameworkVersion = stdout.trim();
    const distVersion = (await readFile(join(electronDist, "version"), "utf8")).trim().replace(/^v/, "");
    if (frameworkVersion !== distVersion) throw new Error(`Electron framework ${frameworkVersion}, dist/version ${distVersion}; kurulum tutarsız.`);
    for (const binary of [electronExecutable, join(framework, "Electron Framework")]) {
      await run("/usr/bin/lipo", [binary, "-verify_arch", "x86_64"], { timeout: 15000 });
    }
    installed = { platform: "darwin", arch: "x64", electron: frameworkVersion };
  } else {
    try {
      const { stdout } = await run(electronExecutable,
        ["-p", "JSON.stringify({platform:process.platform,arch:process.arch,electron:process.versions.electron})"], {
          env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }, windowsHide: true, timeout: 15000,
        });
      installed = JSON.parse(stdout.trim());
    } catch (error) {
      throw new Error(`Electron runtime sorgusu başarısız (code=${error.code}, signal=${error.signal}, killed=${error.killed}): ${error.stderr || error.message}`, { cause: error });
    }
  }
  if (installed.electron !== version) {
    throw new Error(`Electron ${installed.electron}, kilitli sürüm ${version}. Önce bun install ve bun run desktop:install çalıştır.`);
  }
  if (installed.platform !== target.platform || installed.arch !== target.arch) {
    throw new Error(`Electron ${installed.platform}/${installed.arch}, paket hedefi ${target.id}. Electron'u paket hedefiyle aynı platform ve mimaride kur.`);
  }
}

async function prepare(arch = process.arch) {
  if (!process.versions.bun) throw new Error("Paketleyiciyi Bun ile çalıştır.");
  const target = platformTarget(process.platform, arch);
  const root = resolve(__dirname, "../..");
  const icons = await prepareIcons(join(root, "public", "pofi", "pofi-mark-256.png"), join(root, "dist", "electron", "icons"));
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error("Pofis sürümü x.y.z biçiminde olmalı.");
  const electronDist = join(root, "node_modules", "electron", "dist");
  await verifyRuntime(electronDist, target, manifest.devDependencies.electron);
  const standalone = process.env.POFIS_SHARED_STANDALONE || join(root, ".next", "standalone");
  await access(join(standalone, "server.js"));
  // Each build gets its own folder, so an existing prototype is preserved.
  const output = join(root, "dist", target.outputDirectory, `Pofis-${target.id}-${Date.now()}`);
  const resources = join(output, target.resources);
  const payload = join(resources, "app");
  if (target.platform === "darwin") {
    await cp(join(electronDist, "Electron.app"), join(output, "Pofis.app"), { recursive: true, verbatimSymlinks: true });
    await rebrandMacBundle(join(output, "Pofis.app"), manifest.version, icons.macos);
  } else if (target.platform === "linux") {
    await cp(electronDist, output, { recursive: true, dereference: true });
    await rename(join(output, "electron"), join(output, target.executable));
    await copyFile(join(__dirname, "uninstall-linux.sh"), join(output, "uninstall.sh"));
  } else {
    await cp(electronDist, output, { recursive: true });
    await rename(join(output, "electron.exe"), join(output, target.executable));
    await promisify(execFile)(join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(__dirname, "set-windows-icon.ps1"),
        "-Executable", join(output, target.executable), "-Icon", icons.windows], { windowsHide: true });
  }
  await mkdir(join(payload, "electron"), { recursive: true });
  for (const file of ["main.cjs", "ui-text.cjs", "background.cjs", "transport.cjs", "server.cjs", "server-entry.cjs", "startup.cjs", "platform.cjs", "updates.cjs", "update-bridge.cjs", "external-links.cjs", "permissions.cjs", "acceptance-network.cjs"]) {
    await copyFile(join(root, "electron", file), join(payload, "electron", file));
  }
  if (target.platform === "win32") await copyFile(join(root, "electron", "uninstall.ps1"), join(payload, "electron", "uninstall.ps1"));
  // Dereference Next's Windows junctions so the package is relocatable.
  await cp(standalone, join(payload, "server"), { recursive: true, dereference: true,
    filter: path => !/^\.env(?:\.|$)/.test(basename(path)) });
  if (process.env.POFIS_SHARED_STANDALONE) await assertPortableStandalone(join(payload, "server"));
  await require("./build-notifications.cjs").buildNotifications(join(payload, "server"));
  await mkdir(join(payload, "public", "pofi"), { recursive: true });
  await copyFile(join(root, "public", "pofi", "pofi-mark-256.png"), join(payload, "public", "pofi", "pofi-mark-256.png"));
  await writeFile(join(payload, "package.json"), JSON.stringify({
    name: "pofis", productName: "Pofis", version: manifest.version,
    private: true, main: "electron/main.cjs",
  }, null, 2));
  const release = { schemaVersion: 1, version: manifest.version, platform: target.platform, arch: target.arch };
  await writeFile(join(output, target.metadataFile), JSON.stringify(release, null, 2));
  if (target.platform === "darwin") {
    await signMacBundle(join(output, "Pofis.app"));
  }
  console.log(`Pofis paketi (${target.id}): ${output}\n${target.executable} dosyasını aç.`);
}

if (require.main === module) prepare(process.argv[2]).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { verifyRuntime };
