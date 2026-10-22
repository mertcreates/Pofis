const { test, expect, spyOn } = require("bun:test");
const { mkdtemp, readFile, rm, mkdir, copyFile, writeFile, realpath } = require("node:fs/promises");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { tmpdir } = require("node:os");
const { join, basename } = require("node:path");
const { timed, build, accept, run } = require("./ci-build.cjs");
const { finishMacBuild, stageMacBuild } = require("./macos-ci.cjs");
const { version } = require("../../package.json");
const { until } = require("./acceptance-wait.cjs");
const intel = process.platform === "darwin" && process.arch === "x64";

test("iptal edilen CI komutu hazır alt süreçlerini de kapatır", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-ci-timeout-"));
  const script = join(directory, "hang.cjs");
  const record = join(directory, "pids.json");
  let pids = [];
  const controller = new AbortController();
  let pending;
  try {
    const nested = `const { spawn } = require('node:child_process');
      const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
      require('node:fs').writeFileSync(${JSON.stringify(record)}, JSON.stringify([process.ppid, process.pid, child.pid]));
      setInterval(() => {}, 1000);`;
    await writeFile(script, `const { run, handleCancellation } = require(${JSON.stringify(join(__dirname, "ci-build.cjs"))});
      handleCancellation();
      run(process.execPath, ['-e', ${JSON.stringify(nested)}]).catch(() => { process.exitCode = 1; });`);
    pending = run(process.execPath, [script, record], directory, process.env, { signal: controller.signal });
    pending.catch(() => {}); // Observe rejection even if fixture startup fails first.
    await until(async () => Bun.file(record).exists(), 5000);
    pids = JSON.parse(await readFile(record, "utf8"));
    const reason = new Error("kardeş hedef başarısız");
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    for (const pid of pids) expect(() => process.kill(pid, 0)).toThrow();
  } finally {
    controller.abort();
    await pending?.catch(() => {});
    for (const pid of pids) { try { process.kill(pid, "SIGKILL"); } catch {} }
    await rm(directory, { recursive: true, force: true });
  }
});

test("CI komutunun zaman sınırı bekleyen komutu sonlandırır", async () => {
  await expect(run(process.execPath, ["-e", "setInterval(() => {}, 1000)"], undefined, undefined,
    { timeoutMs: 50 })).rejects.toThrow("tamamlanmadı");
});

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
  const clock = spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(58310)
    .mockReturnValueOnce(60000).mockReturnValueOnce(60500);
  try {
    expect(await timed("build", async () => "çıktı", summary)).toBe("çıktı");
    await expect(timed("kabul", async () => { throw failure; }, summary)).rejects.toBe(failure);
    expect(await readFile(summary, "utf8")).toBe("| build | başarılı | 57.31 |\n| kabul | başarısız | 0.50 |\n");
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
    : [join(__dirname, process.platform === "linux" ? "linux-distribution-test.cjs" : "macos-distribution-test.cjs"), "--site", "site"]]);
});

test("hazırlık hatası ARM kabulünü iptal eder; temizlik bitmeden dönmez veya yeni aşama başlatmaz", async () => {
  const calls = [];
  let finishPackage;
  let finishPreparation;
  let finishNative;
  let nativeStarted;
  const nativeReady = new Promise(done => { nativeStarted = done; });
  let notifyCancellation;
  const cancelled = new Promise(done => { notifyCancellation = done; });
  let settled = false;
  const pending = finishMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", reuseLinux: true, summary: null,
    execute: async (command, args, cwd, env, { signal } = {}) => {
      calls.push({ command, args, cwd, env });
      if (args.at(-1) === "package") return new Promise(done => { finishPackage = done; });
      if (args[0] === "install") {
        await new Promise(done => { finishPreparation = done; });
        throw new Error("Intel hazırlığı başarısız");
      }
      nativeStarted();
      signal?.addEventListener("abort", notifyCancellation, { once: true });
      return new Promise(done => { finishNative = done; });
    },
  }).finally(() => { settled = true; });
  await Promise.resolve();
  expect(calls).toHaveLength(2);
  expect(settled).toBe(false);
  expect(calls[0].args.at(-1)).toBe("package");
  expect(calls[0].env.RELEASE_TARGET).toBe("darwin-arm64");
  expect(calls[1].command).toBe(process.execPath);
  expect(calls[1].args).toEqual(["install", "--frozen-lockfile"]);
  expect(calls[1].cwd).toBe("intel");
  expect(calls[1].env).toMatchObject({ RELEASE_TARGET: "darwin-x64", SITE_DIRECTORY: "site-intel", npm_config_arch: "x64" });
  finishPackage();
  await nativeReady;
  expect(calls[2].args.at(-1)).toBe("accept");
  finishPreparation();
  await cancelled;
  expect(settled).toBe(false);
  finishNative();
  await expect(pending).rejects.toThrow("Intel hazırlığı başarısız");
  expect(calls.some(call => call.args.at(-1) === "build")).toBe(false);
});

