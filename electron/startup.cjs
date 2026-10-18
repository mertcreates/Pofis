const { mkdir, writeFile, rename } = require("node:fs/promises");
const { join } = require("node:path");

function startupId(argv) {
  const id = argv.find(value => value.startsWith("--startup-id="))?.slice(13);
  return /^[a-f0-9]{32}$/.test(id || "") ? id : null;
}

async function writeStartupResult(directory, id, result) {
  if (!id) return;
  const folder = join(directory, "launch-results");
  await mkdir(folder, { recursive: true });
  const target = join(folder, `${id}.json`);
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify({ schemaVersion: 1, requestId: id, ...result }), { flag: "wx" });
  await rename(temporary, target);
}

module.exports = { startupId, writeStartupResult };
