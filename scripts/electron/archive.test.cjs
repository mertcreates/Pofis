const { test, expect } = require("bun:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, mkdir, writeFile, readFile, rm, readdir } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const execute = promisify(execFile);
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const windowsTest = process.platform === "win32" ? test : test.skip;

windowsTest.each(["native", "dotnet"])("%s ZIP partial uzantısını, Unicode içeriği ve mevcut hedefi korur", async mode => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-archive-writer-"));
  const source = join(directory, "source with spaces");
  const archive = join(directory, "release.zip.partial");
  const extracted = join(directory, "extracted");
  const payload = "Türkçe içerik: ğüşiöç\n";
  try {
    await mkdir(join(source, "empty directory"), { recursive: true });
    await writeFile(join(source, "boşluk ve Türkçe.txt"), payload);
    await writeFile(join(source, ".hidden"), "hidden");
    const powershell = join(process.env.SystemRoot, "System32/WindowsPowerShell/v1.0/powershell.exe");
    await execute(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", `
      $ErrorActionPreference='Stop';
      ${mode === "dotnet" ? `$env:SystemRoot=${quote(directory)};` : ""}
      & ${quote(join(__dirname, "archive.ps1"))} -Source ${quote(source)} -Destination ${quote(archive)};
      $denied=$false;
      try { & ${quote(join(__dirname, "archive.ps1"))} -Source ${quote(source)} -Destination ${quote(archive)} } catch { $denied=$true }
      if (-not $denied) { throw 'Existing ZIP was overwritten' }
      # An independent reader prevents a shared code page from hiding broken names.
      Add-Type -AssemblyName System.IO.Compression.FileSystem;
      [IO.Compression.ZipFile]::ExtractToDirectory(${quote(archive)}, ${quote(extracted)});
    `], { windowsHide: true, timeout: 15000 });
    expect(await readFile(join(extracted, "boşluk ve Türkçe.txt"), "utf8")).toBe(payload);
    expect(await readFile(join(extracted, ".hidden"), "utf8")).toBe("hidden");
    expect(await readdir(join(extracted, "empty directory"))).toEqual([]);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 25000);
