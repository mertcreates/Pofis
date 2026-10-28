import { expect, test } from "bun:test";
import { execFile } from "node:child_process";
import { mkdtemp, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

test("gerçek Electron'da hatırla, geçici giriş hatası, arka plan yenileme, yeniden açılış, parola hatası ve çıkış", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-remember-electron-"));
  try {
    const build = await Bun.build({ entrypoints: [resolve(import.meta.dir, "fixtures/remembered-electron.tsx")],
      target: "browser", outdir: directory, naming: "fixture.js", define: { "process.env.NODE_ENV": '"production"' } });
    expect(build.success, build.logs.toString()).toBe(true);
    await require("../../scripts/electron/build-notifications.cjs").buildNotifications(directory);
    await Promise.all(["globals.css", "pofis.css"].map(file => copyFile(resolve(import.meta.dir, "../app", file), join(directory, file))));
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    const args = [resolve(import.meta.dir, "fixtures/remembered-electron.cjs"), `--fixture=${directory}`,
      `--profile=${join(directory, "profile")}`];
    const first = await promisify(execFile)(require("electron"), [...args, "--stage=first",
      ...(process.env.POFIS_REMEMBER_SCREENSHOT ? [`--screenshot=${process.env.POFIS_REMEMBER_SCREENSHOT}`] : [])],
    { env, windowsHide: true, timeout: 30000 });
    const firstLine = first.stdout.split(/\r?\n/).find(line => line.startsWith("RESULT:"));
    expect(firstLine, first.stderr).toBeDefined();
    expect(JSON.parse(firstLine!.slice(7))).toEqual({ stage: "first", logins: 5, connected: true });
    const second = await promisify(execFile)(require("electron"), [...args, "--stage=second"],
      { env, windowsHide: true, timeout: 30000 });
    const secondLine = second.stdout.split(/\r?\n/).find(line => line.startsWith("RESULT:"));
    expect(secondLine, second.stderr).toBeDefined();
    expect(JSON.parse(secondLine!.slice(7))).toEqual({ stage: "second", logins: 2, connected: false });
  } finally { await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
}, 70000);
