const { expect, test } = require("bun:test");
const { EventEmitter } = require("node:events");
const { installBackground, showWindow } = require("./background.cjs");

test.each(["win32", "darwin", "linux"])("%s açılış isteği gizli/küçültülmüş pencereyi gösterir ve odaklar", platform => {
  let appHidden = platform === "darwin", minimized = true, visible = false, focused = false;
  const window = {
    isMinimized: () => minimized,
    restore() { minimized = false; },
    show() { visible = !appHidden && !minimized; },
    focus() { focused = visible; },
  };
  const app = { show() { appHidden = false; } };
  showWindow({ app, window, platform });
  expect({ appHidden, minimized, visible, focused }).toEqual({ appHidden: false, minimized: false, visible: true, focused: true });
  visible = false; focused = false;
  showWindow({ app, window, platform });
  expect({ visible, focused }).toEqual({ visible: true, focused: true });
});

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
