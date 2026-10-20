const { readdir, open, access, readFile } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { platformTarget } = require("../../electron/platform.cjs");

// Inspect every real Mach-O file, including extensionless helpers and native addons.
async function checkIntelPackage(directory, execute = promisify(execFile)) {
  const target = platformTarget("darwin", "x64");
  const bundle = join(directory, "Pofis.app");
  const resources = join(directory, target.resources);
  const metadata = JSON.parse(await readFile(join(resources, "release.json"), "utf8"));
  const manifest = JSON.parse(await readFile(join(resources, "app/package.json"), "utf8"));
  if (metadata.schemaVersion !== 1 || metadata.platform !== "darwin" || metadata.arch !== "x64" || metadata.version !== manifest.version) {
    throw new Error("Intel paket bilgileri uyuşmuyor. release.json ile uygulamanın platform, mimari ve sürümünü kontrol et.");
  }
  for (const file of [target.executable, join(target.resources, "app/electron/main.cjs"),
    join(target.resources, "app/server/server.js")]) {
    await access(join(directory, file));
  }
  const magic = new Set([0xfeedface, 0xcefaedfe, 0xfeedfacf, 0xcffaedfe,
    0xcafebabe, 0xbebafeca, 0xcafebabf, 0xbfbafeca]);
  let count = 0;
  async function visit(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = join(folder, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) {
        const handle = await open(file, "r");
        let native;
        try {
          const header = Buffer.alloc(4);
          const { bytesRead } = await handle.read(header, 0, 4, 0);
          native = bytesRead === 4 && magic.has(header.readUInt32BE(0));
        } finally { await handle.close(); }
        if (native) {
          await execute("/usr/bin/lipo", [file, "-verify_arch", "x86_64"]);
          count++;
        }
      }
    }
  }
  await visit(bundle);
  if (!count) throw new Error("Intel paketinde Mach-O dosyası bulunamadı. Paket klasörünü kontrol et.");
  await execute("/usr/bin/codesign", ["--verify", "--deep", "--strict", bundle]);
  console.log(`Intel statik paket kontrolü: ${count} Mach-O, imza ve zorunlu dosyalar doğrulandı.`);
}

if (require.main === module) {
  if (process.platform !== "darwin" || !process.argv[2]) throw new Error("Kullanım: macOS üzerinde bun macos-static-check.cjs <paket-klasörü>");
  checkIntelPackage(resolve(process.argv[2])).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { checkIntelPackage };
