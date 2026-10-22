const { expect, test } = require("bun:test");
const { assertSiteCommands, readSiteContent, UNIX_INSTALL_COMMAND, WINDOWS_INSTALL_COMMAND } = require("./install-command.cjs");

test("landing kataloğu veri olarak okunur; ifadeler ve yan etkiler çalıştırılmaz", () => {
  const source = value => `export const content = ${value} as const;\nexport type Content = typeof content;`;
  expect(readSiteContent(source('{install: {platforms: [{id: "unix", command: "curl, id: test",},],},}')))
    .toEqual({ install: { platforms: [{ id: "unix", command: "curl, id: test" }] } });
  globalThis.pofisCatalogueExecuted = false;
  try {
    for (const input of [
      source('{install: (globalThis.pofisCatalogueExecuted = true)}'),
      source('{get install() { globalThis.pofisCatalogueExecuted = true; }}'),
      source('{...process.env}'),
      source('{}') + '\nglobalThis.pofisCatalogueExecuted = true;',
    ]) expect(() => readSiteContent(input)).toThrow();
    expect(globalThis.pofisCatalogueExecuted).toBe(false);
  } finally { delete globalThis.pofisCatalogueExecuted; }
});

test("yayın önkontrolü ortak Unix komutu olan landing'i kabul eder; eski platform seçimini durdurur", () => {
  const unix = { id: "unix", command: UNIX_INSTALL_COMMAND };
  const windows = { id: "windows", command: WINDOWS_INSTALL_COMMAND };
  expect(() => assertSiteCommands({ install: { platforms: [unix, windows] } })).not.toThrow();
  for (const platforms of [[{ ...unix, id: "macos" }, windows], [unix, windows, { id: "linux" }],
    [{ ...unix, command: "curl https://other.example/install.sh | bash" }, windows], [unix], null]) {
    expect(() => assertSiteCommands({ install: { platforms } })).toThrow("Önce landing");
  }
});
