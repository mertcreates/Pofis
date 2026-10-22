const { resolve, join, sep } = require("node:path");
const { platformTarget } = require("../../electron/platform.cjs");
const { UNIX_INSTALL_COMMAND } = require("./install-command.cjs");

function serveReleases(directory, port = 4173) {
  const root = resolve(directory);
  return Bun.serve({ hostname: "127.0.0.1", port, async fetch(request) {
    let path;
    try { path = resolve(root, `.${decodeURIComponent(new URL(request.url).pathname)}`); }
    catch { return new Response("Geçersiz yol", { status: 400 }); }
    if (!path.startsWith(root + sep)) return new Response("Bulunamadı", { status: 404 });
    const file = Bun.file(path);
    if (!(await file.exists())) return new Response("Bulunamadı", { status: 404 });
    return new Response(file, { headers: {
      "Content-Type": /\.(ps1|sh)$/.test(path) ? "text/plain; charset=utf-8" : path.endsWith(".json") ? "application/json" : path.endsWith(".tar.gz") ? "application/gzip" : "application/zip",
      "Cache-Control": "no-store",
    } });
  } });
}

if (require.main === module) {
  const target = platformTarget();
  const server = serveReleases(process.argv[2] || join(__dirname, "../../dist/releases", target.releaseDirectory));
  console.log(`Yerel dağıtım: http://127.0.0.1:${server.port}`);
  if (target.platform === "win32") {
    console.log(`& ([scriptblock]::Create((irm http://127.0.0.1:${server.port}/install.ps1).TrimStart([char]0xFEFF))) -ManifestUrl http://127.0.0.1:${server.port}/latest.json`);
  } else {
    console.log(UNIX_INSTALL_COMMAND.replace("https://pofis.app/install.sh", `http://127.0.0.1:${server.port}/install.sh`) +
      ` -s -- --manifest-url http://127.0.0.1:${server.port}/latest.json`);
  }
}
module.exports = { serveReleases };
