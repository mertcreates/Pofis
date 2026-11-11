const { posix } = require("node:path");
const { until } = require("./acceptance-wait.cjs");

// LaunchServices children escape the CI process group. Own them by the exact
// executable paths inside this disposable bundle, never by a global app name.
function fixtureProcesses({ appPath, execute, kill = process.kill, timeoutMs = 10000 }) {
  const main = `${appPath}/Contents/MacOS/Pofis`;
  const frameworks = `${appPath}/Contents/Frameworks/`;
  const list = async () => {
    const { stdout } = await execute("/bin/ps", ["-ww", "-axo", "pid=,stat=,comm="], { timeout: timeoutMs });
    return stdout.split("\n").map(line => line.trim().match(/^(\d+)\s+(\S+)\s+(.*)$/)).filter(Boolean)
      .filter(([, , state, path]) => {
        if (state.startsWith("Z")) return false;
        if (path === main) return true;
        if (!path.startsWith(frameworks)) return false;
        const name = posix.basename(path);
        return /^Pofis Helper(?: \([A-Za-z]+\))?$/.test(name) &&
          path === `${frameworks}${name}.app/Contents/MacOS/${name}`;
      }).map(([, pid, , path]) => ({ pid: Number(pid), main: path === main }));
  };
  const wait = async () => {
    const message = "Test paketinin süreçleri kapanmadı.";
    let remaining = [];
    try {
      await until(async () => {
        remaining = await list();
        return remaining.length === 0;
      }, timeoutMs, message);
    } catch (error) {
      if (error.message !== message || remaining.length === 0) throw error;
      const pids = remaining.map(({ pid, main }) => `${pid} (${main ? "ana" : "yardımcı"})`).join(", ");
      throw new Error(`${message} Son gözlenen PID’ler: ${pids}`, { cause: error });
    }
  };
  const close = async ({ force = false } = {}) => {
    try {
      if ((await list()).some(process => process.main)) {
        // Use the installer's native quit request for this exact bundle.
        await execute("/usr/bin/osascript", ["-e",
          "on run argv\nwith timeout of 5 seconds\ntell application (item 1 of argv) to quit\nend timeout\nend run", appPath],
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
