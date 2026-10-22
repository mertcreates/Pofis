const { test, expect } = require("bun:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { unixInstaller } = require("./unix-installer.cjs");
const { mkdtemp, writeFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const bash = process.platform === "win32" ? process.env.POFIS_TEST_BASH : "/bin/bash";
const execute = promisify(execFile);

(bash ? test : test.skip)("tek Unix installer iki platformda yalnız doğru gövdeyi çalıştırır; argüman ve hata kodu korunur", async () => {
  const script = await unixInstaller({ darwin: '#!/bin/bash\nprintf "mac:%s" "$1"; exit 23\n',
    linux: '#!/bin/bash\nprintf "linux:%s" "$1"; exit 24\n' });
  for (const [platform, code, output] of [["Darwin", 23, "mac:iki kelime"], ["Linux", 24, "linux:iki kelime"],
    ["MINGW64_NT", 1, ""]]) {
    const selected = script.replace('"$(/usr/bin/uname -s)"', '"' + platform + '"');
    const failure = await execute(bash, ["-c", selected, "pofis-test", "iki kelime"]).then(() => null, error => error);
    expect(failure?.code).toBe(code);
    expect(failure?.stdout).toBe(output);
    if (!output) expect(failure?.stderr).toContain("macOS ve Linux");
  }
});

(bash ? test : test.skip)("gerçek iki installer gövdesi tek Bash dosyası olarak ayrıştırılır", async () => {
  const script = await unixInstaller();
  // -n parses both branches, including the Linux Python heredoc, without running either.
  const directory = await mkdtemp(join(tmpdir(), "pofis-unix-installer-"));
  try {
    const file = join(directory, "install.sh");
    await writeFile(file, script);
    await execute(bash, ["-n", file]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
