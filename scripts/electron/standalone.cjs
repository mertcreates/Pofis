const { readdir, stat, open, realpath, readFile } = require("node:fs/promises");
const { join, relative } = require("node:path");

const nativeMagic = new Set([0xfeedface, 0xcefaedfe, 0xfeedfacf, 0xcffaedfe,
  0xcafebabe, 0xbebafeca, 0xcafebabf, 0xbfbafeca, 0x7f454c46]);

// The desktop server is shared by macOS and Linux targets. Follow Next's junctions too.
async function assertPortableStandalone(directory) {
  await readFile(join(directory, "server.js"));
  const visited = new Set();
  async function visit(folder) {
    const canonical = await realpath(folder);
    if (visited.has(canonical)) return;
    visited.add(canonical);
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = join(folder, entry.name);
      const info = entry.isSymbolicLink() ? await stat(file) : entry;
      if (info.isDirectory()) await visit(file);
      else if (info.isFile()) {
        let native = /\.(?:node|dll|dylib|so(?:\.\d+)*)$/i.test(entry.name);
        if (!native) {
          const handle = await open(file, "r");
          try {
            const header = Buffer.alloc(4);
            const { bytesRead } = await handle.read(header, 0, 4, 0);
            native = bytesRead >= 2 && header.subarray(0, 2).toString("ascii") === "MZ" ||
              bytesRead === 4 && nativeMagic.has(header.readUInt32BE(0));
          } finally { await handle.close(); }
        }
        if (native) throw new Error(`Ortak sunucu çıktısında native dosya var: ${relative(directory, file)}. Bu bağımlılığı hedef mimariye göre paketle.`);
      }
    }
  }
  await visit(directory);
}

module.exports = { assertPortableStandalone };
