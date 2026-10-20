const { test, expect } = require("bun:test");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { timed, preflight } = require("./ci-build.cjs");

test("pano kabulü kurulmuş Electron ile çalışır ve hata sonraki aşamaya geçmez", async () => {
  const commands = [];
  let packaged = false;
  const failure = new Error("pano başarısız");
  const build = async () => {
    await preflight(true, async (_command, args) => {
      commands.push(args);
      if (args[0].endsWith("clipboard-smoke.cjs")) throw failure;
    }, null);
    packaged = true;
  };
  await expect(build()).rejects.toBe(failure);
  expect(commands[0]).toEqual(["run", "desktop:install"]);
  expect(commands[1]).toEqual(["test", "./electron", "./scripts/electron"]);
  expect(commands[2][1]).toBe("--isolated-desktop");
  expect(packaged).toBe(false);
});

test("Intel hazırlığı kabul testlerini çalıştırmadan runtime kurar", async () => {
  const commands = [];
  await preflight(false, async (_command, args) => { commands.push(args); }, null);
  expect(commands).toEqual([["run", "desktop:install"]]);
});

test("süre özeti başarılı ve hatalı aşamayı kaydeder; hata korunur", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-ci-timing-"));
  const summary = join(directory, "summary.md");
  const failure = new Error("özgün hata");
  try {
    expect(await timed("build", async () => "çıktı", summary)).toBe("çıktı");
    await expect(timed("kabul", async () => { throw failure; }, summary)).rejects.toBe(failure);
    expect(await readFile(summary, "utf8")).toMatch(/^\| build \| başarılı \| \d+\.\d{2} \|\n\| kabul \| başarısız \| \d+\.\d{2} \|\n$/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
