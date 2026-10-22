const { posix } = require("node:path");
const { until } = require("./acceptance-wait.cjs");

// LaunchServices children escape the CI process group. Own them by the exact
// executable paths inside this disposable bundle, never by a global app name.
function fixtureProcesses({ appPath, profile, execute, kill = process.kill, timeoutMs = 5000 }) {
  const main = `${appPath}/Contents/MacOS/Pofis`;
  const frameworks = `${appPath}/Contents/Frameworks/`;
  const list = async () => {
    const { stdout } = await execute("/bin/ps", ["-ww", "-axo", "pid=,comm="], { timeout: timeoutMs });
    return stdout.split("\n").map(line => line.trim().match(/^(\d+)\s+(.*)$/)).filter(Boolean)
      .filter(([, , path]) => {
        if (path === main) return true;
        if (!path.startsWith(frameworks)) return false;
        const name = posix.basename(path);
        return /^Pofis Helper(?: \([A-Za-z]+\))?$/.test(name) &&
          path === `${frameworks}${name}.app/Contents/MacOS/${name}`;
      }).map(([, pid, path]) => ({ pid: Number(pid), main: path === main }));
  };
  const wait = () => until(async () => (await list()).length === 0, timeoutMs,
    "Test paketinin süreçleri kapanmadı; geçici dosyalar korundu.");
  const close = async ({ force = false } = {}) => {
    try {
      if ((await list()).some(process => process.main)) {
        await execute("/usr/bin/open", ["-n", appPath, "--args", "--pofis-quit", `--user-data-dir=${profile}`],
          { timeout: timeoutMs });
      }
      await wait();
    } catch (error) {
      if (!force) throw error;
      // Rescan immediately before signalling: only fixture-owned live paths qualify.
      for (const { pid } of await list()) {
        if (!(await list()).some(process => process.pid === pid)) continue;
        try { kill(pid, "SIGKILL"); }
        catch (error) { if (error.code !== "ESRCH") throw error; }
      }
      await wait();
    }
  };
  return { list, close };
}

module.exports = { fixtureProcesses };
