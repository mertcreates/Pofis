const { test, expect } = require("bun:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const execute = promisify(execFile);
const windowsTest = process.platform === "win32" ? test.concurrent : test.skip;
const quote = text => "'" + text.replaceAll("'", "''") + "'";
const helper = resolve(__dirname, "../../electron/uninstall.ps1");
const powershell = join(process.env.SystemRoot || "", "System32/WindowsPowerShell/v1.0/powershell.exe");
const run = script => execute(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command",
  "$ErrorActionPreference='Stop'; . " + quote(helper) + "; " + script], { timeout: 15000, windowsHide: true });
// Allow two bounded PowerShell invocations plus fixture setup/cleanup on Windows runners.
const testTimeout = 40000;

windowsTest("sürüm temizliği yalnız etkin sürümü bırakır; kullanıcı verilerine dokunmaz", async () => {
  const temp = await mkdtemp(join(tmpdir(), "pofis-cleanup-"));
  const root = join(temp, "installed");
  const keep = "a".repeat(32), old = "b".repeat(32);
  try {
    for (const name of [keep, old]) {
      await mkdir(join(root, "versions", name), { recursive: true });
      await writeFile(join(root, "versions", name, "runtime.txt"), name);
    }
    const profile = join(temp, "profile.txt");
    await writeFile(profile, "session");
    await run(`Remove-PofisVersions ${quote(root)} ${quote(keep)}`);
    expect(await readdir(join(root, "versions"))).toEqual([keep]);
    expect(await readFile(profile, "utf8")).toBe("session");
  } finally { await rm(temp, { recursive: true, force: true }); }
}, testTimeout);

windowsTest("sürüm temizliği dışarı yönlenen junction ve bilinmeyen klasörü silmez", async () => {
  const temp = await mkdtemp(join(tmpdir(), "pofis-cleanup-"));
  const root = join(temp, "installed");
  const outside = join(temp, "outside");
  try {
    await mkdir(join(root, "versions"), { recursive: true });
    await mkdir(outside);
    await writeFile(join(outside, "keep.txt"), "keep");
    const candidate = join(root, "versions", "c".repeat(32));
    await symlink(outside, candidate, "junction");
    await expect(run(`Remove-PofisVersions ${quote(root)} ''`)).rejects.toThrow("Kurulum dizini");
    expect(await readFile(join(outside, "keep.txt"), "utf8")).toBe("keep");
    await rm(candidate);
    await mkdir(join(root, "versions", "unknown"));
    await expect(run(`Remove-PofisVersions ${quote(root)} ''`)).rejects.toThrow("beklenmeyen dosya");
    expect(await readdir(join(root, "versions"))).toEqual(["unknown"]);
  } finally { await rm(temp, { recursive: true, force: true }); }
}, testTimeout);

windowsTest("kaldırıcı değiştirilmiş kısayolu görünce uygulama dosyalarını silmez", async () => {
  const temp = await mkdtemp(join(tmpdir(), "pofis-uninstall-"));
  const root = join(temp, "installed");
  const shortcut = join(temp, "Pofis.lnk");
  const version = "d".repeat(32);
  try {
    await mkdir(join(root, "versions", version), { recursive: true });
    const marker = join(root, "versions", version, "keep.txt");
    await writeFile(marker, "keep");
    await writeFile(join(root, "installed.json"), JSON.stringify({ schemaVersion: 1,
      installRoot: root, shortcutPath: shortcut,
      registryPath: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Pofis-' + version }));
    await run(`$shell=New-Object -ComObject WScript.Shell; $link=$shell.CreateShortcut(${quote(shortcut)}); $link.TargetPath=$PSHOME+'\\powershell.exe'; $link.Save(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell)`);
    await expect(run(`Uninstall-Pofis ${quote(root)} -Confirmed`)).rejects.toThrow("bir uygulamaya ait");
    expect(await readFile(marker, "utf8")).toBe("keep");
  } finally { await rm(temp, { recursive: true, force: true }); }
}, testTimeout);