test("macOS kurtarılan hedefin kabulünü veya üretimini tekrarlamaz", async () => {
  for (const [reuseNative, reuseIntel, expected] of [[true, false, ["install", "extract", "build"]], [false, true, ["package", "accept"]], [true, true, []]]) {
    const calls = [];
    await finishMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", reuseLinux: true,
      reuseNative, reuseIntel, summary: null, execute: async (command, args, _cwd, env) => {
        calls.push(command === "/usr/bin/ditto" ? "extract" : args[0] === "install" ? "install" : args.at(-1));
        if (command === "/usr/bin/ditto") {
          expect(args).toEqual(["-x", "-k", join(__dirname, "../../dist/releases/macos/arm64", version, `Pofis-${version}-darwin-arm64.zip`),
            join(__dirname, "../../.next/recovered-arm64")]);
        }
        if (args.at(-1) === "build") expect(env.POFIS_SHARED_STANDALONE)
          .toBe(join(__dirname, "../../.next/recovered-arm64/Pofis.app/Contents/Resources/app/server"));
      },
    });
    expect(calls).toEqual(expected);
  }
  const failure = new Error("Kurtarılan ZIP açılamadı");
  let finishPreparation;
  let settled = false;
  const calls = [];
  const pending = finishMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", reuseLinux: true,
    reuseNative: true, summary: null, execute: async (command, args) => {
      calls.push(args);
      if (args[0] === "install") return new Promise(done => { finishPreparation = done; });
      if (command === "/usr/bin/ditto") throw failure;
      throw new Error("Kurtarma hatasında paketleme başlamamalı.");
    },
  }).finally(() => { settled = true; });
  await Promise.resolve();
  expect(settled).toBe(false);
  finishPreparation();
  await expect(pending).rejects.toThrow(failure.message);
  expect(calls).toHaveLength(2);
});

