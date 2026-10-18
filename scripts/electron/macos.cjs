const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { rename, readdir, mkdir, copyFile, open } = require("node:fs/promises");
const { join, basename, sep } = require("node:path");
const execute = promisify(execFile);

async function configureBundle(bundle, executable, identifier, version) {
  const plist = join(bundle, "Contents", "Info.plist");
  for (const [key, value] of Object.entries({
    CFBundleName: executable, CFBundleDisplayName: executable,
    CFBundleExecutable: executable, CFBundleIdentifier: identifier,
    CFBundleShortVersionString: version, CFBundleVersion: version,
    CFBundleIconFile: "Pofis.icns",
  })) {
    // Delete/Add also handles optional fields absent from Electron's template.
    await execute("/usr/libexec/PlistBuddy", ["-c", `Delete :${key}`, plist]).catch(error => {
      if (!(String(error.stdout) + String(error.stderr)).includes("Does Not Exist")) throw error;
    });
    await execute("/usr/libexec/PlistBuddy", ["-c", `Add :${key} string "${value}"`, plist]);
  }
}

async function rebrandMacBundle(bundle, version, icon) {
  const installIcon = async directory => {
    const resources = join(directory, "Contents", "Resources");
    await mkdir(resources, { recursive: true });
    await copyFile(icon, join(resources, "Pofis.icns"));
  };
  await installIcon(bundle);
  await rename(join(bundle, "Contents", "MacOS", "Electron"), join(bundle, "Contents", "MacOS", "Pofis"));
  await configureBundle(bundle, "Pofis", "app.pofis.client", version);
  const frameworks = join(bundle, "Contents", "Frameworks");
  for (const entry of await readdir(frameworks, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^Electron Helper(?: \([A-Za-z]+\))?\.app$/.test(entry.name)) continue;
    const original = entry.name.slice(0, -4);
    const name = original.replace("Electron", "Pofis");
    const helper = join(frameworks, entry.name);
    await installIcon(helper);
    await rename(join(helper, "Contents", "MacOS", original), join(helper, "Contents", "MacOS", name));
    const suffix = name === "Pofis Helper" ? "helper" : `helper.${name.match(/\(([^)]+)\)/)[1].toLowerCase()}`;
    await configureBundle(helper, name, `app.pofis.client.${suffix}`, version);
    await rename(helper, join(frameworks, `${name}.app`));
  }
}

async function signMacBundle(bundle, run = execute) {
  const magic = new Set([0xfeedface, 0xcefaedfe, 0xfeedfacf, 0xcffaedfe,
    0xcafebabe, 0xbebafeca, 0xcafebabf, 0xbfbafeca]);
  const sign = path => run("/usr/bin/codesign", ["--force", "--sign", "-",
    "--preserve-metadata=entitlements,flags", path]);
  const targets = [];
  // rebrandMacBundle gives each .app and its main executable the same name.
  const mainExecutable = app => join(app, "Contents", "MacOS", basename(app, ".app"));
  async function visit(directory, appExecutable) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      // Framework aliases point to code visited through its actual directory.
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await visit(path, entry.name.endsWith(".app") ? mainExecutable(path) : appExecutable);
        if (/\.(?:app|framework|xpc)$/.test(entry.name)) targets.push(path);
      } else if (entry.isFile()) {
        // codesign treats this path as its containing app. Sign that app only after nested code.
        if (path === appExecutable) continue;
        const file = await open(path, "r");
        let native;
        try {
          const header = Buffer.alloc(4);
          const { bytesRead } = await file.read(header, 0, 4, 0);
          native = bytesRead === 4 && magic.has(header.readUInt32BE(0));
        } finally { await file.close(); }
        if (native) targets.push(path);
      }
    }
  }
  await visit(bundle, mainExecutable(bundle));
  // A framework's main binary also seals its container; sign deeper Helpers/Libraries first.
  targets.sort((a, b) => b.split(sep).length - a.split(sep).length);
  for (const path of targets) await sign(path);
  await sign(bundle);
  await run("/usr/bin/codesign", ["--verify", "--deep", "--strict", bundle]);
}

module.exports = { rebrandMacBundle, signMacBundle };
