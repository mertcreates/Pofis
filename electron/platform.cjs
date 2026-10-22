const { ui } = require("./ui-text.cjs");
const { join } = require("node:path");

function platformTarget(platform = process.platform, arch = process.arch) {
  if ((platform !== "win32" || arch !== "x64") &&
      (platform !== "darwin" || !["x64", "arm64"].includes(arch)) &&
      (platform !== "linux" || arch !== "x64")) {
    throw new Error(ui.internalErrors.unsupportedTarget(platform, arch));
  }
  const mac = platform === "darwin";
  const linux = platform === "linux";
  return {
    platform, arch, id: `${platform}-${arch}`,
    outputDirectory: mac ? "macos" : linux ? "linux" : "windows",
    releaseDirectory: mac ? join("macos", arch) : linux ? join("linux", arch) : "windows",
    executable: mac ? join("Pofis.app", "Contents", "MacOS", "Pofis") : linux ? "pofis" : "Pofis.exe",
    resources: mac ? join("Pofis.app", "Contents", "Resources") : "resources",
    electronExecutable: mac ? join("Electron.app", "Contents", "MacOS", "Electron") : linux ? "electron" : "electron.exe",
    metadataFile: mac ? join("Pofis.app", "Contents", "Resources", "release.json") : "release.json",
    archiveExtension: linux ? "tar.gz" : "zip",
    installer: mac ? "install-macos.sh" : linux ? "install-linux.sh" : "install.ps1",
  };
}

module.exports = { platformTarget };
