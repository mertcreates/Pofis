const { createHash } = require("node:crypto");
const { readFile, writeFile, appendFile, mkdir, open, rm } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { platformTarget } = require("../../electron/platform.cjs");
const { prepareSite } = require("./prepare-site.cjs");
const { checkVersion, run } = require("./ci-build.cjs");

const REPOSITORY = "mertcreates/pofis-landing";
const TARGETS = ["win32-x64", "darwin-arm64", "darwin-x64"];
const RELEASE_MARKER = "Pofis ortak sürüm otomasyonu.";
const PUBLIC_FILES = ["public/install.ps1", "public/install.sh", "public/releases/windows/latest.json",
  "public/releases/macos/arm64/latest.json", "public/releases/macos/x64/latest.json"];
const root = resolve(__dirname, "../..");
const delay = ms => new Promise(done => setTimeout(done, ms));

function releaseBody(version) {
  if (!/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || "")) throw new Error("Kaynak commit kimliği geçersiz.");
  return `Pofis ${version}\n\nWindows x64, macOS Apple Silicon ve Intel paketleri.\n\n${RELEASE_MARKER}\nKaynak commit: ${process.env.GITHUB_SHA}`;
}

function assertRelease(release, version) {
  if (!release || release.body !== releaseBody(version)) throw new Error("Sürüm bu kaynak commit ile üretilmemiş. Yeni bir sürüm numarası kullan.");
}

function targetFor(id) {
  if (!TARGETS.includes(id)) throw new Error("Geçersiz yayın hedefi.");
  const [platform, arch] = id.split("-");
  return platformTarget(platform, arch);
}

function assertManifest(manifest, version, id) {
  const target = targetFor(id);
  const url = `https://github.com/${REPOSITORY}/releases/download/v${version}/Pofis-${version}-${id}.zip`;
  if (manifest.schemaVersion !== 1 || manifest.version !== version || manifest.platform !== target.platform ||
      manifest.arch !== target.arch || manifest.url !== url || !Number.isSafeInteger(manifest.size) ||
      manifest.size <= 0 || manifest.size >= 2 ** 31 || !/^[a-f0-9]{64}$/.test(manifest.sha256)) {
    throw new Error(`Geçersiz yayın manifesti: ${id}`);
  }
}

function assertPublicChanges(paths) {
  if (paths.some(path => !PUBLIC_FILES.includes(path))) throw new Error("Site deposunda dağıtım kapsamı dışında değişiklik var.");
}

function assertNoDowngrade(current, next) {
  const a = current.split(".").map(Number);
  const b = next.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) throw new Error("Sitedeki sürüm daha yeni; eski sürüm etkinleştirilemez.");
    if (a[i] < b[i]) return;
  }
}

async function verifyDownload(response, manifest, save = async () => {}) {
  if (!response.ok || !response.body) throw new Error(`Paket indirilemedi (HTTP ${response.status}).`);
  const hash = createHash("sha256");
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > manifest.size) throw new Error("İndirilen paket beklenen boyutu aşıyor.");
    hash.update(chunk);
    await save(chunk);
  }
  if (size !== manifest.size || hash.digest("hex") !== manifest.sha256) throw new Error("İndirilen paket boyutu/SHA-256 değeri eşleşmiyor.");
}

