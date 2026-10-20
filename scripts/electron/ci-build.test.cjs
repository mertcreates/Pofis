const { test, expect, spyOn } = require("bun:test");
const { existsSync } = require("node:fs");
const { mkdtemp, readFile, rm, mkdir, copyFile, writeFile, realpath } = require("node:fs/promises");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { tmpdir } = require("node:os");
const { join, basename } = require("node:path");
const { timed, build, accept } = require("./ci-build.cjs");
const { finishMacBuild, stageMacBuild } = require("./macos-ci.cjs");
const { version } = require("../../package.json");
const intel = process.platform === "darwin" && process.arch === "x64";

test("gerçek CI build'i erken kontroldeki hatada derleme ve paketleme başlatmaz", async () => {
  for (const failedStep of intel ? ["desktop:install"] : ["desktop:install", "typecheck", "application-tests", "desktop-tests", "clipboard-smoke.cjs"]) {
    const commands = [];
    const failure = new Error(`${failedStep} başarısız`);
    await expect(build(version, "unused-site", {
      summary: null,
      execute: async (_command, args) => {
        const step = args[0] === "run" ? args[1] : args[0] === "test"
          ? args.includes("./src") ? "application-tests" : "desktop-tests" : basename(args[0]);
        commands.push(step);
        if (step === failedStep) throw failure;
        if (step === "build.cjs" || step === "package.cjs") throw new Error("Pahalı aşama erken başladı.");
      },
    })).rejects.toBe(failure);
    expect(commands).not.toContain("build.cjs");
    expect(commands).not.toContain("package.cjs");
    expect(commands).toContain(failedStep);
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
  if (!intel) expected.push(["run", "typecheck"], ["test", "./src"], ["test", "--parallel=2", "./electron", "./scripts/electron"],
    [join(__dirname, "clipboard-smoke.cjs"), "--isolated-desktop"]);
  expected.push([join(__dirname, "build.cjs")]);
  expect(commands).toEqual(expected);
});

test("derleme bütün paralel doğrulamaları bekler; tek doğrulama hatası panoyu ve derlemeyi durdurur", async () => {
  if (intel) return;
  for (const failApplication of [false, true]) {
    const calls = [];
    const failure = new Error("uygulama testleri başarısız");
    const stop = new Error("pano sınırında dur");
    let finishTypes, finishDesktop, gatesStarted;
    const ready = new Promise(done => { gatesStarted = done; });
    let settled = false;
    const pending = build(version, "unused-site", { summary: null,
      execute: async (_command, args) => {
        calls.push(args);
        if (args[1] === "typecheck") return new Promise(done => { finishTypes = done; });
        if (args[0] === "test" && args.includes("./src") && failApplication) throw failure;
        if (args.includes("--parallel=2")) {
          gatesStarted();
          return new Promise(done => { finishDesktop = done; });
        }
        if (basename(args[0]) === "clipboard-smoke.cjs") throw stop;
      },
    }).finally(() => { settled = true; });
    await ready;
    finishTypes();
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(calls.some(args => /clipboard-smoke|build\.cjs|package\.cjs/.test(args[0]))).toBe(false);
    finishDesktop();
    await expect(pending).rejects.toBe(failApplication ? failure : stop);
    expect(calls.some(args => basename(args[0]) === "clipboard-smoke.cjs")).toBe(!failApplication);
  }
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

test("süre özeti duvar saatindeki geçen süreyi raporlar", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-wall-time-"));
  const summary = join(directory, "summary.md");
  const clock = spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(58310);
  try {
    await timed("Next", async () => {}, summary);
    expect(await readFile(summary, "utf8")).toBe("| Next | başarılı | 57.31 |\n");
  } finally { clock.mockRestore(); await rm(directory, { recursive: true, force: true }); }
});

test("ayrı kurulum kabulü üretimi tekrarlamaz ve kabul hatasını korur", async () => {
  if (intel) return;
  const calls = [];
  const failure = new Error("kurulum reddedildi");
  await expect(accept(version, "site", { summary: null, execute: async (_command, args) => {
    calls.push(args);
    throw failure;
  } })).rejects.toBe(failure);
  expect(calls).toEqual([process.platform === "win32"
    ? ["run", "test:desktop:distribution", "--site", "site"]
    : [join(__dirname, "macos-distribution-test.cjs"), "--site", "site"]]);
});

test("macOS Intel hazırlığını paketlemeyle örtüştürür; hazırlık hatasında ARM kabulünü bekler", async () => {
  const calls = [];
  let finishPackage;
  let finishPreparation;
  let finishNative;
  let nativeStarted;
  const nativeReady = new Promise(done => { nativeStarted = done; });
  let settled = false;
  const pending = finishMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", intelBun: "intel-bun", summary: null,
    execute: async (command, args, cwd, env) => {
      calls.push({ command, args, cwd, env });
      if (args.at(-1) === "package") return new Promise(done => { finishPackage = done; });
      if (command === "/bin/bash") {
        await new Promise(done => { finishPreparation = done; });
        throw new Error("Intel hazırlığı başarısız");
      }
      nativeStarted();
      return new Promise(done => { finishNative = done; });
    },
  }).finally(() => { settled = true; });
  await Promise.resolve();
  expect(calls).toHaveLength(2);
  expect(settled).toBe(false);
  expect(calls[0].args.at(-1)).toBe("package");
  expect(calls[0].env.RELEASE_TARGET).toBe("darwin-arm64");
  expect(basename(calls[1].args[0])).toBe("prepare-intel.sh");
  expect(calls[1].args[1]).toBe("intel-bun");
  expect(calls[1].cwd).toBe("intel");
  expect(calls[1].env).toMatchObject({ RELEASE_TARGET: "darwin-x64", SITE_DIRECTORY: "site-intel", npm_config_arch: "x64" });
  finishPackage();
  await nativeReady;
  expect(calls[2].args.at(-1)).toBe("accept");
  finishPreparation();
  await Promise.resolve();
  expect(settled).toBe(false);
  finishNative();
  await expect(pending).rejects.toThrow("Intel hazırlığı başarısız");
  expect(calls.some(call => call.args.at(-1) === "build")).toBe(false);
});

