const { appendFile, readFile } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { run } = require("./ci-build.cjs");
const root = resolve(__dirname, "../..");

async function finishMacBuild({ version, siteDirectory, intelDirectory,
  reuseNative = false, reuseIntel = false, execute = run, summary = process.env.GITHUB_STEP_SUMMARY }) {
  const intelSummary = join(intelDirectory, "ci-summary.md");
  const nativePackage = reuseNative ? Promise.resolve()
    : execute(process.execPath, [join(__dirname, "ci-build.cjs"), "package"], root, {
      ...process.env, RELEASE_VERSION: version, RELEASE_TARGET: "darwin-arm64", SITE_DIRECTORY: siteDirectory,
    });
  const tasks = [];
  if (!reuseNative) tasks.push(nativePackage.then(() => execute(process.execPath, [join(__dirname, "ci-build.cjs"), "accept"], root, {
    ...process.env, RELEASE_VERSION: version, RELEASE_TARGET: "darwin-arm64", SITE_DIRECTORY: siteDirectory,
  })));
  if (!reuseIntel) tasks.push((async () => {
    const env = {
      ...process.env, RELEASE_VERSION: version, RELEASE_TARGET: "darwin-x64",
      SITE_DIRECTORY: `${siteDirectory}-intel`, GITHUB_STEP_SUMMARY: summary ? intelSummary : "",
      POFIS_SHARED_STANDALONE: reuseNative
        ? join(root, ".next/recovered-arm64/Pofis.app/Contents/Resources/app/server")
        : join(root, ".next/standalone"),
      npm_config_arch: "x64", npm_config_platform: "darwin", npm_config_target_arch: "x64",
      ELECTRON_INSTALL_ARCH: "x64", ELECTRON_INSTALL_PLATFORM: "darwin",
    };
    // Install native build tools while ARM64 packages; Electron's download still targets x64.
    const preparation = execute(process.execPath, ["install", "--frozen-lockfile"], intelDirectory, env);
    const source = reuseNative ? execute("/usr/bin/ditto", ["-x", "-k",
      join(root, "dist/releases/macos/arm64", version, `Pofis-${version}-darwin-arm64.zip`),
      join(root, ".next/recovered-arm64")], root) : nativePackage;
    const prepared = await Promise.allSettled([preparation, source]);
    const failures = prepared.filter(result => result.status === "rejected").map(result => result.reason);
    if (failures.length) throw new AggregateError(failures, failures.map(error => error.message).join("\n"));
    await execute(process.execPath, [join(intelDirectory, "scripts/electron/ci-build.cjs"), "build"], intelDirectory, env);
  })());
  // Both chains finish before staging. A failure in either chain rejects the job.
  const results = await Promise.allSettled(tasks);
  if (summary && !reuseIntel) {
    try { await appendFile(summary, await readFile(intelSummary, "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const failures = results.filter(result => result.status === "rejected").map(result => result.reason);
  if (failures.length) throw new AggregateError(failures, failures.map(error => error.message).join("\n"));
}

async function stageMacBuild({ version, siteDirectory, intelDirectory,
  reuseNative = false, reuseIntel = false, execute = run }) {
  const tasks = [];
  for (const [directory, target, site, reuse] of [
    [root, "darwin-arm64", siteDirectory, reuseNative],
    [intelDirectory, "darwin-x64", `${siteDirectory}-intel`, reuseIntel],
  ]) {
    if (!reuse) tasks.push(execute(process.execPath, [join(directory, "scripts/electron/publish.cjs"), "stage"], directory,
      { ...process.env, RELEASE_VERSION: version, RELEASE_TARGET: target, SITE_DIRECTORY: site }));
  }
  const results = await Promise.allSettled(tasks);
  const failures = results.filter(result => result.status === "rejected").map(result => result.reason);
  if (failures.length) throw new AggregateError(failures, failures.map(error => error.message).join("\n"));
}

if (require.main === module) {
  if (process.platform !== "darwin" || process.arch !== "arm64") throw new Error("macOS CI koordinasyonu ARM64 Bun ile çalışır.");
  const action = process.argv[2];
  if (action && action !== "stage") throw new Error("Kullanım: bun macos-ci.cjs [stage]");
  (action === "stage" ? stageMacBuild : finishMacBuild)({ version: process.env.RELEASE_VERSION, siteDirectory: process.env.SITE_DIRECTORY,
    intelDirectory: join(process.env.RUNNER_TEMP, "pofis-intel"),
    reuseNative: process.env.REUSE_NATIVE === "true", reuseIntel: process.env.REUSE_INTEL === "true",
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { finishMacBuild, stageMacBuild };
