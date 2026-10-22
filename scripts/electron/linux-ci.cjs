const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, writeFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { resolve, join } = require("node:path");

async function main() {
  if (process.platform !== "linux" || process.env.GITHUB_ACTIONS !== "true" || process.argv[2] !== "sandbox") {
    throw new Error("Bu hazırlık yalnız izole Linux GitHub Actions runner'ında çalışır.");
  }
  const root = resolve(__dirname, "../..");
  // Confine userns permission to this checkout's test executables, not the entire runner.
  if (!/^\/[a-zA-Z0-9_./-]+$/.test(root)) throw new Error("CI çalışma yolu AppArmor için uygun değil.");
  const folder = await mkdtemp(join(tmpdir(), "pofis-ci-apparmor-"));
  const source = join(folder, "pofis-ci");
  try {
    const paths = [`${root}/node_modules/electron/dist/electron`, `${root}/dist/linux/**/pofis`,
      `${root}/dist/electron/**/app/pofis`];
    await writeFile(source, 'abi <abi/4.0>,\ninclude <tunables/global>\n' + paths.map((path, index) =>
      `profile pofis-ci-${index} "${path}" flags=(unconfined) {\n  userns,\n}\n`).join(""));
    const execute = promisify(execFile);
    await execute("sudo", ["install", "-m", "644", source, "/etc/apparmor.d/pofis-ci"]);
    await execute("sudo", ["apparmor_parser", "-r", "/etc/apparmor.d/pofis-ci"]);
  } finally { await rm(folder, { recursive: true, force: true }); }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
