const { test, expect } = require("bun:test");
const { execFile, spawn } = require("node:child_process");
const { promisify } = require("node:util");
const { join, resolve } = require("node:path");
const { mkdtemp, mkdir, copyFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { once } = require("node:events");
const execute = promisify(execFile);
// Keep Bun's deadline outside the bounded PowerShell invocation, including cold CI startup.
const windowsTest = (name, body, timeout = 25000) =>
  (process.platform === "win32" ? test : test.skip)(name, body, timeout);
const powershell = join(process.env.SystemRoot || "", "System32/WindowsPowerShell/v1.0/powershell.exe");
const installer = resolve(__dirname, "install.ps1");
const quote = text => "'" + text.replaceAll("'", "''") + "'";
// Load only function declarations: tests never download, install or touch a user profile.
const definitions = `
$ErrorActionPreference='Stop'; Set-StrictMode -Version 2;
$tokens=$null; $errors=$null;
$ast=[Management.Automation.Language.Parser]::ParseFile(${quote(installer)}, [ref]$tokens, [ref]$errors);
if ($errors.Count) { throw ($errors | Out-String) }
foreach ($statement in $ast.EndBlock.Statements) {
  if ($statement -is [Management.Automation.Language.FunctionDefinitionAst]) {
    . ([scriptblock]::Create($statement.Extent.Text))
  }
}
function Assert($Value) { if (-not $Value) { throw 'assertion failed' } }
`;
const run = (code, timeout = 15000) => execute(powershell, ["-NoProfile", "-NonInteractive", "-Command", definitions + code],
  { timeout, windowsHide: true });
const fixture = `
$script:running=$true; $script:closed=0; $script:killed=0; $script:prompts=0;
$script:owned=[pscustomobject]@{ HasExited=$false; MainWindowHandle=1 };
$script:owned | Add-Member ScriptMethod CloseMainWindow { $script:closed++; $script:running=$false; return $true };
$script:owned | Add-Member ScriptMethod Kill { $script:killed++; $script:running=$false };
function Get-InstalledProcess { if ($script:running) { $script:owned } }
function Wait-PofisClosed { return (-not $script:running) }
`;

windowsTest("Windows açık uygulamada yanıtsız çalıştırma onay varsaymaz", async () => {
  const error = await run(fixture + 'Close-PofisForUpdate').then(() => null, error => error);
  expect(error?.code).not.toBe(0);
  // PowerShell 5.1 output encoding varies with the runner's code page.
  expect(error?.stderr).toContain("Pofis");
});

windowsTest("Windows yalnız açık onay kabul eder; boş veya hayır yanıtı reddedilir", async () => {
  await run(`
foreach ($reply in @('', 'h', 'hayır', 'yes', 'evet ekstra')) {
  $script:reply=$reply; function Read-Host { return $script:reply }
  Assert (-not (Confirm-PofisClose 'test'))
}
foreach ($reply in @('e', 'E', 'evet', 'EVET')) {
  $script:reply=$reply; Assert (Confirm-PofisClose 'test')
}`);
});

windowsTest("Windows ilk onay iptalinde kapanış veya kill yapılmaz", async () => {
  await run(fixture + `
function Read-Host { $script:prompts++; return 'h' }
try { Close-PofisForUpdate; throw 'unexpected success' } catch { Assert ($_.Exception.Message -like '*iptal*') }
Assert ($script:running -and $script:closed -eq 0 -and $script:killed -eq 0 -and $script:prompts -eq 1);
`);
});

windowsTest("Windows normal kapanıştan sonra zorla kapatma sorulmaz", async () => {
  await run(fixture + `
function Read-Host { $script:prompts++; return 'e' }
Close-PofisForUpdate;
Assert (-not $script:running -and $script:closed -eq 1 -and $script:killed -eq 0 -and $script:prompts -eq 1);
`);
});

windowsTest("Windows ikinci onay reddinde takılı süreç zorla kapatılmaz", async () => {
  await run(fixture + `
$script:owned | Add-Member ScriptMethod CloseMainWindow { $script:closed++; return $false } -Force;
function Read-Host { $script:prompts++; if ($script:prompts -eq 1) { return 'e' }; return 'h' }
try { Close-PofisForUpdate; throw 'unexpected success' } catch { Assert ($_.Exception.Message -like '*iptal*') }
Assert ($script:running -and $script:closed -eq 1 -and $script:killed -eq 0 -and $script:prompts -eq 2);
`);
});

windowsTest("Windows zorla kapatma iki onaydan sonra çalışır; bitmeyen süreç başarı sayılmaz", async () => {
  await run(fixture + `
$script:owned | Add-Member ScriptMethod CloseMainWindow { return $false } -Force;
function Read-Host { $script:prompts++; return 'e' }
Close-PofisForUpdate;
Assert (-not $script:running -and $script:killed -eq 1 -and $script:prompts -eq 2);
$script:running=$true;
$script:owned | Add-Member ScriptMethod Kill { $script:killed++ } -Force;
try { Close-PofisForUpdate; throw 'unexpected success' } catch { Assert ($_.Exception.Message -like '*kapanmadı*') }
Assert $script:running;
`);
});

windowsTest("Windows kapalı uygulamada soru sorulmaz; yalnız kurulum kökündeki süreçler seçilir", async () => {
  await run(`
$InstallRoot='C:\\fixture\\Pofis';
function Get-Process { @(
  [pscustomobject]@{ Id=1; Path='C:\\fixture\\Pofis\\versions\\abc\\Pofis.exe' },
  [pscustomobject]@{ Id=2; Path='C:\\fixture\\Pofis-other\\versions\\abc\\Pofis.exe' },
  [pscustomobject]@{ Id=3; Path='C:\\other\\electron.exe' }
) }
$selected=@(Get-InstalledProcess); Assert ($selected.Count -eq 1 -and $selected[0].Id -eq 1);
function Get-InstalledProcess { @() }
function Read-Host { throw 'must not ask' }
Close-PofisForUpdate; Assert (Wait-PofisClosed);
`);
});

windowsTest("Windows gerçek zorla kapatma yalnız izole kurulum sürecini durdurur", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-close-"));
  const root = join(directory, "installed");
  const version = join(root, "versions", "a".repeat(32));
  const children = [];
  try {
    await mkdir(version, { recursive: true });
    const executable = join(version, "Pofis.exe");
    await copyFile(process.execPath, executable);
    const start = async file => {
      const child = spawn(file, ["-e", "console.log('ready'); setInterval(() => {}, 1000)"],
        { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      children.push(child);
      await new Promise((done, fail) => {
        let output = "", diagnostic = "";
        const finish = error => {
          clearTimeout(timer);
          child.stdout.off("data", onData);
          child.stderr.off("data", onErrorOutput);
          child.off("error", onError);
          child.off("exit", onExit);
          if (error) fail(error); else done();
        };
        const onData = data => { output += data; if (output.includes("ready")) finish(); };
        const onErrorOutput = data => { diagnostic += data; };
        const onError = error => finish(error);
        const onExit = (code, signal) => finish(new Error(`Fixture hazır olmadan kapandı (${code ?? signal}): ${diagnostic}`));
        const timer = setTimeout(() => finish(new Error(`Fixture 15 saniyede hazır olmadı: ${diagnostic}`)), 15000);
        child.stdout.on("data", onData);
        child.stderr.on("data", onErrorOutput);
        child.once("error", onError);
        child.once("exit", onExit);
      });
      return child;
    };
    await start(executable);
    const foreign = await start(process.execPath);
    await run(`
$InstallRoot=${quote(root)}; $script:prompts=0;
function Read-Host { $script:prompts++; return 'e' }
Close-PofisForUpdate;
Assert ($script:prompts -eq 2);
Assert (@(Get-InstalledProcess).Count -eq 0);
Assert ($null -ne (Get-Process -Id ${foreign.pid}));
`, 40000);
    expect(foreign.exitCode).toBeNull();
  } finally {
    for (const child of children) {
      if (child.pid && child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit"); child.kill(); await exited;
      }
    }
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}, 80000);
