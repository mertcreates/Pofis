const { spawn } = require("node:child_process");
const { readdir, access } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { platformTarget } = require("../../electron/platform.cjs");

async function launch() {
  const root = resolve(__dirname, "../..");
  const target = platformTarget();
  const packages = join(root, "dist", target.outputDirectory);
  const supplied = process.argv[2];
  const names = supplied ? [] : (await readdir(packages)).filter(name => name.startsWith(`Pofis-${target.id}-`)).sort();
  if (!supplied && !names.length) throw new Error("Önce bun run desktop:package çalıştır.");
  const folder = supplied ? resolve(supplied) : join(packages, names.at(-1));
  const executable = join(folder, target.executable);
  await access(join(folder, target.resources, "app", "server", "pofis-scenarios.cjs"));
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(executable, ["--pofis-scenarios"], { env, detached: true, stdio: "ignore", windowsHide: true });
  child.on("error", error => { console.error("Senaryo modu açılamadı:", error.message); process.exitCode = 1; });
  child.unref();
  console.log(`Senaryo paketi: ${folder}\nPofis simgesine sağ tık → Senaryo modu. Gerçek hesap profili kullanılmaz.`);
}
launch().catch(error => { console.error(error.message); process.exitCode = 1; });
