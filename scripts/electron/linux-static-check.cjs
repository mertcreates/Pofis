const { open, readFile, readdir, stat, access } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { assertPortableStandalone } = require("./standalone.cjs");

async function header(file) {
  const handle = await open(file, "r");
  try {
    const bytes = Buffer.alloc(20);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    return bytes.subarray(0, bytesRead);
  } finally { await handle.close(); }
}

function assertX64Elf(bytes, file) {
  if (bytes.length < 20 || !bytes.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])) ||
      bytes[4] !== 2 || bytes[5] !== 1 || bytes.readUInt16LE(18) !== 62) {
    throw new Error(`Linux x64 ELF dosyası bekleniyor: ${file}`);
  }
}

async function verifyLinuxRuntime(directory, version) {
  const installed = (await readFile(join(directory, "version"), "utf8")).trim().replace(/^v/, "");
  if (installed !== version) throw new Error(`Electron ${installed}, kilitli sürüm ${version}; kurulum tutarsız.`);
  const executable = join(directory, "electron");
  assertX64Elf(await header(executable), executable);
}

async function checkLinuxPackage(directory) {
  const metadata = JSON.parse(await readFile(join(directory, "release.json"), "utf8"));
  const app = join(directory, "resources/app");
  const manifest = JSON.parse(await readFile(join(app, "package.json"), "utf8"));
  if (metadata.schemaVersion !== 1 || metadata.platform !== "linux" || metadata.arch !== "x64" ||
      !/^\d+\.\d+\.\d+$/.test(manifest.version) || metadata.version !== manifest.version) {
    throw new Error("Linux paketinin sürüm, platform ve mimari bilgileri uyuşmuyor.");
  }
  for (const name of ["pofis", "chrome-sandbox", "chrome_crashpad_handler", "uninstall.sh"]) {
    const file = join(directory, name);
    const info = await stat(file);
    if (!info.isFile() || (info.mode & 0o111) !== 0o111) throw new Error(`Çalıştırılabilir dosya bekleniyor: ${file}`);
    if (name !== "uninstall.sh") assertX64Elf(await header(file), file);
  }
  for (const name of ["electron/main.cjs", "electron/server.cjs", "electron/server-entry.cjs", "electron/startup.cjs",
    "electron/platform.cjs", "electron/background.cjs", "electron/transport.cjs", "electron/update-bridge.cjs",
    "server/server.js", "server/preload.cjs", "server/pofis-notifications.cjs", "server/.next/BUILD_ID", "public/pofi/pofi-mark-256.png"]) {
    await access(join(app, name));
  }
  let count = 0;
  async function visit(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = join(folder, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) {
        const bytes = await header(file);
        if (bytes.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])) || /\.(?:node|so(?:\.\d+)*)$/.test(entry.name)) {
          assertX64Elf(bytes, file);
          count++;
        }
      } else throw new Error(`Linux paketinde normal dosya veya klasör bekleniyor: ${file}`);
    }
  }
  await visit(directory);
  await assertPortableStandalone(join(app, "server"));
  console.log(`Linux statik paket kontrolü: ${count} x64 ELF, izinler, taşınabilir sunucu ve zorunlu dosyalar doğrulandı.`);
}

if (require.main === module) {
  if (!process.argv[2]) throw new Error("Kullanım: bun linux-static-check.cjs <paket-klasörü>");
  checkLinuxPackage(resolve(process.argv[2])).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { checkLinuxPackage, verifyLinuxRuntime };
