const { appendFile, readFile } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { run, handleCancellation } = require("./ci-build.cjs");
const root = resolve(__dirname, "../..");

async function finishMacBuild({ version, siteDirectory, intelDirectory, linuxDirectory,
  reuseNative = false, reuseIntel = false, reuseLinux = false, execute = run, summary = process.env.GITHUB_STEP_SUMMARY }) {
  const controller = new AbortController();
  let failure;
  const command = async (...args) => {
    controller.signal.throwIfAborted();
    try { return await execute(...args, { signal: controller.signal }); }
    catch (error) {
      if (!controller.signal.aborted) { failure = error; controller.abort(error); }
      else if (error !== failure) console.error(`Paralel komut kapanışı: ${error.message}`);
      throw error;
    }
  };
  const nativePackage = reuseNative ? Promise.resolve()
    : command(process.execPath, [join(__dirname, "ci-build.cjs"), "package"], root, {
      ...process.env, RELEASE_VERSION: version, RELEASE_TARGET: "darwin-arm64", SITE_DIRECTORY: siteDirectory,
    });
  const tasks = [];
  if (!reuseNative) tasks.push(nativePackage.then(() => command(process.execPath, [join(__dirname, "ci-build.cjs"), "accept"], root, {
    ...process.env, RELEASE_VERSION: version, RELEASE_TARGET: "darwin-arm64", SITE_DIRECTORY: siteDirectory,
  })));
  let source;
  const summaries = [];
  for (const [directory, platform, site, reuse] of [
    [intelDirectory, "darwin", `${siteDirectory}-intel`, reuseIntel],
    [linuxDirectory, "linux", `${siteDirectory}-linux`, reuseLinux],
  ]) {
    if (reuse) continue;
    const targetSummary = join(directory, "ci-summary.md");
    summaries.push(targetSummary);
    tasks.push((async () => {
      const env = {
        ...process.env, RELEASE_VERSION: version, RELEASE_TARGET: `${platform}-x64`,
        SITE_DIRECTORY: site, GITHUB_STEP_SUMMARY: summary ? targetSummary : "",
        POFIS_SHARED_STANDALONE: reuseNative
          ? join(root, ".next/recovered-arm64/Pofis.app/Contents/Resources/app/server")
          : join(root, ".next/standalone"),
        npm_config_arch: "x64", npm_config_platform: platform, npm_config_target_arch: "x64",
        ELECTRON_INSTALL_ARCH: "x64", ELECTRON_INSTALL_PLATFORM: platform,
      };
      // Bun/tools stay native to the host; only Electron's download targets the foreign runtime.
      const preparation = command(process.execPath, ["install", "--frozen-lockfile"], directory, env);
      source ||= reuseNative ? command("/usr/bin/ditto", ["-x", "-k",
        join(root, "dist/releases/macos/arm64", version, `Pofis-${version}-darwin-arm64.zip`),
        join(root, ".next/recovered-arm64")], root, process.env) : nativePackage;
      const prepared = await Promise.allSettled([preparation, source]);
      const failures = prepared.filter(result => result.status === "rejected").map(result => result.reason);
      if (failures.length) throw new AggregateError(failures, failures.map(error => error.message).join("\n"));
      await command(process.execPath, [join(directory, "scripts/electron/ci-build.cjs"), "build"], directory, env);
    })());
  }
  // First failure cancels siblings; all shutdowns finish before returning.
  const results = await Promise.allSettled(tasks);
  if (summary) for (const targetSummary of summaries) {
    try { await appendFile(summary, await readFile(targetSummary, "utf8")); }
    catch (error) {
      if (error.code !== "ENOENT") {
        if (!failure) throw error;
        console.error(`Süre özeti yazılamadı: ${error.message}`);
      }
    }
  }
  if (failure) throw failure;
  const failures = results.filter(result => result.status === "rejected").map(result => result.reason);
  if (failures.length) throw new AggregateError(failures, failures.map(error => error.message).join("\n"));
}

async function stageMacBuild({ version, siteDirectory, intelDirectory, linuxDirectory,
  reuseNative = false, reuseIntel = false, reuseLinux = false, execute = run }) {
  const tasks = [];
  for (const [directory, target, site, reuse] of [
    [root, "darwin-arm64", siteDirectory, reuseNative],
    [intelDirectory, "darwin-x64", `${siteDirectory}-intel`, reuseIntel],
    [linuxDirectory, "linux-x64", `${siteDirectory}-linux`, reuseLinux],
  ]) {
    if (!reuse) tasks.push(execute(process.execPath, [join(directory, "scripts/electron/publish.cjs"), "stage"], directory,
      { ...process.env, RELEASE_VERSION: version, RELEASE_TARGET: target, SITE_DIRECTORY: site }));
  }
  const results = await Promise.allSettled(tasks);
  const failures = results.filter(result => result.status === "rejected").map(result => result.reason);
  if (failures.length) throw new AggregateError(failures, failures.map(error => error.message).join("\n"));
}

if (require.main === module) {
  handleCancellation();
  if (process.platform !== "darwin" || process.arch !== "arm64") throw new Error("macOS CI koordinasyonu ARM64 Bun ile çalışır.");
  const action = process.argv[2];
  if (action && action !== "stage") throw new Error("Kullanım: bun macos-ci.cjs [stage]");
  (action === "stage" ? stageMacBuild : finishMacBuild)({ version: process.env.RELEASE_VERSION, siteDirectory: process.env.SITE_DIRECTORY,
    intelDirectory: join(process.env.RUNNER_TEMP, "pofis-intel"),
    linuxDirectory: join(process.env.RUNNER_TEMP, "pofis-linux"),
    reuseNative: process.env.REUSE_NATIVE === "true", reuseIntel: process.env.REUSE_INTEL === "true", reuseLinux: process.env.REUSE_LINUX === "true",
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { finishMacBuild, stageMacBuild };
