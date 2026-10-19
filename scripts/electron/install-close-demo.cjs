const { spawn } = require("node:child_process");
const { join } = require("node:path");

const args = process.argv.slice(2);
if (process.platform !== "win32" || args.some(arg => !["--force", "--preview"].includes(arg))) {
  console.error("Windows terminalinde: bun run desktop:install-demo [--force] [--preview]");
  process.exitCode = 1;
} else {
  const script = join(__dirname, "install-close-demo.ps1").replaceAll("'", "''");
  // In-memory execution also works with the user's Restricted execution policy.
  const installer = join(__dirname, "install.ps1").replaceAll("'", "''");
  const command = `& ([scriptblock]::Create([IO.File]::ReadAllText('${script}'))) -InstallerPath '${installer}' ${args.includes("--force") ? "-ForceClose" : ""} ${args.includes("--preview") ? "-Preview" : ""}`;
  const child = spawn(join(process.env.SystemRoot, "System32/WindowsPowerShell/v1.0/powershell.exe"),
    ["-NoProfile", "-Command", command],
    { stdio: "inherit", windowsHide: true });
  child.once("error", error => { console.error(error.message); process.exitCode = 1; });
  child.once("exit", code => { process.exitCode = code ?? 1; });
}
