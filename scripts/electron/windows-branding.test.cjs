const { test, expect } = require("bun:test");
const { mkdtemp, copyFile, rm } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { prepareIcons } = require("./icons.cjs");
const execute = promisify(execFile);
const quote = value => "'" + value.replaceAll("'", "''") + "'";

(process.platform === "win32" ? test : test.skip)("Windows paketi Pofis adı ve ikonunu taşır; Electron motor sürümü korunur", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-branding-"));
  try {
    const executable = join(directory, "Pofis.exe");
    const original = resolve("node_modules/electron/dist/electron.exe");
    await copyFile(original, executable);
    const icons = await prepareIcons(resolve("public/pofi/pofi-mark-256.png"), directory);
    const { stdout } = await execute(join(process.env.SystemRoot, "System32/WindowsPowerShell/v1.0/powershell.exe"),
      ["-NoProfile", "-Command", `$ErrorActionPreference='Stop';
$before=(Get-Item -LiteralPath ${quote(original)}).VersionInfo;
& ([scriptblock]::Create([IO.File]::ReadAllText(${quote(resolve("scripts/electron/set-windows-icon.ps1"))}))) -Executable ${quote(executable)} -Icon ${quote(icons.windows)};
$after=[Diagnostics.FileVersionInfo]::GetVersionInfo(${quote(executable)});
Add-Type -AssemblyName System.Drawing;
$originalIcon=[Drawing.Icon]::ExtractAssociatedIcon(${quote(original)}).ToBitmap();
$brandedIcon=[Drawing.Icon]::ExtractAssociatedIcon(${quote(executable)}).ToBitmap();
$different=$false;
for($x=0;$x -lt $brandedIcon.Width;$x++) { for($y=0;$y -lt $brandedIcon.Height;$y++) {
 if($originalIcon.GetPixel($x,$y) -ne $brandedIcon.GetPixel($x,$y)) { $different=$true }
} }
@{ name=$after.ProductName; description=$after.FileDescription; original=$after.OriginalFilename;
 runtimePreserved=($before.FileVersion -eq $after.FileVersion -and $before.ProductVersion -eq $after.ProductVersion);
 iconChanged=$different } | ConvertTo-Json -Compress`], { windowsHide: true, timeout: 20000 });
    expect(JSON.parse(stdout.trim())).toEqual({ name: "Pofis", description: "Pofis", original: "Pofis.exe", runtimePreserved: true, iconChanged: true });
  } finally {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}, 30000);
