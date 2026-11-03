const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { createReadStream } = require("node:fs");
const { createHash, randomUUID } = require("node:crypto");
const { mkdir, readFile, writeFile, copyFile, rename, stat, access, rm } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { platformTarget } = require("../../electron/platform.cjs");
const { versionParts, validReleaseManifest, archiveName } = require("../../electron/release-manifest.cjs");
const { unixInstaller } = require("./unix-installer.cjs");
const execute = promisify(execFile);

function releaseManifest(target, version, size, sha256) {
  return { schemaVersion: 1, platform: target.platform, arch: target.arch, version, size, sha256,
    url: `${version}/${archiveName(target, version)}` };
}

async function release(packageDirectory, arch = process.arch, platform = process.platform) {
  const target = platformTarget(platform, arch);
  const root = resolve(__dirname, "../..");
  const directory = resolve(packageDirectory);
  const app = JSON.parse(await readFile(join(directory, target.resources, "app", "package.json"), "utf8"));
  if (!versionParts(app.version)) throw new Error("Dağıtım sürümü x.y.z biçiminde olmalı.");
  const metadataPath = join(directory, target.metadataFile);
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  if (metadata.version !== app.version || metadata.platform !== target.platform || metadata.arch !== target.arch) {
    throw new Error("Paket bilgileri seçilen platform ve mimariyle eşleşmiyor.");
  }
  await access(join(directory, target.executable));
  await access(join(directory, target.resources, "app", "server", "server.js"));
  const output = join(root, "dist", "releases", target.releaseDirectory);
  const versionDirectory = join(output, app.version);
  await mkdir(versionDirectory, { recursive: true });
  const name = archiveName(target, app.version);
  const archive = join(versionDirectory, name);
  if (await stat(archive).then(() => true, error => { if (error.code === "ENOENT") return false; throw error; })) {
    throw new Error("Bu sürümün dağıtımı zaten var. Yeni sürüm numarası kullan.");
  }
  // Exclusive ownership also protects two developers building the same release simultaneously.
  const temporary = `${archive}.partial`;
  const lock = `${archive}.lock`;
  await writeFile(lock, "", { flag: "wx" });
  try {
    console.log(`Dağıtım arşivi hazırlanıyor (${target.id})…`);
    if (target.platform === "win32") {
      await execute(join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(__dirname, "archive.ps1"), "-Source", directory, "-Destination", temporary]);
    } else if (target.platform === "linux") {
      await execute("tar", ["-czf", temporary, "-C", directory, "."]);
    } else {
      await execute("/usr/bin/ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", join(directory, "Pofis.app"), temporary]);
    }
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(temporary)) hash.update(chunk);
    const manifest = releaseManifest(target, app.version, (await stat(temporary)).size, hash.digest("hex"));
    if (!validReleaseManifest(manifest, target)) throw new Error("Dağıtım manifesti geçersiz.");
    await rename(temporary, archive);
    const json = JSON.stringify(manifest, null, 2) + "\n";
    await writeFile(join(versionDirectory, "manifest.json"), json);
    const latest = join(output, "latest.json");
    const staging = `${latest}.${randomUUID()}.tmp`;
    await writeFile(staging, json, { flag: "wx" });
    await rename(staging, latest);
    const installer = target.installer;
    await copyFile(join(__dirname, installer), join(output, installer));
    if (target.platform !== "win32") await writeFile(join(output, "install.sh"), await unixInstaller());
    console.log(`Dağıtım dosyaları: ${output}`);
  } finally {
    try { await rm(temporary, { force: true }); }
    finally { await rm(lock, { force: true }); }
  }
}

if (require.main === module) {
  const index = process.argv.indexOf("-PackageDirectory");
  const directory = index === -1 ? null : process.argv[index + 1];
  if (!directory) { console.error("Kullanım: bun scripts/electron/release.cjs -PackageDirectory <paket-klasörü>"); process.exitCode = 1; }
  else {
    const archIndex = process.argv.indexOf("-Arch");
    const platformIndex = process.argv.indexOf("-Platform");
    release(directory, archIndex === -1 ? process.arch : process.argv[archIndex + 1],
      platformIndex === -1 ? process.platform : process.argv[platformIndex + 1])
      .catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
module.exports = { releaseManifest };
