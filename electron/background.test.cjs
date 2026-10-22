const { expect, test } = require("bun:test");
const { EventEmitter } = require("node:events");
const { installBackground } = require("./background.cjs");

test.each(["win32", "darwin", "linux"])("%s pencere kapatması gizler; açık çıkış ve sistem kapanışı gerçek çıkıştır", platform => {
  const window = new EventEmitter(); let hidden = 0, prevented = 0, quit = 0, shown = 0, destroyed = 0, quitting = false;
  window.hide = () => hidden++;
  let menu;
  class Tray extends EventEmitter { setToolTip() {} setContextMenu(value) { menu = value; } destroy() { destroyed++; } }
  const background = installBackground({ app: { quit() { quit++; quitting = true; } }, window, Tray,
    Menu: { buildFromTemplate: value => value }, nativeImage: { createFromPath: () => ({ resize() { return this; }, setTemplateImage() {} }) },
    icon: "fixture", platform, showWindow: () => shown++, isQuitting: () => quitting });
  window.emit("close", { preventDefault: () => prevented++ });
  expect([hidden, prevented, quit]).toEqual([1, 1, 0]);
  menu[0].click(); expect(shown).toBe(1);
  menu[2].click(); window.emit("close", { preventDefault: () => prevented++ });
  expect([hidden, prevented, quit]).toEqual([1, 1, 1]);
  window.emit("query-session-end"); expect(quit).toBe(2);
  background.stop(); expect(destroyed).toBe(1);
});
