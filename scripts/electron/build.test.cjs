const { test, expect } = require("bun:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, mkdir, copyFile, writeFile, readFile, readdir, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

test("standalone build aynı Bun mimarisini korur ve eski çıktıyı temizleyerek dosyaları taşır", async () => {
  const root = await mkdtemp(join(tmpdir(), "pofis-standalone-"));
  try {
    for (const folder of ["scripts/electron", "node_modules/next/dist/bin", "public", ".next/standalone", "src/lib", "electron"]) {
      await mkdir(join(root, folder), { recursive: true });
    }
    await copyFile(join(__dirname, "build.cjs"), join(root, "scripts/electron/build.cjs"));
    await copyFile(join(__dirname, "build-notifications.cjs"), join(root, "scripts/electron/build-notifications.cjs"));
    await mkdir(join(root, "src/desktop"), { recursive: true });
    await writeFile(join(root, "src/desktop/install-notifications.ts"), "export const installDesktopNotifications = () => 'fixture-notifications';");
    await writeFile(join(root, "src/lib/ui-text.js"), "export const ui = { title: 'fixture-copy' };");
    await writeFile(join(root, "electron/preload.cjs"), 'const { ui } = require("../src/lib/ui-text.js"); module.exports = ui.title;');
    await writeFile(join(root, "public/asset.txt"), "public asset");
    await writeFile(join(root, ".next/standalone/stale.txt"), "previous build");
    // A local Next CLI fixture observes the real child process without compiling the app.
    await writeFile(join(root, "node_modules/next/dist/bin/next"), `
      const { mkdirSync, writeFileSync } = require("node:fs");
      if (process.env.POFIS_STANDALONE !== "1" || process.env.POFIS_DESKTOP_BUILD !== "1" || process.argv.at(-1) !== "build") process.exit(2);
      mkdirSync(".next/standalone", { recursive: true });
      mkdirSync(".next/static", { recursive: true });
      writeFileSync(".next/standalone/server.js", JSON.stringify({ arch: process.arch, bun: process.versions.bun }));
      writeFileSync(".next/static/chunk.js", "static asset");
    `);
    await promisify(execFile)(process.execPath, [join(root, "scripts/electron/build.cjs")], {
      cwd: root,
      env: { ...process.env, NATIVE_BUN_PATH: join(root, "wrong-architecture-bun") },
      timeout: 10000,
      windowsHide: true,
    });
    expect(JSON.parse(await readFile(join(root, ".next/standalone/server.js"), "utf8")))
      .toEqual({ arch: process.arch, bun: process.versions.bun });
    expect(await readFile(join(root, ".next/standalone/public/asset.txt"), "utf8")).toBe("public asset");
    expect((await import(join(root, ".next/standalone/pofis-notifications.cjs"))).installDesktopNotifications()).toBe("fixture-notifications");
    expect(await readFile(join(root, ".next/standalone/.next/static/chunk.js"), "utf8")).toBe("static asset");
    expect(await readdir(join(root, ".next/standalone"))).not.toContain("stale.txt");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