async function api(path, { method = "GET", body, raw = false, missing = false, upload } = {}) {
  if (!process.env.GH_TOKEN) throw new Error("Depo sırlarına POFIS_RELEASE_TOKEN ekle.");
  const url = upload || `https://api.github.com/repos/${REPOSITORY}/${path}`;
  if (upload && !upload.startsWith(`https://uploads.github.com/repos/${REPOSITORY}/releases/`)) throw new Error("Geçersiz dosya yükleme adresi.");
  const response = await fetch(url, { method, signal: AbortSignal.timeout(180000), headers: {
    Authorization: `Bearer ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28",
    Accept: raw ? "application/octet-stream" : "application/vnd.github+json",
    ...(body ? { "Content-Type": upload ? "application/octet-stream" : "application/json" } : {}),
  }, body: body ? upload ? body : JSON.stringify(body) : undefined });
  if (missing && response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub ${method} ${path || "asset"}: HTTP ${response.status}.`);
  return raw ? response : response.status === 204 ? null : response.json();
}

async function getRelease(version) { return api(`releases/tags/v${version}`, { missing: true }); }
function manifestName(id) { return `manifest-${id}.json`; }
function assetNames(version, id) {
  return [`Pofis-${version}-${id}.zip`, installerAsset(id), manifestName(id)];
}
// Each native job owns its own assets; the two macOS jobs never race on install.sh.
function installerAsset(id) { return id === "win32-x64" ? "install.ps1" : `install-${id}.sh`; }
function installerFile(id) { return id === "win32-x64" ? "install.ps1" : "install.sh"; }
function releaseDirectory(id) { return join(root, "dist/releases", targetFor(id).releaseDirectory); }

async function readAsset(release, name, raw = false) {
  const asset = release.assets.find(item => item.name === name && item.state === "uploaded");
  if (!asset || !Number.isSafeInteger(asset.id)) throw new Error(`Sürüm dosyası eksik: ${name}`);
  const response = await api(`releases/assets/${asset.id}`, { raw: true });
  return raw ? response : response.json();
}

async function recover(version, id, release, allowCleanup = true) {
  const names = assetNames(version, id);
  const present = names.filter(name => release.assets.some(asset => asset.name === name && asset.state === "uploaded"));
  if (present.length !== names.length) {
    if (!release.draft || !allowCleanup) throw new Error(`Sürüm paketi eksik: ${id}`);
    // These are only this platform's incomplete, generated draft assets, never published files.
    for (const asset of release.assets.filter(asset => names.includes(asset.name))) {
      await api(`releases/assets/${asset.id}`, { method: "DELETE" });
    }
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, "reuse=false\n");
    return false;
  }
  const manifest = await readAsset(release, manifestName(id));
  assertManifest(manifest, version, id);
  const directory = releaseDirectory(id);
  await mkdir(join(directory, version), { recursive: true });
  const archive = join(directory, version, names[0]);
  const file = await open(archive, "w");
  try {
    await verifyDownload(await readAsset(release, names[0], true), manifest, chunk => file.writeFile(chunk));
  } catch (error) { await file.close(); await rm(archive, { force: true }); throw error; }
  await file.close();
  const local = { ...manifest, url: `${version}/${names[0]}` };
  await writeFile(join(directory, "latest.json"), JSON.stringify(local, null, 2) + "\n");
  {
    const response = await readAsset(release, installerAsset(id), true);
    const installer = await response.text();
    const canonical = (await readFile(join(__dirname, installerFile(id)), "utf8")).replace(/^\uFEFF/, "");
    if (installer !== canonical) throw new Error("Kurulum betiği kaynak commit ile eşleşmiyor.");
    await writeFile(join(directory, installerFile(id)), installer);
  }
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, "reuse=true\n");
  console.log(`${id}: daha önce doğrulanmış paket indirildi; yeniden derleme gerekmiyor.`);
  return true;
}

async function assertSite(site, version) {
  const pkg = JSON.parse(await readFile(join(site, "package.json"), "utf8"));
  if (pkg.name !== "pofis-landing" || pkg.repository?.url !== `https://github.com/${REPOSITORY}.git`) throw new Error("Tanıtım sitesinin deposu eşleşmiyor.");
  if ((await run("git", ["branch", "--show-current"], site)) !== "main" ||
      (await run("git", ["remote", "get-url", "origin"], site)) !== `https://github.com/${REPOSITORY}.git`) {
    throw new Error("Site deposunun main dalı ve origin adresi doğrulanamadı.");
  }
  const current = JSON.parse(await readFile(join(site, "public/releases/windows/latest.json"), "utf8"));
  if (!/^\d+\.\d+\.\d+$/.test(current.version)) throw new Error("Sitedeki sürüm numarası geçersiz.");
  assertNoDowngrade(current.version, version);
}

async function changedFiles(site) {
  const tracked = await run("git", ["diff", "HEAD", "--name-only"], site);
  const untracked = await run("git", ["ls-files", "--others", "--exclude-standard"], site);
  const paths = [...new Set((tracked + "\n" + untracked).split(/\r?\n/).filter(Boolean))];
  assertPublicChanges(paths);
  return paths;
}

async function prepare(site, version) {
  await assertSite(site, version);
  await changedFiles(site);
  for (const id of TARGETS) {
    const directory = releaseDirectory(id);
    const local = JSON.parse(await readFile(join(directory, "latest.json"), "utf8"));
    if (local.version !== version) throw new Error(`Sürüm eşleşmiyor: ${id}`);
    await prepareSite({ siteDirectory: site, releaseDirectory: directory,
      installerPath: join(directory, installerFile(id)) });
  }
  await changedFiles(site);
}

