const { test, expect } = require("bun:test");
const { mkdtemp, mkdir, writeFile, readFile, copyFile, rm, access } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { dirname, join } = require("node:path");
const { createHash } = require("node:crypto");
const { prepareSite, verifyRelease, prepareChangelog, readChangelog, verifyPreparedChangelog } = require("./prepare-site.cjs");

test("katalog aktarımı kaynakla eşleşir; eksik veya değiştirilmiş dosya yayından önce reddedilir", async () => {
  const siteDirectory = await mkdtemp(join(tmpdir(), "pofis-changelog-"));
  const { version } = require("../../package.json");
  try {
    await expect(verifyPreparedChangelog({ siteDirectory, version })).rejects.toThrow();
    await expect(readChangelog("999.0.0")).rejects.toThrow("ilk kaydı");
    await prepareChangelog({ siteDirectory, version });
    await verifyPreparedChangelog({ siteDirectory, version });
    const path = join(siteDirectory, "public/releases/changelog.json");
    const catalogue = JSON.parse(await readFile(path, "utf8"));
    const source = JSON.parse(await readFile(join(__dirname, "../../src/data/changelog.json"), "utf8"));
    expect(catalogue).toEqual(source);
    catalogue[0].features = ["Kaynağa ait olmayan içerik"];
    await writeFile(path, JSON.stringify(catalogue));
    await expect(verifyPreparedChangelog({ siteDirectory, version })).rejects.toThrow("kaynak katalogla eşleşmiyor");
  } finally { await rm(siteDirectory, { recursive: true, force: true }); }
});

