const { cp, mkdir, copyFile, rename, writeFile, readFile, access } = require("node:fs/promises");
const { join, resolve, basename } = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { platformTarget } = require("../../electron/platform.cjs");
const { rebrandMacBundle, signMacBundle } = require("./macos.cjs");
const { prepareIcons } = require("./icons.cjs");

async function prepare() {
  if (!process.versions.bun) throw new Error("Paketleyiciyi Bun ile çalıştır.");
  const target = platformTarget();
  const root = resolve(__dirname, "../..");
  const icons = await prepareIcons(join(root, "public", "pofi", "pofi-mark-256.png"), join(root, "dist", "electron", "icons"));
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error("Pofis sürümü x.y.z biçiminde olmalı.");
  const electronDist = join(root, "node_modules", "electron", "dist");
  const electronExecutable = join(electronDist, target.electronExecutable);
  await access(electronExecutable);
  // Electron's installer can select arm64 under Rosetta while Bun is x64.
  const { stdout } = await promisify(execFile)(electronExecutable,
    ["-p", "JSON.stringify({platform:process.platform,arch:process.arch})"], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }, windowsHide: true, timeout: 15000,
    });
  const installed = JSON.parse(stdout.trim());
  if (installed.platform !== target.platform || installed.arch !== target.arch) {
    throw new Error(`Electron ${installed.platform}/${installed.arch}, Bun ${target.id}. İkisini aynı platform ve mimariyle hazırla.`);
  }
  const standalone = join(root, ".next", "standalone");
  await access(join(standalone, "server.js"));
  // Each build gets its own folder, so an existing prototype is preserved.
  const output = join(root, "dist", target.outputDirectory, `Pofis-${target.id}-${Date.now()}`);
  const resources = join(output, target.resources);
  const payload = join(resources, "app");
  if (target.platform === "darwin") {
    await cp(join(electronDist, "Electron.app"), join(output, "Pofis.app"), { recursive: true, verbatimSymlinks: true });
    await rebrandMacBundle(join(output, "Pofis.app"), manifest.version, icons.macos);
  } else {
    await cp(electronDist, output, { recursive: true });
    await rename(join(output, "electron.exe"), join(output, target.executable));
    await promisify(execFile)(join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(__dirname, "set-windows-icon.ps1"),
        "-Executable", join(output, target.executable), "-Icon", icons.windows], { windowsHide: true });
  }
  await mkdir(join(payload, "electron"), { recursive: true });
  for (const file of ["main.cjs", "server.cjs", "server-entry.cjs", "startup.cjs", "platform.cjs", "updates.cjs", "external-links.cjs", "permissions.cjs"]) {
    await copyFile(join(root, "electron", file), join(payload, "electron", file));
  }
  if (target.platform === "win32") await copyFile(join(root, "electron", "uninstall.ps1"), join(payload, "electron", "uninstall.ps1"));
  // Dereference Next's Windows junctions so the package is relocatable.
  await cp(standalone, join(payload, "server"), { recursive: true, dereference: true,
    filter: path => !/^\.env(?:\.|$)/.test(basename(path)) });
  await mkdir(join(payload, "public", "pofi"), { recursive: true });
  await copyFile(join(root, "public", "pofi", "pofi-mark-256.png"), join(payload, "public", "pofi", "pofi-mark-256.png"));
  await writeFile(join(payload, "package.json"), JSON.stringify({
    name: "pofis", productName: "Pofis", version: manifest.version,
    private: true, main: "electron/main.cjs",
  }, null, 2));
  const release = { schemaVersion: 1, version: manifest.version, platform: target.platform, arch: target.arch };
  await writeFile(join(target.platform === "darwin" ? resources : output, "release.json"), JSON.stringify(release, null, 2));
  if (target.platform === "darwin") {
    await signMacBundle(join(output, "Pofis.app"));
  }
  console.log(`Pofis paketi (${target.id}): ${output}\n${target.platform === "darwin" ? "Pofis.app" : "Pofis.exe"} dosyasını aç. Node/Bun kurulumu gerekmez.`);
}

prepare().catch((error) => { console.error(error.message); process.exitCode = 1; });
