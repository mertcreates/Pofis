const { expect, test } = require("bun:test");
const { assertSiteCommands, UNIX_INSTALL_COMMAND, WINDOWS_INSTALL_COMMAND } = require("./install-command.cjs");

test("yayın önkontrolü ortak Unix komutu olan landing'i kabul eder; eski platform seçimini durdurur", () => {
  const unix = { id: "unix", command: UNIX_INSTALL_COMMAND };
  const windows = { id: "windows", command: WINDOWS_INSTALL_COMMAND };
  expect(() => assertSiteCommands({ install: { platforms: [unix, windows] } })).not.toThrow();
  for (const platforms of [[{ ...unix, id: "macos" }, windows], [unix, windows, { id: "linux" }],
    [{ ...unix, command: "curl https://other.example/install.sh | bash" }, windows], [unix], null]) {
    expect(() => assertSiteCommands({ install: { platforms } })).toThrow("Önce landing");
  }
});