async function stage(version, id) {
  const release = await getRelease(version);
  assertRelease(release, version);
  if (!release.draft) throw new Error("Yayımlanmış sürüme dosya eklenemez.");
  const directory = releaseDirectory(id);
  const { manifest, archive } = await prepareSite({ siteDirectory: process.env.SITE_DIRECTORY,
    releaseDirectory: directory, installerPath: join(directory, installerFile(id)) });
  assertManifest(manifest, version, id);
  const manifestPath = join(directory, manifestName(id));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  for (const [name, path] of [[assetNames(version, id)[0], archive],
    [installerAsset(id), join(process.env.SITE_DIRECTORY, "public", installerFile(id))],
    [manifestName(id), manifestPath]]) {
    const url = release.upload_url.replace(/\{.*$/, "") + "?name=" + encodeURIComponent(name);
    await api("asset", { method: "POST", upload: url, body: Bun.file(path) });
  }
  console.log(`${id}: test edilmiş paket sürüm taslağına aktarıldı.`);
}

async function publish(site, version) {
  await assertSite(site, version);
  const paths = await changedFiles(site);
  const release = await getRelease(version);
  assertRelease(release, version);
  for (const id of TARGETS) {
    const manifest = await readAsset(release, manifestName(id));
    assertManifest(manifest, version, id);
    const local = JSON.parse(await readFile(join(site, "public/releases", targetFor(id).releaseDirectory, "latest.json"), "utf8"));
    if (JSON.stringify(local) !== JSON.stringify(manifest)) throw new Error(`Site ve sürüm manifestleri farklı: ${id}`);
  }
  if (release.draft) {
    await api(`releases/${release.id}`, { method: "PATCH", body: { draft: false, make_latest: "true" } });
  }
  // Verify anonymous delivery before changing the live manifest pointer.
  for (const id of TARGETS) {
    const manifest = await readAsset(release, manifestName(id));
    await verifyDownload(await fetch(manifest.url, { signal: AbortSignal.timeout(180000) }), manifest);
  }
  if (!paths.length) { console.log("Site bu sürümde güncel"); return; }
  await run("git", ["add", "--", ...paths], site);
  await run("git", ["-c", "user.name=Pofis Release", "-c", "user.email=release@pofis.app", "commit", "-m", `Pofis ${version}`], site);
  const auth = Buffer.from(`x-access-token:${process.env.GH_TOKEN}`).toString("base64");
  await run("git", ["push", "origin", "HEAD:main"], site, { ...process.env,
    GIT_CONFIG_COUNT: "2", GIT_CONFIG_KEY_0: "credential.helper", GIT_CONFIG_VALUE_0: "",
    GIT_CONFIG_KEY_1: "http.https://github.com/.extraheader", GIT_CONFIG_VALUE_1: `AUTHORIZATION: basic ${auth}` });
}

async function verifyLive(site, version) {
  const until = Date.now() + 300000;
  let last = "Pages yayını bekleniyor.";
  while (Date.now() < until) {
    try {
      for (const id of TARGETS) {
        const path = `releases/${targetFor(id).releaseDirectory.replaceAll("\\", "/")}/latest.json`;
        const response = await fetch(`https://pofis.app/${path}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json") ||
            !response.headers.get("cache-control")?.includes("no-store")) throw new Error(`Canlı manifest/başlıklar hazır değil: ${id}`);
        const actual = await response.json();
        assertManifest(actual, version, id);
        const expected = JSON.parse(await readFile(join(site, "public", path), "utf8"));
        if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Canlı manifest farklı: ${id}`);
      }
      for (const name of ["install.ps1", "install.sh"]) {
        const expected = await readFile(join(site, "public", name), "utf8");
        const installer = await fetch(`https://pofis.app/${name}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (!installer.ok || !installer.headers.get("content-type")?.includes("text/plain") ||
            !installer.headers.get("cache-control")?.includes("no-store") || await installer.text() !== expected) {
          throw new Error(`Yayındaki kurulum betiğinin içeriği veya HTTP başlıkları farklı: ${name}`);
        }
      }
      const page = await fetch("https://pofis.app/", { signal: AbortSignal.timeout(10000) });
      if (!page.ok || !page.headers.get("content-type")?.includes("text/html")) throw new Error("Tanıtım sayfası henüz hazır değil.");
      console.log(`Pofis ${version}: canlı HTTPS dağıtımı doğrulandı.`);
      return;
    } catch (error) { last = error.message; }
    await delay(10000);
  }
  throw new Error(`Pages yayını 5 dakikada doğrulanamadı: ${last}`);
}

async function main() {
  if (process.env.GITHUB_ACTIONS !== "true" || process.env.GITHUB_EVENT_NAME !== "workflow_dispatch" || process.env.GITHUB_REF !== "refs/heads/main") {
    throw new Error("Yayın komutları yalnız main dalında elle başlatılan GitHub Actions akışında çalışır.");
  }
  const version = process.env.RELEASE_VERSION;
  await checkVersion(version);
  if (!process.env.SITE_DIRECTORY) throw new Error("SITE_DIRECTORY gerekli.");
  const site = resolve(process.env.SITE_DIRECTORY);
  const action = process.argv[2];
  if (action === "begin") {
    await assertSite(site, version);
    const repo = await api("");
    if (repo.private || repo.default_branch !== "main") throw new Error("Hedef herkese açık bir depo ve main dalı olmalı.");
    const release = await getRelease(version);
    if (!release) await api("releases", { method: "POST", body: { tag_name: `v${version}`,
      target_commitish: "main", name: `Pofis ${version}`, body: releaseBody(version), draft: true } });
    else assertRelease(release, version);
  } else if (action === "recover") {
    const release = await getRelease(version);
    assertRelease(release, version);
    await recover(version, process.env.RELEASE_TARGET, release);
  } else if (action === "stage") await stage(version, process.env.RELEASE_TARGET);
  else if (action === "prepare") {
    const release = await getRelease(version);
    assertRelease(release, version);
    for (const id of TARGETS) await recover(version, id, release, false);
    await prepare(site, version);
  } else if (action === "publish") await publish(site, version);
  else if (action === "verify") await verifyLive(site, version);
  else throw new Error("Yayın adımı: begin|recover|stage|prepare|publish|verify");
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { assertManifest, assertPublicChanges, assertNoDowngrade, verifyDownload, targetFor,
  readAsset, recover, releaseBody, assertRelease };
