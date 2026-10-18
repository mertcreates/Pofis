const { spawn } = require("node:child_process");
const { resolve } = require("node:path");

if (!process.versions.bun) throw new Error("Başlatıcıyı Bun ile çalıştır.");
const env = { ...process.env };
// Codex/Node callers may carry this flag; the child must start the Electron app.
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require("electron"), [resolve(__dirname, "../../electron")], {
  detached: true,
  windowsHide: true,
  stdio: "ignore",
  env,
});
child.on("error", (error) => {
  console.error("Pofis başlatılamadı:", error.code);
  process.exitCode = 1;
});
child.unref();
