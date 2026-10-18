const { spawn } = require("node:child_process");
const { cp } = require("node:fs/promises");
const { join, resolve } = require("node:path");

async function build() {
  const root = resolve(__dirname, "../..");
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--bun", join(root, "node_modules", "next", "dist", "bin", "next"), "build"], {
      cwd: root, stdio: "inherit", env: { ...process.env, POFIS_STANDALONE: "1" },
    });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Next.js derlemesi başarısız (${code}).`)));
  });
  const standalone = join(root, ".next", "standalone");
  await cp(join(root, "public"), join(standalone, "public"), { recursive: true });
  await cp(join(root, ".next", "static"), join(standalone, ".next", "static"), { recursive: true });
}

build().catch(error => { console.error(error.message); process.exitCode = 1; });
