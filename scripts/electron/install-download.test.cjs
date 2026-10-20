const { test, expect } = require("bun:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

(process.platform === "win32" ? test : test.skip)("Windows indirmesi yönlendirmeyi izleyip baytları korur; HTTP hatası ve mevcut dosya reddedilir", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-download-"));
  const bytes = Buffer.alloc(1024 * 1024, 0x91);
  const host = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/redirect") return new Response(null, { status: 302, headers: { Location: "/package.zip" } });
    return path === "/package.zip" ? new Response(bytes) : new Response("missing", { status: 404 });
  } });
  const quote = text => "'" + text.replaceAll("'", "''") + "'";
  const base = `http://127.0.0.1:${host.port}`;
  const target = join(directory, "download.zip");
  try {
    await promisify(execFile)(join(process.env.SystemRoot, "System32/WindowsPowerShell/v1.0/powershell.exe"), ["-NoProfile", "-Command", `
      $ErrorActionPreference='Stop'; $tokens=$null; $errors=$null;
      $ast=[Management.Automation.Language.Parser]::ParseFile(${quote(join(__dirname, "install.ps1"))}, [ref]$tokens, [ref]$errors);
      if ($errors.Count) { throw ($errors | Out-String) }
      foreach ($statement in $ast.EndBlock.Statements) {
        if ($statement -is [Management.Automation.Language.FunctionDefinitionAst]) { . ([scriptblock]::Create($statement.Extent.Text)) }
      }
      Save-Download ([Uri]${quote(base + "/redirect")}) ${quote(target)};
      try { Save-Download ([Uri]${quote(base + "/package.zip")}) ${quote(target)}; throw 'existing file overwritten' }
      catch { if ($_.Exception.Message -notlike 'İndirme tamamlanamadı:*') { throw } }
      try { Save-Download ([Uri]${quote(base + "/missing")}) ${quote(join(directory, "missing.zip"))}; throw 'HTTP error accepted' }
      catch { if ($_.Exception.Message -notlike 'İndirme tamamlanamadı:*') { throw } }
      if (Test-Path -LiteralPath ${quote(join(directory, "missing.zip"))}) { throw 'HTTP error created a file' }
    `], { windowsHide: true, timeout: 15000 });
    expect(await readFile(target)).toEqual(bytes);
  } finally { host.stop(true); await rm(directory, { recursive: true, force: true }); }
}, 20000);
