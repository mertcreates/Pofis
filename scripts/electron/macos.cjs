const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { rename, readdir, mkdir, copyFile } = require("node:fs/promises");
const { join } = require("node:path");
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

async function signMacBundle(bundle) {
  // Local ad-hoc integrity signatures require no developer certificate or notarization.
  await execute("/usr/bin/codesign", ["--force", "--deep", "--sign", "-", bundle]);
  await execute("/usr/bin/codesign", ["--verify", "--deep", "--strict", bundle]);
}

module.exports = { rebrandMacBundle, signMacBundle };
