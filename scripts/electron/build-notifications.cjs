const { resolve, join } = require("node:path");

async function buildNotifications(directory = resolve(__dirname, "../../.next/standalone")) {
  const result = await Bun.build({
    entrypoints: [resolve(__dirname, "../../src/desktop/install-notifications.ts")],
    outdir: directory, naming: "pofis-notifications.cjs", target: "node", format: "cjs",
    external: ["electron"],
  });
  if (!result.success) throw new Error(result.logs.map(log => log.message).join("\n"));
  // Bundle shared copy into the sandboxed preload; it cannot require local files.
  const shared = await Bun.build({
    entrypoints: [resolve(__dirname, "../../src/lib/ui-text.js"), resolve(__dirname, "../../electron/preload.cjs")],
    outdir: directory, naming: "[name].cjs", target: "node", format: "cjs",
    external: ["electron"],
  });
  if (!shared.success) throw new Error(shared.logs.map(log => log.message).join("\n"));
  return join(directory, "pofis-notifications.cjs");
}
if (require.main === module) buildNotifications(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { buildNotifications };
