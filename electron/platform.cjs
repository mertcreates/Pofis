const { join } = require("node:path");

function platformTarget(platform = process.platform, arch = process.arch) {
  if ((platform !== "win32" || arch !== "x64") &&
      (platform !== "darwin" || !["x64", "arm64"].includes(arch))) {
    throw new Error(`Desteklenmeyen Pofis hedefi: ${platform}/${arch}`);
  }
  const mac = platform === "darwin";
  return {
    platform, arch, id: `${platform}-${arch}`,
    outputDirectory: mac ? "macos" : "windows",
    releaseDirectory: mac ? join("macos", arch) : "windows",
    executable: mac ? join("Pofis.app", "Contents", "MacOS", "Pofis") : "Pofis.exe",
    resources: mac ? join("Pofis.app", "Contents", "Resources") : "resources",
    electronExecutable: mac ? join("Electron.app", "Contents", "MacOS", "Electron") : "electron.exe",
    metadataFile: mac ? join("Pofis.app", "Contents", "Resources", "release.json") : "release.json",
  };
}

module.exports = { platformTarget };
