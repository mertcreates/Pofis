import { expect, test } from "bun:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

async function runFixture(source: string, markup: string) {
  const root = resolve(tmpdir());
  const directory = await mkdtemp(join(root, "pofis-plan-client-"));
  try {
    const build = await Bun.build({ entrypoints: [resolve(import.meta.dir, `fixtures/${source}`)],
      target: "browser", outdir: directory, naming: "fixture.[ext]", define: { "process.env.NODE_ENV": '"production"' } });
    expect(build.success, build.logs.toString()).toBe(true);
    const html = join(directory, "index.html");
    await writeFile(html, `<!doctype html><meta charset="utf-8">${markup}<script src="fixture.js"></script>`);
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    const result = await promisify(execFile)(require("electron"), [resolve(import.meta.dir, "fixtures/pdks-lifecycle.cjs"),
      `--user-data-dir=${join(directory, "profile")}`, `--fixture=${html}`], { env, windowsHide: true, timeout: 15000 });
    const line = result.stdout.split(/\r?\n/).find(value => value.startsWith("RESULT:"));
    expect(line, result.stderr).toBeDefined();
    return JSON.parse(line!.slice(7));
  } finally {
    const child = relative(root, directory);
    if (!child || child.startsWith("..") || resolve(root, child) !== directory)
      throw new Error("Invalid fixture directory");
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

test("Electron'da hesap değişimi, pencere eşitlemesi ve kaydetme hatası", async () => {
  expect(await runFixture("desktop-work-plans.tsx", '<div id="root"></div>'))
    .toEqual({ accountSwitch: true, legacyIgnored: true, crossWindow: true,
      failedWrite: true, delayedRead: true, demoIsolated: true, retryRead: true, timeDraftSync: true, timeFailedWrite: true, independentDraft: true });
}, 20000);

test("ana pencere ve Mini plan okuma hatasından yeniden dener", async () => {
  expect(await runFixture("desktop-work-plans-ui.tsx", '<div id="main"></div><div id="mini"></div>'))
    .toEqual({ mainRetry: true, miniRetry: true });
}, 20000);
