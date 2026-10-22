const { test, expect } = require("bun:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, mkdir, writeFile, readFile, rm, readdir } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { createHash } = require("node:crypto");
const execute = promisify(execFile);
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const windowsTest = process.platform === "win32" ? test : test.skip;

windowsTest.each(["native", "dotnet"])("%s ZIP partial uzantısıyla açılır; sürüm fixture'ları içerik ve hash'i korur", async mode => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-archive-writer-"));
  const source = join(directory, "source with spaces");
  const archive = join(directory, "release.zip.partial");
  const extracted = join(directory, "extracted");
  const variants = join(directory, "variants");
  const payload = "Türkçe içerik: ğüşiöç\n";
  try {
    for (const path of ["resources/app/electron", "empty directory"]) await mkdir(join(source, path), { recursive: true });
    await mkdir(variants);
    await mkdir(extracted);
    await writeFile(join(source, "resources/app/package.json"), JSON.stringify({ version: "1.2.3" }));
    await writeFile(join(source, "release.json"), JSON.stringify({ schemaVersion: 1, version: "1.2.3", platform: "win32", arch: "x64" }));
    await writeFile(join(source, "resources/app/electron/server-entry.cjs"), "original server");
    await writeFile(join(source, "resources/app/boşluk ve Türkçe.txt"), payload);
    await writeFile(join(source, ".hidden"), "hidden");
    const powershell = join(process.env.SystemRoot, "System32/WindowsPowerShell/v1.0/powershell.exe");
    const { stdout } = await execute(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", `
      $ErrorActionPreference='Stop';
      [Console]::OutputEncoding=[Text.UTF8Encoding]::new();
      $realSystemRoot=$env:SystemRoot;
      ${mode === "dotnet" ? `$env:SystemRoot=${quote(directory)};` : ""}
      & ${quote(join(__dirname, "archive.ps1"))} -Source ${quote(source)} -Destination ${quote(archive)};
      $denied=$false;
      try { & ${quote(join(__dirname, "archive.ps1"))} -Source ${quote(source)} -Destination ${quote(archive)} } catch { $denied=$true }
      if (-not $denied) { throw 'Existing ZIP was overwritten' }
      Add-Type -AssemblyName System.IO.Compression.FileSystem;
      $tokens=$null; $errors=$null;
      $ast=[Management.Automation.Language.Parser]::ParseFile(${quote(join(__dirname, "install.ps1"))}, [ref]$tokens, [ref]$errors);
      $definition=$ast.EndBlock.Statements | Where-Object { $_ -is [Management.Automation.Language.FunctionDefinitionAst] -and $_.Name -eq 'Expand-VerifiedArchive' };
      . ([scriptblock]::Create($definition.Extent.Text));
      Expand-VerifiedArchive ${quote(archive)} ${quote(extracted)};
      $env:SystemRoot=$realSystemRoot;
      & ${quote(join(__dirname, "fixtures/release-variants.ps1"))} -SourceArchive ${quote(archive)} -OutputDirectory ${quote(variants)} -BaseVersion '1.2.3';
      foreach ($version in @('1.2.4','1.2.5','1.2.6')) {
        $zip=[IO.Compression.ZipFile]::OpenRead((Join-Path ${quote(variants)} ($version+'.zip')));
        try {
          $result=@{};
          foreach ($name in @('resources/app/package.json','release.json','resources/app/electron/server-entry.cjs')) {
            $entry=$zip.GetEntry($name); if (-not $entry) { $entry=$zip.GetEntry($name.Replace('/',[char]92)) }
            $reader=[IO.StreamReader]::new($entry.Open()); try { $result[$name]=$reader.ReadToEnd() } finally { $reader.Dispose() }
          }
          $result.version=$version; $result | ConvertTo-Json -Compress;
        } finally { $zip.Dispose() }
      }
    `], { windowsHide: true, timeout: 15000, env: { ...process.env,
      PSModulePath: join(process.env.SystemRoot, "System32/WindowsPowerShell/v1.0/Modules") } });
    expect(await readFile(join(extracted, "resources/app/boşluk ve Türkçe.txt"), "utf8")).toBe(payload);
    expect(await readFile(join(extracted, ".hidden"), "utf8")).toBe("hidden");
    expect(await readdir(join(extracted, "empty directory"))).toEqual([]);
    // The native writer must be portable across Windows code pages, not just round-trip locally.
    const bytes = await readFile(archive);
    const name = Buffer.from("resources/app/boşluk ve Türkçe.txt", "utf8");
    let unicodeEntry = false;
    for (let offset = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])); offset !== -1;
      offset = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), offset + 4)) {
      const length = bytes.readUInt16LE(offset + 28);
      const entry = bytes.subarray(offset + 46, offset + 46 + length);
      if (entry.equals(name) || entry.equals(Buffer.from(name.toString().replaceAll("/", "\\")))) {
        expect(bytes.readUInt16LE(offset + 8) & 0x800).toBe(0x800);
        unicodeEntry = true;
      }
    }
    expect(unicodeEntry).toBe(true);
    const results = stdout.trim().split(/\r?\n/).map(line => JSON.parse(line));
    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(JSON.parse(result["resources/app/package.json"]).version).toBe(result.version);
      expect(JSON.parse(result["release.json"]).version).toBe(result.version);
      expect(result["resources/app/electron/server-entry.cjs"]).toBe(result.version === "1.2.5" ? "process.exit(42);" : "original server");
      const bytes = await readFile(join(variants, `${result.version}.zip`));
      const manifest = JSON.parse((await readFile(join(variants, `${result.version}.json`), "utf8")).replace(/^\uFEFF/, ""));
      expect(manifest.size).toBe(bytes.length);
      expect(manifest.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
    }
    expect(JSON.parse(await readFile(join(source, "resources/app/package.json"), "utf8")).version).toBe("1.2.3");
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 25000);
