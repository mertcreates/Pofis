// Native Linux acceptance. Terminal consent alone is stubbed for open-app
// updates; first install and uninstall use the actual distributed entry points.
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, mkdir, readFile, writeFile, rm, readdir, readlink } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { createHash } = require("node:crypto");
const { UNIX_INSTALL_COMMAND, readSiteContent } = require("./install-command.cjs");
const { unixInstaller } = require("./unix-installer.cjs");
const { until, fetchLocal: fetch } = require("./acceptance-wait.cjs");
const execute = promisify(execFile);
const root = resolve(__dirname, "../..");

async function main() {
  assert.equal(process.platform, "linux", "Gerçek Linux çalışma ortamı gerekli.");
  const commonInstaller = await unixInstaller();
  const siteIndex = process.argv.indexOf("--site");
  if (siteIndex !== -1) {
    const site = resolve(process.argv[siteIndex + 1]);
    const content = readSiteContent(await readFile(join(site, "src/content.ts"), "utf8"));
    assert.equal(content.install.platforms.find(item => item.id === "unix")?.command, UNIX_INSTALL_COMMAND);
    assert.equal(await readFile(join(site, "public/install.sh"), "utf8"), commonInstaller);
  }
  const checks = join(root, "dist/electron/checks");
  await mkdir(checks, { recursive: true });
  const directory = await mkdtemp(join(checks, "linux-distribution-"));
  const installRoot = join(directory, "install");
  const app = join(installRoot, "app");
  const profile = join(directory, "profile");
  const desktop = join(directory, "applications");
  const sourceVersion = JSON.parse(await readFile(join(root, "package.json"))).version;
  const source = join(root, "dist/releases/linux/x64", sourceVersion, `Pofis-${sourceVersion}-linux-x64.tar.gz`);
  let active;
  const archives = new Map();
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/install.sh") return new Response(commonInstaller, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    if (path === "/latest.json") return Response.json(active);
    return archives.has(path) ? new Response(Bun.file(archives.get(path))) : new Response("missing", { status: 404 });
  } });
  const harness = join(directory, "installer-test.py");
  const installerSource = join(directory, "installer.py");
  const shell = await readFile(join(__dirname, "install-linux.sh"), "utf8");
  const python = shell.split("<<'POFIS_PYTHON'\n")[1].split("\nPOFIS_PYTHON")[0];
  // __name__ is supplied by the harness so the embedded main runs only once.
  await writeFile(installerSource, python);
  await writeFile(harness, `import json, sys\nfrom pathlib import Path\nnamespace = {"__name__": "fixture", "__file__": ${JSON.stringify(installerSource)}}\nexec(${JSON.stringify(python)}, namespace)\nif sys.argv[1:2] == ["--sandbox-profile"]:\n    print(json.dumps(namespace["sandbox_profile"](Path(sys.argv[2]))))\nelse:\n    namespace["confirm"] = lambda message: print("TEST_CONSENT: " + message) or True\n    namespace["main"]()\n`);
  const env = { ...process.env, POFIS_TEST_BLOCK_ANALYTICS: "1" };
  delete env.ELECTRON_RUN_AS_NODE;
  const install = async (uninstall = false, consent = false) => {
    try {
      const args = ["--install-root", installRoot, "--user-data-dir", profile,
        "--desktop-dir", desktop, "--manifest-url", `http://127.0.0.1:${server.port}/latest.json`];
      const command = UNIX_INSTALL_COMMAND.replace("https://pofis.app/install.sh", `http://127.0.0.1:${server.port}/install.sh`);
      const result = consent
        ? await execute("python3", [harness, ...args], { env, timeout: 70000 })
        : uninstall
          ? await execute("/bin/bash", [join(app, "uninstall.sh"), ...args], { env, timeout: 70000 })
          : await execute("/bin/bash", ["-o", "pipefail", "-c", command + ' -s -- "$@"', "pofis-test", ...args], { env, timeout: 70000 });
      return { code: 0, output: result.stdout + result.stderr };
    } catch (error) { return { code: error.code, output: error.stdout + error.stderr }; }
  };
  let appArmorFile;
  const pids = async () => {
    const ids = [];
    for (const name of await readdir("/proc")) {
      if (!/^\d+$/.test(name)) continue;
      const executable = await readlink(`/proc/${name}/exe`).catch(error => {
        if (["ENOENT", "EACCES", "ESRCH"].includes(error.code)) return "";
        throw error;
      });
      if (executable === join(app, "pofis")) ids.push(Number(name));
    }
    return ids;
  };
  const close = async () => {
    if (!(await pids()).length) return;
    await execute(join(app, "pofis"), [`--user-data-dir=${profile}`, "--pofis-quit"], { env, timeout: 10000 });
    await until(async () => (await pids()).length === 0);
  };
  const fixture = async (version, broken = false) => {
    const folder = join(directory, `fixture-${version}`);
    await mkdir(folder);
    await execute("tar", ["-xzf", source, "-C", folder]);
    const pkgPath = join(folder, "resources/app/package.json");
    const pkg = JSON.parse(await readFile(pkgPath));
    await writeFile(pkgPath, JSON.stringify({ ...pkg, version }));
    await writeFile(join(folder, "release.json"), JSON.stringify({ schemaVersion: 1, platform: "linux", arch: "x64", version }));
    if (broken) await writeFile(join(folder, "resources/app/electron/server-entry.cjs"), "process.exit(23);\n");
    const archive = join(directory, `${version}.tar.gz`);
    await execute("tar", ["-czf", archive, "-C", folder, "."]);
    const bytes = await readFile(archive);
    const name = `${version}/Pofis-${version}-linux-x64.tar.gz`;
    archives.set("/" + name, archive);
    return { schemaVersion: 1, platform: "linux", arch: "x64", version, size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"), url: name };
  };
  try {
    const restricted = await readFile("/proc/sys/kernel/apparmor_restrict_unprivileged_userns", "utf8")
      .catch(error => { if (error.code === "ENOENT") return "0"; throw error; });
    if (restricted.trim() === "1") {
      assert.equal(process.env.GITHUB_ACTIONS, "true", "Bu kabulün geçici AppArmor iznini izole GitHub runner'ında hazırla.");
      // Generate the exact production profile with the installer's own owner.
      const result = await execute("python3", [harness, "--sandbox-profile", join(app, "pofis")]);
      const [name, content] = JSON.parse(result.stdout);
      assert.match(name, /^pofis-[a-f0-9]{16}$/);
      appArmorFile = "/etc/apparmor.d/" + name;
      const profileSource = join(directory, "sandbox-profile");
      await writeFile(profileSource, content);
      await execute("sudo", ["install", "-o", "root", "-g", "root", "-m", "644", profileSource, appArmorFile]);
      await execute("sudo", ["apparmor_parser", "-r", appArmorFile]);
    }
    active = await fixture("0.0.1");
    let result = await install();
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /Pofis hazır/);
    const marker = join(profile, "preserve-test.txt");
    await writeFile(marker, "profile stays");
    const primary = await pids();
    result = await install();
    assert.equal(result.code, 0, result.output);
    assert.deepEqual(await pids(), primary, "same-version installation must reuse the instance");
    active = await fixture("0.0.2");
    result = await install(false, true);
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /TEST_CONSENT/);
    assert.doesNotMatch(result.output, /Zorla kapat/);
    assert.equal(JSON.parse(await readFile(join(installRoot, "installed.json"))).version, "0.0.2");
    assert.equal(await readFile(marker, "utf8"), "profile stays");
    await close();
    const successful = active;
    active = { ...active, version: "0.0.3", url: "0.0.3/Pofis-0.0.3-linux-x64.tar.gz" };
    result = await install();
    assert.notEqual(result.code, 0, result.output);
    active = await fixture("0.0.4", true);
    result = await install();
    assert.notEqual(result.code, 0, result.output);
    assert.equal(JSON.parse(await readFile(join(installRoot, "installed.json"))).version, "0.0.2");
    active = successful;
    result = await install();
    assert.equal(result.code, 0, result.output);
    await close();
    result = await install(true);
    assert.equal(result.code, 0, result.output);
    assert.equal(await readFile(marker, "utf8"), "profile stays");
    await assert.rejects(readFile(join(desktop, "app.pofis.client.desktop")), { code: "ENOENT" });
    console.log("Linux: kurulum, tek örnek, onaylı güncelleme, açılış hatasında geri alma ve profil koruyan kaldırma geçti.");
  } finally {
    server.stop(true);
    await close();
    if (appArmorFile) {
      await execute("sudo", ["apparmor_parser", "-R", appArmorFile]);
      await execute("sudo", ["rm", "--", appArmorFile]);
    }
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