test("macOS kurtarılan hedefin kabulünü veya üretimini tekrarlamaz", async () => {
  for (const [reuseNative, reuseIntel, expected] of [[true, false, ["prepare-intel.sh", "build"]], [false, true, ["package", "accept"]], [true, true, []]]) {
    const calls = [];
    await finishMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", intelBun: "intel-bun",
      reuseNative, reuseIntel, summary: null, execute: async (command, args) => { calls.push(command === "/bin/bash" ? basename(args[0]) : args.at(-1)); },
    });
    expect(calls).toEqual(expected);
  }
});

test("Intel derlemesi ARM paketini bekler; paket veya Intel hatası yayın öncesinde korunur", async () => {
  for (const failedStep of ["package", "build"]) {
    const calls = [];
    const failure = new Error(`${failedStep} başarısız`);
    let finishPackage, rejectPackage, finishAccept, startedIntel;
    const packageGate = new Promise((done, fail) => { finishPackage = done; rejectPackage = fail; });
    const intelStarted = new Promise(done => { startedIntel = done; });
    let settled = false;
    const pending = finishMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", intelBun: "intel-bun", summary: null,
      execute: async (command, args, _cwd, env) => {
        const step = command === "/bin/bash" ? "prepare" : args.at(-1);
        calls.push(step);
        if (step === "package") return packageGate;
        if (step === "accept") return new Promise(done => { finishAccept = done; });
        if (step === "build") {
          expect(command).toBe(process.execPath);
          expect(env.INTEL_BUN_PATH).toBe("intel-bun");
          startedIntel(); throw failure;
        }
      },
    }).finally(() => { settled = true; });
    expect(calls).toEqual(["package", "prepare"]);
    if (failedStep === "package") {
      rejectPackage(failure);
      await expect(pending).rejects.toThrow(failure.message);
      expect(calls).toEqual(["package", "prepare"]);
    } else {
      finishPackage();
      await intelStarted;
      expect(calls).toEqual(["package", "prepare", "accept", "build"]);
      expect(settled).toBe(false);
      finishAccept();
      await expect(pending).rejects.toThrow(failure.message);
    }
  }
});

