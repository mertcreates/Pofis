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
  let bounds = { x: 1, y: 2, width: 18, height: 18 };
  class Tray extends EventEmitter {
    constructor() { super(); tray = this; }
    setToolTip() {} setTitle() {}
    getBounds() { return bounds; }
    setContextMenu(value) { menu = value; }
    popUpContextMenu(value) { menu = value; }
    destroy() { destroyed++; }
  }
  const background = installBackground({ app: { quit() { quit++; quitting = true; } }, window, Tray,
    Menu: { buildFromTemplate: value => value }, nativeImage: { createFromPath: () => ({ resize() { return this; }, setTemplateImage() {} }) },
    icon: "fixture", platform, showWindow: () => shown++, toggleMini: () => mini++, isQuitting: () => quitting });
  expect(background.getBounds()).toEqual(bounds);
  bounds = { x: 0, y: 0, width: 0, height: 0 };
  expect(background.getBounds()).toBeUndefined();
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
    setToolTip() {} setTitle() {} popUpContextMenu(value) { menu = value; }
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
  const item = () => menu.find(value => value.label === "Oturum açılışında başlat");
  expect(item().checked).toBe(false);
  item().click({ checked: true });
  expect(enabled).toBe(true);
  tray.emit("right-click");
  expect(item().checked).toBe(true);
});

test("macOS menü çubuğu canlı süreyi günceller, tercih kaydedilir ve çıkışta timer temizlenir", () => {
  const window = new EventEmitter(); window.hide = () => {};
  let tray, menu, clockTick, cleaned = 0, enabled = true;
  let now = Date.parse("2026-10-23T16:00:00+03:00");
  const titles = [];
  class Tray extends EventEmitter {
    constructor() { super(); tray = this; }
    setToolTip() {}
    setTitle(title, options) { titles.push([title, options]); }
    popUpContextMenu(value) { menu = value; }
    getBounds() { return { x: 0, y: 0, width: 16, height: 16 }; }
    destroy() {}
  }
  const background = installBackground({ app: { quit() {} }, window, Tray,
    Menu: { buildFromTemplate: value => value },
    nativeImage: { createFromPath: () => ({ resize() { return this; }, setTemplateImage() {} }) },
    icon: "fixture", platform: "darwin", showWindow() {}, toggleMini() {},
    isQuitting: () => false, menuClock: { get: () => enabled, set: value => { enabled = value; } },
    now: () => now, interval: fn => { clockTick = fn; return { unref() {} }; },
    cancelInterval: () => cleaned++ });
  background.setGoal({ date: "2026-10-23", at: Date.parse("2026-10-23T17:00:00+03:00") });
  expect(titles.at(-1)).toEqual(["1:00", { fontType: "monospacedDigit" }]);
  const before = titles.length;
  // Model both 15-second owners: countdown timer and notification goal publication.
  for (let second = 15; second <= 60; second += 15) {
    now += 15_000;
    clockTick();
    background.setGoal({ date: "2026-10-23", at: Date.parse("2026-10-23T17:00:00+03:00") });
  }
  expect(titles.length - before).toBe(1);
  const afterMinute = titles.length;
  clockTick(); background.setGoal({ date: "2026-10-23", at: Date.parse("2026-10-23T17:00:00+03:00") });
  expect(titles.length).toBe(afterMinute);
  now = Date.parse("2026-10-23T16:00:00+03:00");
  now += 61_000; clockTick();
  expect(titles.at(-1)[0]).toBe("0:59");
  tray.emit("right-click");
  const item = menu.find(value => value.label === "Hedefe kalan süreyi göster");
  expect(item.checked).toBe(true);
  item.click({ checked: false });
  expect(enabled).toBe(false);
  expect(titles.at(-1)[0]).toBe("");
  item.click({ checked: true });
  expect(titles.at(-1)[0]).toBe("0:59");
  background.setGoal(null);
  expect(titles.at(-1)[0]).toBe("");
  const withoutGoal = titles.length;
  clockTick(); background.setGoal(null);
  expect(titles.length).toBe(withoutGoal);
  background.stop();
  expect(cleaned).toBe(1);
});
