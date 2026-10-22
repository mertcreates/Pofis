const { ui } = require("./ui-text.cjs");
const { execFile } = require("node:child_process");
const { createServer } = require("node:net");
const { randomBytes } = require("node:crypto");
const { access } = require("node:fs/promises");
const { join } = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");

const HOST = "127.0.0.1";
const PORT = 3210;
const ORIGIN = `http://${HOST}:${PORT}`;

async function selectPort(port) {
  const probePort = (requested) => new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(requested, HOST, () => {
      const selected = probe.address().port;
      probe.close(error => error ? reject(error) : resolve(selected));
    });
  });
  try { return await probePort(port); }
  catch (error) {
    if (error.code !== "EADDRINUSE" && error.code !== "EACCES") throw error;
    return probePort(0);
  }
}

async function stopProcessTree(child, { platform = process.platform, processGroup = false,
  kill = process.kill, timeoutMs = 2500 } = {}) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  if (platform !== "win32") {
    const pid = processGroup ? -child.pid : child.pid;
    const signal = (value) => {
      try { kill(pid, value); return true; }
      catch (error) { if (error.code === "ESRCH") return false; throw error; }
    };
    signal("SIGTERM");
    let deadline = Date.now() + timeoutMs;
    while (signal(0) && Date.now() < deadline) await delay(50);
    if (!signal(0)) return;
    signal("SIGKILL");
    deadline = Date.now() + timeoutMs;
    while (signal(0) && Date.now() < deadline) await delay(50);
    if (signal(0)) throw new Error(ui.desktop.processGroupStopFailed);
    return;
  }
  return new Promise((resolve, reject) => {
    // Kill only this owned PID and its descendants; never kill by executable name.
    execFile("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"],
      { windowsHide: true, timeout: 10000 }, (error) => {
        if (error && child.exitCode === null && child.signalCode === null) reject(error);
        else resolve();
      });
  });
}

function createDesktopServer({ root, fork, sessionDirectory, onUnexpectedExit, port = PORT, timeoutMs = 30000 }) {
  let child;
  let exited = false;
  let exitPromise;
  let stopping = false;
  let stopPromise;
  let failure;
  let ready = false;
  const controller = new AbortController();
  const token = randomBytes(24).toString("hex");
  let origin;
  async function stopChild() {
    if (!child || exited) return;
    const waitForExit = () => Promise.race([
      exitPromise.then(() => true), delay(2500, false, { ref: false }),
    ]);
    child.postMessage("shutdown");
    if (await waitForExit()) return;
    child.kill();
    if (await waitForExit()) return;
    // Next may handle SIGTERM; bound shutdown on both supported platforms.
    try { process.kill(child.pid, "SIGKILL"); }
    catch (error) { if (error.code !== "ESRCH") throw error; }
    if (!(await waitForExit())) throw new Error(ui.desktop.serverStopFailed);
  }
  async function isHealthy() {
    if (stopping || failure) return false;
    try {
      const response = await fetch(`${origin}/api/health`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(1000)]),
        redirect: "error",
      });
      const body = await response.json();
      return response.ok && response.headers.get("X-Pofis-Desktop") === token && body.status === "ok";
    } catch {
      // Refusal is expected during startup; a dead child is reported by its exit event.
      return false;
    }
  }
  return {
    isHealthy,
    async start() {
      await access(join(root, "server.js")).catch(() => {
        throw new Error(ui.desktop.serverMissing);
      });
      const selectedPort = await selectPort(port);
      origin = `http://${HOST}:${selectedPort}`;
      if (stopping) throw new Error(ui.desktop.startupCancelled);
      child = fork(join(__dirname, "server-entry.cjs"), [String(selectedPort)], {
        cwd: root,
        serviceName: "Pofis Sunucusu",
        stdio: "ignore",
        env: { ...process.env, NODE_ENV: "production", POFIS_SESSION_DIR: sessionDirectory,
          POFIS_PARENT_PID: String(process.pid), POFIS_DESKTOP_TOKEN: token, NEXT_TELEMETRY_DISABLED: "1" },
      });
      exitPromise = new Promise(resolve => child.once("exit", () => { exited = true; resolve(); }));
      child.once("error", () => {
        failure = new Error(ui.desktop.serverStartFailed);
        controller.abort();
      });
      child.once("exit", (code) => {
        failure = new Error(ui.desktop.serverClosed(code));
        controller.abort();
        if (ready && !stopping) onUnexpectedExit(failure);
      });
      const deadline = Date.now() + timeoutMs;
      while (!stopping && !failure && Date.now() < deadline) {
        // A port collision must never make us load another local application.
        if (await isHealthy()) {
          if (stopping || failure) break;
          ready = true;
          return origin;
        }
        await delay(150, undefined, { signal: controller.signal }).catch(() => {});
      }
      throw failure || new Error(stopping ? ui.desktop.startupCancelled : ui.desktop.serverTimeout);
    },
    stop() {
      stopping = true;
      controller.abort();
      return (stopPromise ||= stopChild());
    },
  };
}

module.exports = { createDesktopServer, stopProcessTree, PORT, ORIGIN };