test("Intel derlemesi x64 Bun'ını, koordinasyon ve paket araçları native Bun'ı kullanır", async () => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "pofis-intel-ci-")));
  try {
    for (const path of ["scripts/electron", "electron", "dist/macos/Pofis-darwin-x64-fixture"]) {
      await mkdir(join(directory, path), { recursive: true });
    }
    await copyFile(join(__dirname, "ci-build.cjs"), join(directory, "scripts/electron/ci-build.cjs"));
    await writeFile(join(directory, "package.json"), JSON.stringify({ version }));
    await writeFile(join(directory, "electron/platform.cjs"), `module.exports.platformTarget = (platform, arch) => {
      if (platform !== 'darwin' || arch !== 'x64') throw Error('Intel target was not selected from native ARM host');
      return {
      id: 'darwin-x64', platform: 'darwin', arch: 'x64', outputDirectory: 'macos', releaseDirectory: 'macos/x64',
      electronExecutable: 'Electron.app/Contents/MacOS/Electron'
    }; };`);
    await writeFile(join(directory, "scripts/electron/prepare-site.cjs"), "module.exports.prepareSite = async () => {};");
    await promisify(execFile)(process.execPath, ["-e", `
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      Object.defineProperty(process, 'arch', { value: 'arm64' });
      const { build } = require('./scripts/electron/ci-build.cjs');
      const calls = [];
      await build(${JSON.stringify(version)}, 'site', { summary: null,
        execute: async (command, args) => { calls.push({ command, args }); }
      });
      await Bun.write('calls.json', JSON.stringify(calls));
    `], { cwd: directory, env: { ...process.env, RELEASE_TARGET: "darwin-x64", INTEL_BUN_PATH: "intel-bun" }, windowsHide: true });
    const calls = JSON.parse(await readFile(join(directory, "calls.json"), "utf8"));
    const scriptCall = name => calls.find(call => basename(call.args[0]) === name);
    expect(scriptCall("build.cjs").command).toBe("intel-bun");
    expect(scriptCall("package.cjs")).toEqual({ command: process.execPath, args: [join(directory, "scripts/electron/package.cjs"), "x64"] });
    expect(scriptCall("macos-static-check.cjs").command).toBe(process.execPath);
    expect(scriptCall("release.cjs").command).toBe(process.execPath);
    expect(scriptCall("release.cjs").args.slice(-2)).toEqual(["-Arch", "x64"]);
    expect(calls.some(call => call.args.some(arg => /clipboard|distribution|test:desktop:smoke/.test(arg)))).toBe(false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("yayınsız workflow ölçümü sürümü doğrulayıp paketleri üretir; yayın komutlarını atlar", async () => {
  const workflow = Bun.YAML.parse(await readFile(join(__dirname, "../../.github/workflows/desktop-release.yml"), "utf8"));
  expect(workflow.on.workflow_dispatch.inputs.publish).toMatchObject({ type: "boolean", default: true });
  const active = (expression, publish, os) => !expression || Function("inputs", "runner", "steps", "needs", "github", "always",
    `return (${expression.replace(/^\$\{\{\s*|\s*\}\}$/g, "")})`)(
    { publish }, { os }, { recover: { outputs: {} }, recover_intel: { outputs: {} } },
    { begin: { result: "success" }, build: { result: "failure" } }, { ref: "refs/heads/master" }, () => true);
  for (const os of ["Windows", "macOS"]) {
    const commands = [];
    for (const job of Object.values(workflow.jobs)) {
      if (!active(job.if, false, os)) continue;
      for (const step of job.steps) if (active(step.if, false, os) && step.run) commands.push(step.run);
    }
    expect(commands.some(command => /publish\.cjs|macos-ci\.cjs stage/.test(command))).toBe(false);
    expect(commands.some(command => command.includes("ci-build.cjs check"))).toBe(true);
    expect(commands.some(command => command.includes(os === "Windows" ? "ci-build.cjs build" : "macos-ci.cjs"))).toBe(true);
    if (os === "macOS") expect(commands.some(command => command.includes("macos-ci.cjs"))).toBe(true);
  }
  const steps = workflow.jobs.build.steps;
  const finish = steps.findIndex(step => step.run?.includes("macos-ci.cjs"));
  const macStages = steps.map((step, index) => ({ step, index }))
    .filter(({ step }) => step.run?.includes("macos-ci.cjs stage") && active(step.if, true, "macOS"));
  expect(macStages).toHaveLength(1);
  expect(macStages.every(({ index }) => index > finish)).toBe(true);
});

test("macOS paket aktarımı hedeflerin ayrı dosyalarını paralel işler; kurtarılan hedefi atlar", async () => {
  const calls = [];
  let release;
  const gate = new Promise(done => { release = done; });
  const pending = stageMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", execute: async (command, args, cwd, env) => {
    calls.push({ command, args, cwd, target: env.RELEASE_TARGET, site: env.SITE_DIRECTORY });
    await gate;
  } });
  try {
    expect(calls.map(call => call.target)).toEqual(["darwin-arm64", "darwin-x64"]);
    expect(calls.every(call => call.command === process.execPath && call.args.at(-1) === "stage")).toBe(true);
    expect(calls[1]).toMatchObject({ cwd: "intel", site: "site-intel" });
  } finally { release(); }
  await pending;
  calls.length = 0;
  await stageMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", reuseNative: true,
    execute: async (_command, _args, _cwd, env) => { calls.push(env.RELEASE_TARGET); },
  });
  expect(calls).toEqual(["darwin-x64"]);
});
