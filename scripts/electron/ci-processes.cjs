const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { setTimeout: delay } = require("node:timers/promises");

async function stopCIProcesses(child, { processGroup = false, timeoutMs = 15000,
  execute = promisify(execFile), kill = process.kill } = {}) {
  // detached does not prove that Bun created a group whose ID is child.pid.
  // Capture ancestry before signalling so reparented children remain owned.
  const owned = new Set(child.exitCode == null && child.signalCode == null ? [child.pid] : []);
  const scan = async () => {
    const { stdout } = await execute("/bin/ps", ["-axo", "pid=,ppid=,pgid=,stat="], { timeout: 3000 });
    const rows = stdout.split("\n").filter(line => line.trim()).map(line => {
      const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s*$/);
      if (!match) throw new Error(`Geçersiz CI süreç durumu: ${line}`);
      return { pid: Number(match[1]), parent: Number(match[2]), group: Number(match[3]), state: match[4] };
    }).filter(row => !row.state.startsWith("Z"));
    for (const pid of owned) if (!rows.some(row => row.pid === pid)) owned.delete(pid);
    let added;
    do {
      added = false;
      for (const row of rows) {
        if (!owned.has(row.pid) && (owned.has(row.parent) || (processGroup && row.group === child.pid))) {
          owned.add(row.pid); added = true;
        }
      }
    } while (added);
    return rows.filter(row => owned.has(row.pid));
  };
  let alive = await scan();
  for (const signal of ["SIGTERM", "SIGKILL"]) {
    for (const { pid } of alive) {
      try { kill(pid, signal); }
      catch (error) { if (error.code !== "ESRCH") throw error; }
    }
    const deadline = Date.now() + timeoutMs;
    while ((alive = await scan()).length && Date.now() < deadline) await delay(50);
    if (!alive.length) return;
  }
  throw new Error(`CI alt süreçleri kapanmadı: ${alive.map(row => row.pid).join(", ")}`);
}

module.exports = { stopCIProcesses };
