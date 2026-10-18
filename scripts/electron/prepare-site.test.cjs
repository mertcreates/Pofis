const { test, expect } = require("bun:test");
const { mkdtemp, mkdir, writeFile, readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { createHash } = require("node:crypto");
const { prepareSite } = require("./prepare-site.cjs");

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

for (const arch of ["arm64", "x64"]) test(`macOS ${arch}: ortak installer ve doğru manifest yolu aktarılır`, async () => {
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
    const name = `Pofis-1.2.3-darwin-${arch}.zip`;
    await writeFile(join(releaseDirectory, "1.2.3", name), bytes);
    await writeFile(join(releaseDirectory, "latest.json"), JSON.stringify({ schemaVersion: 1,
      platform: "darwin", arch, version: "1.2.3", size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"), url: `1.2.3/${name}` }));
    await writeFile(installerPath, "#!/bin/bash\nprintf 'Pofis'\n");
    const { manifest } = await prepareSite({ siteDirectory, releaseDirectory, installerPath });
    expect(manifest.url).toBe(`https://github.com/example/pofis-landing/releases/download/v1.2.3/${name}`);
    expect(JSON.parse(await readFile(join(siteDirectory, "public/releases/macos", arch, "latest.json"), "utf8"))).toEqual(manifest);
    expect(await readFile(join(siteDirectory, "public/install.sh"), "utf8")).toBe("#!/bin/bash\nprintf 'Pofis'\n");
    expect(await readFile(join(siteDirectory, "public/install.ps1"), "utf8")).toBe("Windows korunur");
  } finally { await rm(root, { recursive: true, force: true }); }
});