test("yayın kataloğu doğrulanırken özgün metin ve ek alanlar korunur", async () => {
  const root = await mkdtemp(join(tmpdir(), "pofis-catalogue-fixture-"));
  try {
    for (const file of ["scripts/electron/prepare-site.cjs", "scripts/electron/unix-installer.cjs",
      "electron/platform.cjs", "electron/release-manifest.cjs", "electron/ui-text.cjs", "src/domain/changelog.ts", "src/lib/ui-text.js"]) {
      const destination = join(root, file);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(join(__dirname, "../..", file), destination);
    }
    const sourcePath = join(root, "src/data/changelog.json");
    await mkdir(dirname(sourcePath), { recursive: true });
    const source = [{ version: "1.2.3", publishedOn: "2026-10-28", features: ["  Özgün metin  "], metadata: { note: "  ek alan  " } }];
    await writeFile(sourcePath, JSON.stringify(source));
    const isolated = require(join(root, "scripts/electron/prepare-site.cjs"));
    const options = { siteDirectory: join(root, "site"), version: "1.2.3" };
    await isolated.prepareChangelog(options);
    const outputPath = join(options.siteDirectory, "public/releases/changelog.json");
    expect(JSON.parse(await readFile(outputPath, "utf8"))).toEqual(source);
    await isolated.verifyPreparedChangelog(options);
    await writeFile(sourcePath, JSON.stringify([{ ...source[0], publishedOn: "2026-02-30" }]));
    await expect(isolated.prepareChangelog(options)).rejects.toThrow();
    expect(JSON.parse(await readFile(outputPath, "utf8"))).toEqual(source);
    await writeFile(sourcePath, JSON.stringify(source));
    await writeFile(outputPath, JSON.stringify([{ ...source[0], features: ["Özgün metin"] }]));
    await expect(isolated.verifyPreparedChangelog(options)).rejects.toThrow("kaynak katalogla eşleşmiyor");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("yalnız doğrulanmış paketin public manifestini ve installer'ını aktarır", async () => {
  const root = await mkdtemp(join(tmpdir(), "pofis-site-"));
  try {
    const siteDirectory = join(root, "site");
    const releaseDirectory = join(root, "release");
    const installerPath = join(root, "install.ps1");
    await mkdir(siteDirectory);
    await mkdir(join(releaseDirectory, "1.2.3"), { recursive: true });
    await writeFile(join(siteDirectory, "package.json"), JSON.stringify({ name: "pofis-landing",
      repository: { url: "https://github.com/example/pofis-landing.git" } }));
    const bytes = Buffer.from("yalnız aktarım bütünlüğü fixture'ı; uygulama kabulü değildir");
    const archive = join(releaseDirectory, "1.2.3/Pofis-1.2.3-win32-x64.zip");
    await writeFile(archive, bytes);
    const manifest = { schemaVersion: 1, platform: "win32", arch: "x64", version: "1.2.3",
      size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"),
      url: "1.2.3/Pofis-1.2.3-win32-x64.zip", privateField: "aktarılmamalı" };
    await writeFile(join(releaseDirectory, "latest.json"), JSON.stringify(manifest));
    await writeFile(installerPath, "\uFEFFinstaller kaynağı\r\nikinci satır\r\n");
    const options = { siteDirectory, releaseDirectory, installerPath };
    const verified = await verifyRelease(options);
    expect(verified.archive).toBe(archive);
    expect(verified.manifest.sha256).toBe(manifest.sha256);
    await expect(access(join(siteDirectory, "public"))).rejects.toHaveProperty("code", "ENOENT");
    await prepareSite(options);
    const publishedPath = join(siteDirectory, "public/releases/windows/latest.json");
    const published = await readFile(publishedPath, "utf8");
    expect(JSON.parse(published)).toEqual({ schemaVersion: 1, platform: "win32", arch: "x64",
      version: "1.2.3", size: bytes.length, sha256: manifest.sha256,
      url: "https://github.com/example/pofis-landing/releases/download/v1.2.3/Pofis-1.2.3-win32-x64.zip" });
    expect(await readFile(join(siteDirectory, "public/install.ps1"), "utf8")).toBe("installer kaynağı\nikinci satır\n");
    await writeFile(archive, Buffer.alloc(bytes.length));
    await expect(prepareSite(options)).rejects.toThrow("SHA-256");
    expect(await readFile(publishedPath, "utf8")).toBe(published);
    await writeFile(archive, "eksik");
    await expect(prepareSite(options)).rejects.toThrow("boyutu");
    expect(await readFile(publishedPath, "utf8")).toBe(published);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("site hazırlığı yayımlanamayacak sürüm ve boyutları paket okumadan reddeder", async () => {
  const root = await mkdtemp(join(tmpdir(), "pofis-invalid-release-"));
  try {
    const siteDirectory = join(root, "site");
    const releaseDirectory = join(root, "release");
    await mkdir(siteDirectory);
    await mkdir(releaseDirectory);
    await writeFile(join(siteDirectory, "package.json"), JSON.stringify({ name: "pofis-landing",
      repository: { url: "https://github.com/example/pofis-landing.git" } }));
    const manifest = { schemaVersion: 1, platform: "win32", arch: "x64", version: "1.2.3", size: 42,
      sha256: "a".repeat(64), url: "1.2.3/Pofis-1.2.3-win32-x64.zip" };
    for (const invalid of [{ size: 2 ** 31 }, { version: "01.2.3" },
      { version: "9007199254740992.0.0" }, { version: "1.2.3\n" }, { sha256: "A".repeat(64) }]) {
      await writeFile(join(releaseDirectory, "latest.json"), JSON.stringify({ ...manifest, ...invalid }));
      await expect(verifyRelease({ siteDirectory, releaseDirectory })).rejects.toThrow("Dağıtım manifesti geçersiz");
      await expect(access(join(siteDirectory, "public"))).rejects.toHaveProperty("code", "ENOENT");
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

for (const [platform, arch, directory, installerName, extension] of [["darwin", "arm64", "macos", "install.sh", "zip"], ["darwin", "x64", "macos", "install.sh", "zip"], ["linux", "x64", "linux", "install.sh", "tar.gz"]]) test(`${platform} ${arch}: installer ve doğru manifest yolu aktarılır`, async () => {
  const root = await mkdtemp(join(tmpdir(), "pofis-mac-site-"));
  try {
    const siteDirectory = join(root, "site");
    const releaseDirectory = join(root, "release");
    const installerPath = join(root, "install.sh");
    await mkdir(siteDirectory);
    await mkdir(join(releaseDirectory, "1.2.3"), { recursive: true });
    await mkdir(join(siteDirectory, "public"));
    await writeFile(join(siteDirectory, "public/install.ps1"), "Windows korunur");
    await writeFile(join(siteDirectory, "package.json"), JSON.stringify({ name: "pofis-landing",
      repository: { url: "https://github.com/example/pofis-landing.git" } }));
    const bytes = Buffer.from("macOS aktarım fixture'ı; .app çalıştırma kabulü değildir");
    const name = `Pofis-1.2.3-${platform}-${arch}.${extension}`;
    await writeFile(join(releaseDirectory, "1.2.3", name), bytes);
    await writeFile(join(releaseDirectory, "latest.json"), JSON.stringify({ schemaVersion: 1,
      platform, arch, version: "1.2.3", size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"), url: `1.2.3/${name}` }));
    await writeFile(installerPath, "#!/bin/bash\nprintf 'Pofis'\n");
    const { manifest } = await prepareSite({ siteDirectory, releaseDirectory, installerPath });
    expect(manifest.url).toBe(`https://github.com/example/pofis-landing/releases/download/v1.2.3/${name}`);
    expect(JSON.parse(await readFile(join(siteDirectory, "public/releases", directory, arch, "latest.json"), "utf8"))).toEqual(manifest);
    expect(await readFile(join(siteDirectory, "public", installerName), "utf8")).toContain("printf 'Pofis'\n");
    expect(await readFile(join(siteDirectory, "public/install.ps1"), "utf8")).toBe("Windows korunur");
  } finally { await rm(root, { recursive: true, force: true }); }
});
