const { test, expect } = require("bun:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, writeFile, rm } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const execute = promisify(execFile);
const bash = process.platform === "darwin" ? "/bin/bash" : process.env.POFIS_TEST_BASH;
const shellTest = bash ? test : test.skip;
const installer = resolve(__dirname, "install.sh");
const command = (code, args = []) => execute(bash, ["-c", 'source "$1"; ' + code, "pofis-test", installer, ...args]);

shellTest("macOS installer gerçek Bash ile geçerli ve geçersiz sürümleri ayırır", async () => {
  await command('valid_version 1.2.3; valid_version 1.10.0; older 1.9.9 1.10.0; ! older 1.10.0 1.9.9; ! older 1.0.0 1.0.0');
  for (const version of ["01.2.3", "1.2", "1.2.3-beta", "-1.2.3", "9999999.0.0"]) {
    await expect(command('valid_version "$2"', [version])).rejects.toThrow();
  }
  // Construct the newline inside Bash; MSYS strips trailing newlines in Windows argv.
  await expect(command("v=$'1.2.3\\n'; valid_version \"$v\"")).rejects.toThrow();
});

shellTest("macOS installer dışarı çıkan veya başka köklü arşiv yollarını reddeder", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-archive-paths-"));
  try {
    const list = join(directory, "entries.txt");
    await writeFile(list, "Pofis.app/Contents/MacOS/Pofis\n__MACOSX/Pofis.app/._Contents\n");
    await command('assert_archive_paths "$2"', [list]);
    for (const path of ["../escape", "/Pofis.app/Contents/a", "Pofis.app/../escape", "Pofis.app/./a", "other.app/a", "Pofis.app/a\\b"]) {
      await writeFile(list, path + "\n");
      await expect(command('assert_archive_paths "$2"', [list])).rejects.toThrow();
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

shellTest("macOS installer ağ isteğinden önce güvensiz adresleri reddeder", async () => {
  for (const url of ["http://example.com/package.zip", "file:///tmp/package.zip", "ftp://example.com/package.zip"]) {
    await expect(command('download "$2" /dev/null', [url])).rejects.toThrow("HTTPS");
  }
});
