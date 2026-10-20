const { test, expect } = require("bun:test");
const { existsSync } = require("node:fs");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join, basename } = require("node:path");
const { timed, build } = require("./ci-build.cjs");
const { version } = require("../../package.json");
const intel = process.platform === "darwin" && process.arch === "x64";

test("gerçek CI build'i erken kontroldeki hatada derleme ve paketleme başlatmaz", async () => {
  for (const failedStep of intel ? ["desktop:install"] : ["desktop:install", "test", "clipboard-smoke.cjs"]) {
    const commands = [];
    const failure = new Error(`${failedStep} başarısız`);
    await expect(build(version, "unused-site", {
      summary: null,
      execute: async (_command, args) => {
        const step = args[0] === "run" ? args[1] : basename(args[0]);
        commands.push(step);
        if (step === failedStep) throw failure;
        if (step === "build.cjs" || step === "package.cjs") throw new Error("Pahalı aşama erken başladı.");
      },
    })).rejects.toBe(failure);
    expect(commands).not.toContain("build.cjs");
    expect(commands).not.toContain("package.cjs");
    expect(commands.at(-1)).toBe(failedStep);
  }
});

test("gerçek CI build'i platformun erken kontrollerinden sonra Next derlemesine geçer", async () => {
  const commands = [];
  const stop = new Error("Next sınırında dur");
  await expect(build(version, "unused-site", {
    summary: null,
    execute: async (_command, args) => {
      commands.push(args);
      if (basename(args[0]) === "build.cjs") throw stop;
    },
  })).rejects.toBe(stop);
  const intelBinary = join(__dirname, "../../node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
  const expected = [];
  if (intel && existsSync(intelBinary)) expected.push([intelBinary, "-verify_arch", "x86_64"]);
  expected.push(["run", "desktop:install"]);
  if (intel) expected.push([intelBinary, "-verify_arch", "x86_64"]);
  if (!intel) expected.push(["test", "./electron", "./scripts/electron"],
    [join(__dirname, "clipboard-smoke.cjs"), "--isolated-desktop"]);
  expected.push([join(__dirname, "build.cjs")]);
  expect(commands).toEqual(expected);
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
