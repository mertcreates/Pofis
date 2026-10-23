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
});

test.each(["win32", "darwin", "linux"])("%s Pofi Mini sol tıkta, ana uygulama menüden açılır; çıkış süreci kapatır", platform => {
  const window = new EventEmitter();
  let hidden = 0, prevented = 0, quit = 0, shown = 0, mini = 0, destroyed = 0, quitting = false;
  window.hide = () => hidden++;
  let menu, tray;
  class Tray extends EventEmitter {
    constructor() { super(); tray = this; }
    setToolTip() {}
    getBounds() { return { x: 1, y: 2, width: 18, height: 18 }; }
    setContextMenu(value) { menu = value; }
    popUpContextMenu(value) { menu = value; }
    destroy() { destroyed++; }
  }
  const background = installBackground({ app: { quit() { quit++; quitting = true; } }, window, Tray,
    Menu: { buildFromTemplate: value => value }, nativeImage: { createFromPath: () => ({ resize() { return this; }, setTemplateImage() {} }) },
    icon: "fixture", platform, showWindow: () => shown++, toggleMini: () => mini++, isQuitting: () => quitting });
  tray.emit("click");
  expect(mini).toBe(1);
  if (platform === "darwin") tray.emit("right-click");
  expect(menu[0].label).toBe("Pofi Mini");
  menu[1].click(); expect(shown).toBe(1);
  window.emit("close", { preventDefault: () => prevented++ });
  expect([hidden, prevented, quit]).toEqual([1, 1, 0]);
  menu.at(-1).click();
  window.emit("close", { preventDefault: () => prevented++ });
  expect([hidden, prevented, quit]).toEqual([1, 1, 1]);
  window.emit("query-session-end"); expect(quit).toBe(2);
  background.stop(); expect(destroyed).toBe(1);
});

test("macOS oturum açılışında başlatma kullanıcı tercihiyle değişir", () => {
  const window = new EventEmitter(); window.hide = () => {};
  let menu; let enabled = false; let tray;
  class Tray extends EventEmitter {
    constructor() { super(); tray = this; }
    setToolTip() {} popUpContextMenu(value) { menu = value; }
    getBounds() { return { x: 0, y: 0, width: 16, height: 16 }; }
    destroy() {}
  }
  installBackground({ app: { quit() {} }, window, Tray,
    Menu: { buildFromTemplate: value => value },
    nativeImage: { createFromPath: () => ({ resize() { return this; }, setTemplateImage() {} }) },
    icon: "fixture", platform: "darwin", showWindow() {}, toggleMini() {},
    isQuitting: () => false, login: { get: () => enabled, set: value => { enabled = value; } } });
  expect(enabled).toBe(false);
  tray.emit("right-click");
  expect(menu[3].checked).toBe(false);
  menu[3].click({ checked: true });
  expect(enabled).toBe(true);
  tray.emit("right-click");
  expect(menu[3].checked).toBe(true);
});
