const { createHash } = require("node:crypto");
const { createReadStream } = require("node:fs");
const { readFile, writeFile, mkdir, stat } = require("node:fs/promises");
const { resolve, join } = require("node:path");
const { platformTarget } = require("../../electron/platform.cjs");
const { unixInstaller } = require("./unix-installer.cjs");

function normalizeInstaller(text) {
  return text.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n");
}

async function prepareSite({ siteDirectory, releaseDirectory, installerPath }) {
  const site = resolve(siteDirectory);
  const packageJson = JSON.parse(await readFile(join(site, "package.json"), "utf8"));
  if (packageJson.name !== "pofis-landing") throw new Error("Hedef bağımsız pofis-landing projesi olmalı.");
  const repository = packageJson.repository?.url?.match(/^https:\/\/github\.com\/([\w-]+\/[\w.-]+)\.git$/)?.[1];
  if (!repository) throw new Error("Tanıtım sitesinin package.json dosyasında GitHub repository.url tanımlanmalı.");
  const manifest = JSON.parse(await readFile(join(releaseDirectory, "latest.json"), "utf8"));
  const target = platformTarget(manifest.platform, manifest.arch);
  if (manifest.schemaVersion !== 1 || manifest.platform !== target.platform || manifest.arch !== target.arch ||
      !/^\d+\.\d+\.\d+$/.test(manifest.version) ||
      !Number.isSafeInteger(manifest.size) || manifest.size <= 0 || !/^[a-f0-9]{64}$/.test(manifest.sha256)) {
    throw new Error("Dağıtım manifesti geçersiz.");
  }
  const name = `Pofis-${manifest.version}-${target.id}.${target.archiveExtension}`;
  if (manifest.url !== `${manifest.version}/${name}`) throw new Error("Yerel paket adresi manifestle eşleşmiyor.");
  const archive = resolve(releaseDirectory, manifest.version, name);
  if ((await stat(archive)).size !== manifest.size) throw new Error("Paket boyutu manifestle eşleşmiyor.");
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(archive)) hash.update(chunk);
  if (hash.digest("hex") !== manifest.sha256) throw new Error("Paket SHA-256 değeri manifestle eşleşmiyor.");
  // HTTP supplies charset=utf-8; omit the file BOM so irm | iex receives plain PowerShell.
  const installerName = target.platform === "win32" ? target.installer : "install.sh";
  const payload = normalizeInstaller(await readFile(installerPath || join(__dirname, target.installer), "utf8"));
  const installer = target.platform === "win32" ? payload : await unixInstaller({ [target.platform]: payload });
  const publicManifest = {
    schemaVersion: 1, platform: target.platform, arch: target.arch, version: manifest.version,
    size: manifest.size, sha256: manifest.sha256,
    url: `https://github.com/${repository}/releases/download/v${manifest.version}/${name}`,
  };
  const destination = join(site, "public", "releases", target.releaseDirectory);
  await mkdir(destination, { recursive: true });
  await writeFile(join(site, "public", installerName), installer);
  await writeFile(join(destination, "latest.json"), JSON.stringify(publicManifest, null, 2) + "\n");
  console.log(`Site dağıtım dosyaları hazır: ${destination}`);
  console.log(`GitHub hedefi: ${repository}, etiket: v${manifest.version}`);
  console.log(`Yüklenecek dosya: ${archive}`);
  console.log("Önce GitHub paketini yayımla; ardından site değişikliklerini yayımla.");
  return { manifest: publicManifest, archive };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--site" || !args[1])) {
    console.error("Kullanım: bun scripts/electron/prepare-site.cjs [--site <pofis-landing-klasörü>]");
    process.exitCode = 1;
  } else {
    const root = resolve(__dirname, "../..");
    const target = platformTarget();
    prepareSite({
      siteDirectory: args[1] || resolve(root, "../pofis-landing"),
      releaseDirectory: join(root, "dist", "releases", target.releaseDirectory),
      installerPath: join(__dirname, target.installer),
    }).catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
module.exports = { prepareSite, normalizeInstaller };
