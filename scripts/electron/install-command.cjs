const UNIX_INSTALL_COMMAND = "curl -fsSL https://pofis.app/install.sh | bash";
const WINDOWS_INSTALL_COMMAND = "irm https://pofis.app/install.ps1 | iex";

function readSiteContent(source) {
  // The landing catalogue is a literal, not a module to execute on a release runner.
  const match = /^\s*export const content = (\{[\s\S]*\}) as const;\s*export type Content = typeof content;\s*$/.exec(source);
  if (!match) throw new Error("Landing içerik kataloğu veri nesnesi olmalı.");
  const json = match[1].replace(/"(?:\\.|[^"\\])*"|([A-Za-z_$][\w$]*)\s*:|,(?=\s*[}\]])/g,
    (token, key) => key ? JSON.stringify(key) + ":" : token === "," ? "" : token);
  try { return JSON.parse(json); }
  catch { throw new Error("Landing içerik kataloğu yalnız JSON değerleri içermeli."); }
}

function assertSiteCommands(content) {
  const platforms = content?.install?.platforms;
  if (!Array.isArray(platforms) || platforms.length !== 2 ||
      platforms.find(item => item.id === "unix")?.command !== UNIX_INSTALL_COMMAND ||
      platforms.find(item => item.id === "windows")?.command !== WINDOWS_INSTALL_COMMAND) {
    throw new Error("Landing ortak macOS / Ubuntu ve Windows kurulum komutlarını içermeli. Önce landing kaynaklarını güncelle.");
  }
}

module.exports = { UNIX_INSTALL_COMMAND, WINDOWS_INSTALL_COMMAND, assertSiteCommands, readSiteContent };
