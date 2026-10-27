import { expect, test } from "bun:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

test("gerçek React/Electron yaşamı: rapor yarışı, tekrar açılış, oturum ve dinleyici temizliği", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-pdks-lifecycle-"));
  try {
    const build = await Bun.build({ entrypoints: [resolve(import.meta.dir, "fixtures/pdks-lifecycle.tsx")],
      target: "browser", outdir: directory, naming: "fixture.js", define: { "process.env.NODE_ENV": '"production"' } });
    expect(build.success, build.logs.toString()).toBe(true);
    const html = join(directory, "index.html");
    await writeFile(html, '<!doctype html><div id="root"></div><script src="fixture.js"></script>');
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    const result = await promisify(execFile)(require("electron"), [resolve(import.meta.dir, "fixtures/pdks-lifecycle.cjs"),
      `--user-data-dir=${join(directory, "profile")}`, `--fixture=${html}`], { env, windowsHide: true, timeout: 15000 });
    const line = result.stdout.split(/\r?\n/).find(value => value.startsWith("RESULT:"));
    expect(line, result.stderr).toBeDefined();
    expect(JSON.parse(line!.slice(7))).toEqual({ reportRace: true, olderPush: true, backgroundFailureRecovery: true,
      revalidateOnShow: true, weekChange: true, accountSwitch: true, lateExpiry: true, cleanup: true, redundantRefreshes: 0,
      hiddenPreload: true, sharedRequests: true, lateSession: true, connectDisconnect: true });
  } finally { await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
}, 20000);
