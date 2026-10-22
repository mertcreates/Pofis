const UNIX_INSTALL_COMMAND = "curl -fsSL https://pofis.app/install.sh | bash";
const WINDOWS_INSTALL_COMMAND = "irm https://pofis.app/install.ps1 | iex";

function assertSiteCommands(content) {
  const platforms = content?.install?.platforms;
  if (!Array.isArray(platforms) || platforms.length !== 2 ||
      platforms.find(item => item.id === "unix")?.command !== UNIX_INSTALL_COMMAND ||
      platforms.find(item => item.id === "windows")?.command !== WINDOWS_INSTALL_COMMAND) {
    throw new Error("Landing ortak macOS / Ubuntu ve Windows kurulum komutlarını içermeli. Önce landing kaynaklarını güncelle.");
  }
}

module.exports = { UNIX_INSTALL_COMMAND, WINDOWS_INSTALL_COMMAND, assertSiteCommands };
