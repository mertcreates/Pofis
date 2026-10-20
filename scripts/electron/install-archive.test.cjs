const { test, expect } = require("bun:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const quote = text => `'${text.replaceAll("'", "''")}'`;

(process.platform === "win32" ? test : test.skip)("Windows arşivi iki açıcıyla doğrular; dış yol, bağlantı ve yinelenen dosyayı yazmadan reddeder", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-archive-"));
  try {
    const { stdout } = await promisify(execFile)(join(process.env.SystemRoot, "System32/WindowsPowerShell/v1.0/powershell.exe"),
      ["-NoProfile", "-NonInteractive", "-Command", `
        $ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; Add-Type -AssemblyName System.IO.Compression;
        $tokens=$null; $errors=$null;
        $ast=[Management.Automation.Language.Parser]::ParseFile(${quote(join(__dirname, "install.ps1"))}, [ref]$tokens, [ref]$errors);
        if ($errors.Count) { throw ($errors | Out-String) }
        $definition=$ast.EndBlock.Statements | Where-Object { $_ -is [Management.Automation.Language.FunctionDefinitionAst] -and $_.Name -eq 'Expand-VerifiedArchive' };
        . ([scriptblock]::Create($definition.Extent.Text));
        $directory=${quote(directory)}; $realSystemRoot=$env:SystemRoot;
        function Make-Zip($Name, $Entries, $Link=$false) {
          $path=Join-Path $directory ($Name+'.zip');
          $zip=[IO.Compression.ZipFile]::Open($path, [IO.Compression.ZipArchiveMode]::Create);
          try { foreach ($name in $Entries) {
            $entry=$zip.CreateEntry($name);
            if ($Link) { $entry.ExternalAttributes=-1577058304 }
            $writer=[IO.StreamWriter]::new($entry.Open());
            $writer.Write('fixture'); $writer.Dispose();
          } } finally { $zip.Dispose() }
          return $path
        }
        $valid=Make-Zip 'valid' @('nested/file.txt', 'backslash\\file.txt');
        foreach ($mode in @('native','dotnet')) {
          $env:SystemRoot=if ($mode -eq 'native') { $realSystemRoot } else { $directory };
          $destination=Join-Path $directory $mode;
          [IO.Directory]::CreateDirectory($destination) | Out-Null;
          Expand-VerifiedArchive $valid $destination;
          foreach ($file in @('nested/file.txt','backslash/file.txt')) {
            if ([IO.File]::ReadAllText((Join-Path $destination $file)) -ne 'fixture') { throw 'content differs' }
          }
          $denied=$false;
          try { Expand-VerifiedArchive $valid $destination } catch { $denied=$true }
          if (-not $denied) { throw 'existing file overwritten' }
          foreach ($scenario in @(
            @{Name='parent'; Entries=@('safe.txt','../outside.txt')},
            @{Name='absolute'; Entries=@('safe.txt','C:/outside.txt')},
            @{Name='stream'; Entries=@('safe.txt','file:stream')},
            @{Name='duplicate'; Entries=@('nested/file.txt','nested/FILE.txt')},
            @{Name='link'; Entries=@('link'); Link=$true}
          )) {
            $archive=Make-Zip ($mode+$scenario.Name) $scenario.Entries ($scenario.Link -eq $true);
            $output=Join-Path $directory ($mode+$scenario.Name);
            [IO.Directory]::CreateDirectory($output) | Out-Null;
            $denied=$false;
            try { Expand-VerifiedArchive $archive $output } catch { $denied=$true }
            if (-not $denied -or @(Get-ChildItem -LiteralPath $output -Recurse).Count -ne 0) { throw ('unsafe archive accepted: '+$scenario.Name) }
          }
        }
        if (Test-Path -LiteralPath (Join-Path $directory 'outside.txt')) { throw 'outside file written' }
        Write-Output 'PASS both extractors and archive boundaries';
      `], { windowsHide: true, timeout: 20000 });
    expect(stdout).toContain("PASS both extractors and archive boundaries");
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 25000);
