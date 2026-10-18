const { readFile, writeFile, mkdir } = require("node:fs/promises");
const { join } = require("node:path");

async function prepareIcons(source, directory) {
  const png = await readFile(source);
  if (png.length < 24 || !png.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) ||
      png.readUInt32BE(16) !== 256 || png.readUInt32BE(20) !== 256) {
    throw new Error("Pofis simgesi 256×256 PNG olmalı.");
  }
  // Both native formats can contain the original PNG bytes unchanged.
  const ico = Buffer.alloc(22);
  ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
  ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
  ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18);
  const icns = Buffer.alloc(16);
  icns.write("icns", 0); icns.writeUInt32BE(png.length + 16, 4);
  icns.write("ic08", 8); icns.writeUInt32BE(png.length + 8, 12);
  await mkdir(directory, { recursive: true });
  const windows = join(directory, "Pofis.ico");
  const macos = join(directory, "Pofis.icns");
  await writeFile(windows, Buffer.concat([ico, png]));
  await writeFile(macos, Buffer.concat([icns, png]));
  return { windows, macos };
}

module.exports = { prepareIcons };
