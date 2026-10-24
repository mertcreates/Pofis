const { access, readFile, writeFile, rm, mkdir } = require("node:fs/promises");
const { join, dirname } = require("node:path");

async function packServer(directory) {
  const { createPackage } = await import("@electron/asar");
  for (const file of [".next/BUILD_ID", "node_modules/next/package.json"]) await access(join(directory, file));
  const entry = await readFile(join(directory, "server.js"), "utf8");
  const changeDirectory = "process.chdir(__dirname)";
  if (entry.split(changeDirectory).length !== 2) {
    throw new Error("Next standalone girişinin çalışma dizini değişmiş; ASAR uyarlamasını kontrol et.");
  }
  // Electron can read ASAR paths; keep the real cwd supplied by utilityProcess.
  await writeFile(join(directory, "server.js"), entry.replace(changeDirectory, ""));
  const external = await Promise.all(["preload.cjs", "pofis-notifications.cjs", "pofis-scenarios.cjs", "ui-text.cjs"].map(async name =>
    [name, await readFile(join(directory, name))]));
  await createPackage(directory, join(dirname(directory), "server.asar"));
  await rm(directory, { recursive: true });
  await mkdir(directory);
  await writeFile(join(directory, "server.js"), "require('../server.asar/server.js');\n");
  for (const [name, contents] of external) await writeFile(join(directory, name), contents);
}

module.exports = { packServer };
