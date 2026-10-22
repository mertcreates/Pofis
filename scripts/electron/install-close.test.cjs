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
  (process.platform === "win32" ? test.concurrent : test.skip)(name, body, timeout);
const powershell = join(process.env.SystemRoot || "", "System32/WindowsPowerShell/v1.0/powershell.exe");
const installer = resolve(__dirname, "install.ps1");
const quote = text => "'" + text.replaceAll("'", "''") + "'";
// Load only function declarations: tests never download, install or touch a user profile.
const definitions = `
$ErrorActionPreference='Stop'; Set-StrictMode -Version 2;
[Console]::OutputEncoding=[Text.UTF8Encoding]::new();
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

windowsTest("Windows kapanış onayları, iptal ve sahiplik senaryoları ayrı kapsamlarda doğrulanır", async () => {
  const scenarios = [
    ["yanıtsız çalıştırma", fixture + `
$denied=$false;
try { Close-PofisForUpdate } catch { Assert ($_.Exception.Message -like '*Pofis*'); $denied=$true }
Assert ($denied -and $script:running -and $script:closed -eq 0 -and $script:killed -eq 0);
`],
    ["açık onay yanıtları", `
foreach ($reply in @('', 'h', 'hayır', 'yes', 'evet ekstra')) {
  $script:reply=$reply; function Read-Host { return $script:reply }
  Assert (-not (Confirm-PofisClose 'test'))
}
foreach ($reply in @('e', 'E', 'evet', 'EVET')) {
  $script:reply=$reply; Assert (Confirm-PofisClose 'test')
}`],
    ["ilk onay iptali", fixture + `
function Read-Host { $script:prompts++; return 'h' }
try { Close-PofisForUpdate; throw 'unexpected success' } catch { Assert ($_.Exception.Message -like '*iptal*') }
Assert ($script:running -and $script:closed -eq 0 -and $script:killed -eq 0 -and $script:prompts -eq 1);
`],
    ["normal kapanış", fixture + `
function Read-Host { $script:prompts++; return 'e' }
Close-PofisForUpdate;
Assert (-not $script:running -and $script:closed -eq 1 -and $script:killed -eq 0 -and $script:prompts -eq 1);
`],
    ["gizli uygulamadan gerçek çıkış isteği", fixture + `
$UserDataDir='C:\\fixture\\profile'; $script:launches=0;
$script:owned.MainWindowHandle=0;
$script:owned | Add-Member NoteProperty Path 'C:\\fixture\\Pofis\\versions\\abc\\Pofis.exe';
$helper=[pscustomobject]@{ HasExited=$false; MainWindowHandle=0; Path='C:\\fixture\\Pofis\\versions\\abc\\crashpad_handler.exe' };
function Test-Path { return $true }
function Get-InstalledProcess { if ($script:running) { @($script:owned, $script:owned, $helper) } }
function Read-Host { return 'e' }
function Start-Process {
  param($FilePath, $WindowStyle, $ArgumentList, [switch]$PassThru)
  Assert ($FilePath -eq $script:owned.Path -and $WindowStyle -eq 'Hidden');
  Assert ($ArgumentList[0] -eq '--pofis-quit' -and $ArgumentList[1] -eq ('--user-data-dir="' + $UserDataDir + '"'));
  $script:launches++; $script:running=$false;
}
Close-PofisForUpdate;
Assert ($script:launches -eq 1 -and $script:closed -eq 0 -and $script:killed -eq 0);
`],
    ["zorla kapatma iptali", fixture + `
$script:owned | Add-Member ScriptMethod CloseMainWindow { $script:closed++; return $false } -Force;
function Read-Host { $script:prompts++; if ($script:prompts -eq 1) { return 'e' }; return 'h' }
try { Close-PofisForUpdate; throw 'unexpected success' } catch { Assert ($_.Exception.Message -like '*iptal*') }
Assert ($script:running -and $script:closed -eq 1 -and $script:killed -eq 0 -and $script:prompts -eq 2);
`],
    ["iki onay ve bitmeyen süreç", fixture + `
$script:owned | Add-Member ScriptMethod CloseMainWindow { return $false } -Force;
function Read-Host { $script:prompts++; return 'e' }
Close-PofisForUpdate;
Assert (-not $script:running -and $script:killed -eq 1 -and $script:prompts -eq 2);
$script:running=$true;
$script:owned | Add-Member ScriptMethod Kill { $script:killed++ } -Force;
try { Close-PofisForUpdate; throw 'unexpected success' } catch { Assert ($_.Exception.Message -like '*kapanmadı*') }
Assert $script:running;
`],
    ["kapalı uygulama ve sahiplik", `
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
`],
  ];
  // Each child scope gets fresh function definitions and fixture state, sharing one PowerShell startup.
  const { stdout } = await run(scenarios.map(([name, code]) =>
    `& { ${definitions}\n${code}\nWrite-Output ${quote(`PASS ${name}`)} }`).join("\n"));
  for (const [name] of scenarios) expect(stdout).toContain(`PASS ${name}`);
});

windowsTest("Windows kısayolu native bildirim için Pofis uygulama kimliğini taşır", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-shortcut-"));
  try {
    await run(`
$ShortcutPath=${quote(join(directory, "Pofis.lnk"))}; $UserDataDir=${quote(join(directory, "profile"))};
Set-PofisShortcut ${quote(process.execPath)};
$shell=New-Object -ComObject Shell.Application;
try {
  $item=$shell.NameSpace(${quote(directory)}).ParseName('Pofis.lnk');
  Assert ($item.ExtendedProperty('System.AppUserModel.ID') -eq 'app.pofis.client');
} finally { [Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null }
`);
  } finally { await rm(directory, { recursive: true, force: true }); }
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
$InstallRoot=${quote(root)}; $UserDataDir=${quote(join(directory, "profile"))}; $script:prompts=0;
function Start-Process { }
function Read-Host { $script:prompts++; return 'e' }
# The fixture has no window: go directly to force-close consent, then use the real process-exit wait.
$script:waits=0; $realWait=(Get-Item Function:Wait-PofisClosed).ScriptBlock;
function Wait-PofisClosed {
    $script:waits++;
    if ($script:waits -eq 1) { return $false }
    & $realWait
}
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
