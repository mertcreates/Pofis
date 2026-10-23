const { createHash } = require("node:crypto");
const { createReadStream } = require("node:fs");
const { readFile, writeFile, mkdir, stat } = require("node:fs/promises");
const { resolve, join } = require("node:path");
const { platformTarget } = require("../../electron/platform.cjs");
const { unixInstaller } = require("./unix-installer.cjs");
const CHANGELOG_GROUPS = ["features", "fixes", "maintenance"];

function normalizeInstaller(text) {
  return text.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n");
}

async function readChangelog(version) {
  const path = resolve(__dirname, "../../src/data/changelog.json");
  const changelog = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(changelog) || !changelog.length || changelog[0]?.version !== version) {
    throw new Error(`Sürüm geçmişinin ilk kaydı ${version} olmalı.`);
  }
  const versions = new Set();
  let previous;
  for (const release of changelog) {
    if (!release || typeof release !== "object" || typeof release.version !== "string" || release.version.trim() !== release.version ||
        !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(release.version) ||
        !release.version.split(".").map(Number).every(Number.isSafeInteger) ||
        typeof release.publishedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(release.publishedOn) ||
        !Number.isFinite(Date.parse(`${release.publishedOn}T00:00:00Z`)) ||
        new Date(`${release.publishedOn}T00:00:00Z`).toISOString().slice(0, 10) !== release.publishedOn ||
        versions.has(release.version)) {
      throw new Error("Sürüm geçmişi kaydı geçersiz.");
    }
    if (previous) {
      const currentParts = release.version.split(".").map(Number);
      const previousParts = previous.split(".").map(Number);
      const firstDifference = previousParts.findIndex((part, index) => part !== currentParts[index]);
      if (firstDifference === -1 || previousParts[firstDifference] < currentParts[firstDifference]) {
        throw new Error("Sürüm geçmişi yeniden eskiye sıralanmalı.");
      }
    }
    versions.add(release.version);
    previous = release.version;
    const groups = CHANGELOG_GROUPS.filter(group => release[group] !== undefined);
    if (!groups.length || groups.some(group => !Array.isArray(release[group]) || !release[group].length ||
        release[group].some(item => typeof item !== "string" || !item.trim()))) {
      throw new Error(`Sürüm geçmişi içeriği geçersiz: ${release.version}`);
    }
  }
  return changelog;
}

async function prepareChangelog({ siteDirectory, version }) {
  const changelog = await readChangelog(version);
  const destination = join(resolve(siteDirectory), "public", "releases");
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, "changelog.json"), JSON.stringify(changelog, null, 2) + "\n");
  return changelog;
}

async function verifyPreparedChangelog({ siteDirectory, version }) {
  const expected = await readChangelog(version);
  const actual = JSON.parse(await readFile(join(resolve(siteDirectory), "public/releases/changelog.json"), "utf8"));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Hazırlanan sürüm geçmişi kaynak katalogla eşleşmiyor.");
  }
}

async function verifyRelease({ siteDirectory, releaseDirectory }) {
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
  const publicManifest = {
    schemaVersion: 1, platform: target.platform, arch: target.arch, version: manifest.version,
    size: manifest.size, sha256: manifest.sha256,
    url: `https://github.com/${repository}/releases/download/v${manifest.version}/${name}`,
  };
  return { manifest: publicManifest, archive };
}

async function prepareSite({ siteDirectory, releaseDirectory, installerPath }) {
  const { manifest, archive } = await verifyRelease({ siteDirectory, releaseDirectory });
  const target = platformTarget(manifest.platform, manifest.arch);
  const site = resolve(siteDirectory);
  // HTTP supplies charset=utf-8; omit the file BOM so irm | iex receives plain PowerShell.
  const installerName = target.platform === "win32" ? target.installer : "install.sh";
  const payload = normalizeInstaller(await readFile(installerPath || join(__dirname, target.installer), "utf8"));
  const installer = target.platform === "win32" ? payload : await unixInstaller({ [target.platform]: payload });
  const destination = join(site, "public", "releases", target.releaseDirectory);
  await mkdir(destination, { recursive: true });
  await writeFile(join(site, "public", installerName), installer);
  await writeFile(join(destination, "latest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Site dağıtım dosyaları hazır: ${destination}`);
  console.log(`Yüklenecek dosya: ${archive}`);
  console.log("Önce GitHub paketini yayımla; ardından site değişikliklerini yayımla.");
  return { manifest, archive };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--site" || !args[1])) {
    console.error("Kullanım: bun scripts/electron/prepare-site.cjs [--site <pofis-landing-klasörü>]");
    process.exitCode = 1;
  } else {
    const root = resolve(__dirname, "../..");
    const target = platformTarget();
    (async () => {
      const { manifest } = await prepareSite({
        siteDirectory: args[1] || resolve(root, "../pofis-landing"),
        releaseDirectory: join(root, "dist", "releases", target.releaseDirectory),
        installerPath: join(__dirname, target.installer),
      });
      await prepareChangelog({ siteDirectory: args[1] || resolve(root, "../pofis-landing"), version: manifest.version });
    })().catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
module.exports = { prepareSite, prepareChangelog, readChangelog, verifyPreparedChangelog, verifyRelease, normalizeInstaller };
