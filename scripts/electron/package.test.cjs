const { test, expect } = require("bun:test");
const { mkdtemp, mkdir, writeFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { verifyRuntime } = require("./package.cjs");

test("Intel darwin-x64 runtime doğrulamasında statik PlistBuddy ve lipo sözleşmesini kullanır", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-runtime-x64-"));
  const framework = join(directory, "Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A");
  const executable = join(directory, "Electron.app/Contents/MacOS/Electron");
  try {
    await mkdir(join(framework, "Resources"), { recursive: true });
    await mkdir(join(executable, ".."), { recursive: true });
    await writeFile(executable, "x86_64 binary stub");
    await writeFile(join(framework, "Electron Framework"), "x86_64 framework stub");
    await writeFile(join(framework, "Resources/Info.plist"), "<plist>CFBundleVersion 43.8.1</plist>");
    await writeFile(join(directory, "version"), "v43.8.1\n");

    const calls = [];
    const mockRun = async (command, args) => {
      calls.push({ command, args });
      if (command.endsWith("PlistBuddy")) return { stdout: "43.8.1\n" };
      if (command.endsWith("lipo")) return { stdout: "" };
      throw new Error(`Beklenmeyen komut: ${command}`);
    };

    const target = { id: "darwin-x64", platform: "darwin", arch: "x64", electronExecutable: "Electron.app/Contents/MacOS/Electron" };
    await verifyRuntime(directory, target, "43.8.1", mockRun);

    expect(calls).toHaveLength(3);
    expect(calls[0].command).toBe("/usr/libexec/PlistBuddy");
    expect(calls[0].args).toEqual(["-c", "Print :CFBundleVersion", join(framework, "Resources/Info.plist")]);
    expect(calls[1].command).toBe("/usr/bin/lipo");
    expect(calls[1].args).toEqual([executable, "-verify_arch", "x86_64"]);
    expect(calls[2].command).toBe("/usr/bin/lipo");
    expect(calls[2].args).toEqual([join(framework, "Electron Framework"), "-verify_arch", "x86_64"]);

    // Tutarsız sürüm durumunda hata
    await writeFile(join(directory, "version"), "v44.0.0\n");
    await expect(verifyRuntime(directory, target, "43.8.1", mockRun))
      .rejects.toThrow("kurulum tutarsız");

    // lipo mimari reddi durumunda hata
    await writeFile(join(directory, "version"), "v43.8.1\n");
    const failingLipo = async (command, args) => {
      if (command.endsWith("PlistBuddy")) return { stdout: "43.8.1\n" };
      if (command.endsWith("lipo")) throw new Error("not x86_64 architecture");
      throw new Error(`Beklenmeyen komut: ${command}`);
    };
    await expect(verifyRuntime(directory, target, "43.8.1", failingLipo))
      .rejects.toThrow("not x86_64 architecture");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Diğer platformlarda (arm64, win32) dinamik runtime sorgusu çalıştırılır", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-runtime-dyn-"));
  const executable = join(directory, "Electron.app/Contents/MacOS/Electron");
  try {
    await mkdir(join(executable, ".."), { recursive: true });
    await writeFile(executable, "arm64 stub");

    const calls = [];
    const mockRun = async (command, args, options) => {
      calls.push({ command, args, options });
      return { stdout: JSON.stringify({ platform: "darwin", arch: "arm64", electron: "43.8.1" }) };
    };

    const target = { id: "darwin-arm64", platform: "darwin", arch: "arm64", electronExecutable: "Electron.app/Contents/MacOS/Electron" };
    await verifyRuntime(directory, target, "43.8.1", mockRun);

    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe(executable);
    expect(calls[0].args[0]).toBe("-p");
    expect(calls[0].options.env.ELECTRON_RUN_AS_NODE).toBe("1");

    // Sürüm uyuşmazlığı hatası
    await expect(verifyRuntime(directory, target, "44.9.0", mockRun))
      .rejects.toThrow("kilitli sürüm 44.9.0");

    // Mimari uyuşmazlığı hatası
    const mismatchRun = async () => ({
      stdout: JSON.stringify({ platform: "darwin", arch: "x64", electron: "43.8.1" }),
    });
    await expect(verifyRuntime(directory, target, "43.8.1", mismatchRun))
      .rejects.toThrow("Bun darwin-arm64");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
