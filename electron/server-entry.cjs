const { join } = require("node:path");

// UtilityProcess uses a message port rather than Node's child_process IPC pipe.
process.parentPort.on("message", event => {
  if (event.data === "shutdown") process.exit(0);
});
const parentPid = Number(process.env.POFIS_PARENT_PID);
if (!Number.isSafeInteger(parentPid) || parentPid <= 0) throw new Error("Pofis ana süreç kimliği eksik.");
// Also cover a main-process crash, where before-quit cannot send shutdown.
setInterval(() => {
  try { process.kill(parentPid, 0); }
  catch (error) {
    if (error.code === "ESRCH") process.exit(0);
    throw error;
  }
}, 1000).unref();
process.env.PORT = process.argv[2];
process.env.HOSTNAME = "127.0.0.1";
require(join(process.cwd(), "server.js"));