test("Intel derlemesi ARM paketini bekler; paket veya Intel hatası yayın öncesinde korunur", async () => {
  for (const failedStep of ["package", "build"]) {
    const calls = [];
    const failure = new Error(`${failedStep} başarısız`);
    let finishPackage, rejectPackage, finishAccept, startedIntel;
    const packageGate = new Promise((done, fail) => { finishPackage = done; rejectPackage = fail; });
    const intelStarted = new Promise(done => { startedIntel = done; });
    let settled = false;
    const pending = finishMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", reuseLinux: true, summary: null,
      execute: async (command, args, _cwd, env) => {
        const step = args[0] === "install" ? "prepare" : args.at(-1);
        calls.push(step);
        if (step === "package") return packageGate;
        if (step === "accept") return new Promise(done => { finishAccept = done; });
        if (step === "build") {
          expect(command).toBe(process.execPath);
          expect(env.POFIS_SHARED_STANDALONE).toBe(join(__dirname, "../../.next/standalone"));
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

test.each(["darwin-x64", "linux-x64"])("%s ARM çıktısını yeniden derlemeden paketler; araçlar native Bun kullanır", async targetId => {
  const linux = targetId === "linux-x64";
  const platform = linux ? "linux" : "darwin";
  const directory = await realpath(await mkdtemp(join(tmpdir(), "pofis-intel-ci-")));
  try {
    for (const path of ["scripts/electron", "electron", `dist/${linux ? "linux" : "macos"}/Pofis-${targetId}-fixture`]) {
      await mkdir(join(directory, path), { recursive: true });
    }
    await copyFile(join(__dirname, "ci-build.cjs"), join(directory, "scripts/electron/ci-build.cjs"));
    await writeFile(join(directory, "package.json"), JSON.stringify({ version }));
    await writeFile(join(directory, "electron/platform.cjs"), `module.exports.platformTarget = (platform, arch) => {
      if (platform !== '${platform}' || arch !== 'x64') throw Error('Intel target was not selected from native ARM host');
      return {
      id: '${targetId}', platform: '${platform}', arch: 'x64', outputDirectory: '${linux ? 'linux' : 'macos'}', releaseDirectory: '${linux ? 'linux/x64' : 'macos/x64'}', installer: '${linux ? 'install-linux.sh' : 'install-macos.sh'}',
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
    `], { cwd: directory, env: { ...process.env, RELEASE_TARGET: targetId, POFIS_SHARED_STANDALONE: "arm-standalone" }, windowsHide: true });
    const calls = JSON.parse(await readFile(join(directory, "calls.json"), "utf8"));
    const scriptCall = name => calls.find(call => basename(call.args[0]) === name);
    expect(scriptCall("build.cjs")).toBeUndefined();
    expect(scriptCall("package.cjs")).toEqual({ command: process.execPath, args: [join(directory, "scripts/electron/package.cjs"), "x64", ...(linux ? ["linux"] : [])] });
    expect(scriptCall(linux ? "linux-static-check.cjs" : "macos-static-check.cjs").command).toBe(process.execPath);
    expect(scriptCall("release.cjs").command).toBe(process.execPath);
    expect(scriptCall("release.cjs").args.slice(3)).toEqual(["-Arch", "x64", ...(linux ? ["-Platform", "linux"] : [])]);
    expect(calls.some(call => call.command === (linux ? "/usr/bin/tar" : "/usr/bin/unzip"))).toBe(true);
    expect(calls.some(call => call.args.some(arg => /clipboard|distribution|test:desktop:smoke/.test(arg)))).toBe(false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("yayınsız workflow ölçümü sürümü doğrulayıp paketleri üretir; yayın komutlarını atlar", async () => {
  const workflow = Bun.YAML.parse(await readFile(join(__dirname, "../../.github/workflows/desktop-release.yml"), "utf8"));
  expect(workflow.on.workflow_dispatch.inputs.publish).toMatchObject({ type: "boolean", default: true });
  const active = (expression, publish, os, reuse = {}, buildResult = "failure") => !expression || Function("inputs", "runner", "steps", "needs", "github", "always",
    `return (${expression.replace(/^\$\{\{\s*|\s*\}\}$/g, "")})`)(
    { publish }, { os }, Object.fromEntries(["recover", "recover_intel", "recover_linux"].map(id => [id, { outputs: { reuse: reuse[id] ? "true" : "false" } }])),
    { begin: { result: "success" }, build: { result: buildResult } }, { ref: "refs/heads/master" }, () => true);
  for (const os of ["Windows", "macOS"]) {
    const commands = [];
    for (const job of Object.values(workflow.jobs)) {
      if (!active(job.if, false, os)) continue;
      for (const step of job.steps) if (active(step.if, false, os) && step.run) commands.push(step.run);
    }
    expect(commands.some(command => /publish\.cjs (?:begin|recover|stage|prepare|publish|verify|cleanup)\b|macos-ci\.cjs stage/.test(command))).toBe(false);
    expect(commands.some(command => command.includes("publish.cjs check-site"))).toBe(true);
    expect(commands.some(command => command.includes("ci-build.cjs check"))).toBe(true);
    expect(commands.some(command => command.includes(os === "macOS" ? "macos-ci.cjs" : "ci-build.cjs build"))).toBe(true);
  }
  expect(workflow.jobs.build.strategy.matrix.include).toEqual([
    { target: "win32-x64", runner: "windows-2022" }, { target: "darwin-arm64", runner: "macos-15" },
  ]);
  const steps = workflow.jobs.build.steps;
  const cache = steps.find(step => step.with?.path?.includes("pofis-downloads"));
  const nextCache = steps.find(step => step.with?.path === ".next/cache");
  for (const os of ["Windows", "macOS"]) {
    const recovered = { recover: true, recover_intel: true, recover_linux: true };
    expect(active(cache.if, true, os, recovered)).toBe(false);
    expect(active(nextCache.if, true, os, recovered)).toBe(false);
    expect(active(cache.if, true, os, {})).toBe(true);
    expect(active(nextCache.if, true, os, {})).toBe(true);
    if (os === "macOS") {
      recovered.recover_linux = false;
      expect(active(cache.if, true, os, recovered)).toBe(true);
      expect(active(nextCache.if, true, os, recovered)).toBe(false);
    }
  }
  for (const result of ["success", "failure", "cancelled"]) {
    expect(active(workflow.jobs.cleanup.if, true, "Windows", {}, result)).toBe(result !== "success");
  }
  const validation = workflow.jobs.validate_site;
  expect(validation.steps.find(step => step.uses?.startsWith("actions/checkout@")).with.repository).toBe("mertcreates/pofis-landing");
  expect(validation.steps.some(step => JSON.stringify(step).includes("secrets."))).toBe(false);
  expect(workflow.jobs.publish.needs).toContain("validate_site");
  expect(workflow.jobs.publish.steps.some(step => /bun (?:install|run build)/.test(step.run || ""))).toBe(false);
  expect(steps.some(step => step.with?.path?.includes("pofis-intel/.next/cache"))).toBe(false);
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
  const pending = stageMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", linuxDirectory: "linux", execute: async (command, args, cwd, env) => {
    calls.push({ command, args, cwd, target: env.RELEASE_TARGET, site: env.SITE_DIRECTORY });
    await gate;
  } });
  try {
    expect(calls.map(call => call.target)).toEqual(["darwin-arm64", "darwin-x64", "linux-x64"]);
    expect(calls.every(call => call.command === process.execPath && call.args.at(-1) === "stage")).toBe(true);
    expect(calls[1]).toMatchObject({ cwd: "intel", site: "site-intel" });
  } finally { release(); }
  await pending;
  calls.length = 0;
  await stageMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", linuxDirectory: "linux", reuseNative: true,
    execute: async (_command, _args, _cwd, env) => { calls.push(env.RELEASE_TARGET); },
  });
  expect(calls).toEqual(["darwin-x64", "linux-x64"]);
});

test("Linux hatası kardeş üretimi iptal eder; kurtarılan ARM çıktısı bir kez açılır", async () => {
  for (const reuseNative of [false, true]) {
    const calls = [];
    let finishIntel, intelStarted;
    const intelReady = new Promise(done => { intelStarted = done; });
    let notifyCancellation;
    const cancelled = new Promise(done => { notifyCancellation = done; });
    let settled = false;
    const pending = finishMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", linuxDirectory: "linux",
      reuseNative, summary: null, execute: async (command, args, cwd, env, { signal } = {}) => {
        calls.push({ command, args, cwd, env });
        if (args.at(-1) === "build" && cwd === "linux") {
          expect(env).toMatchObject({ RELEASE_TARGET: "linux-x64", SITE_DIRECTORY: "site-linux",
            ELECTRON_INSTALL_PLATFORM: "linux", ELECTRON_INSTALL_ARCH: "x64" });
          throw new Error("Linux paketi geçersiz");
        }
        if (args.at(-1) === "build" && cwd === "intel") {
          signal?.addEventListener("abort", notifyCancellation, { once: true });
          intelStarted();
          return new Promise(done => { finishIntel = done; });
        }
      },
    }).finally(() => { settled = true; });
    await intelReady;
    await cancelled;
    expect(settled).toBe(false);
    expect(calls.filter(call => call.args[0] === "install").map(call => call.cwd)).toEqual(["intel", "linux"]);
    expect(calls.filter(call => call.command === "/usr/bin/ditto")).toHaveLength(reuseNative ? 1 : 0);
    expect(calls.filter(call => call.args.at(-1) === "package")).toHaveLength(reuseNative ? 0 : 1);
    finishIntel();
    await expect(pending).rejects.toThrow("Linux paketi geçersiz");
  }
  const calls = [];
  await finishMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", linuxDirectory: "linux",
    reuseNative: true, reuseIntel: true, reuseLinux: true, summary: null,
    execute: async (...args) => { calls.push(args); },
  });
  await stageMacBuild({ version, siteDirectory: "site", intelDirectory: "intel", linuxDirectory: "linux",
    reuseNative: true, reuseIntel: true, reuseLinux: true,
    execute: async (...args) => { calls.push(args); },
  });
  expect(calls).toEqual([]);
});
