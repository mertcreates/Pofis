const { expect, test } = require("bun:test");
const { EventEmitter } = require("node:events");
const { miniPosition, createMiniWindow } = require("./mini-window.cjs");

test("menü çubuğu paneli ekrandan taşmaz; Windows tepsisi üstüne açılır", () => {
  expect(miniPosition({ x: 1460, y: 0, width: 24, height: 24 },
    { x: 0, y: 0, width: 1512, height: 982 }, 356, 468, "darwin"))
    .toEqual({ x: 1156, y: 32 });
  expect(miniPosition({ x: 1460, y: 940, width: 24, height: 24 },
    { x: 0, y: 0, width: 1512, height: 982 }, 356, 468, "win32"))
    .toEqual({ x: 1156, y: 464 });
});

test("Pofi Mini tek pencerede açılır, gizlenir, sabitlenir ve ana uygulamaya geçer", async () => {
  const instances = [];
  const handlers = new Map();
  let mainOpened = 0;
  class BrowserWindow extends EventEmitter {
    constructor(options) {
      super(); this.options = options; this.visible = false; this.destroyed = false;
      this.position = null; this.alwaysOnTop = false; this.reloads = 0;
      this.webContents = new EventEmitter();
      this.webContents.mainFrame = { url: "http://127.0.0.1:3210/mini" };
      this.webContents.setWindowOpenHandler = () => {};
      this.webContents.reload = () => this.reloads++;
      instances.push(this);
    }
    loadURL(url) { this.url = url; return Promise.resolve(); }
    setPosition(x, y) { this.position = { x, y }; }
    show() { this.visible = true; }
    focus() {}
    hide() { this.visible = false; }
    isVisible() { return this.visible; }
    isDestroyed() { return this.destroyed; }
    setAlwaysOnTop(value) { this.alwaysOnTop = value; }
    destroy() { this.destroyed = true; this.emit("closed"); }
  }
  const mini = createMiniWindow({
    BrowserWindow, screen: { getCursorScreenPoint: () => ({ x: 200, y: 20 }),
      getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 0, width: 1000, height: 800 } }) },
    ipcMain: { handle: (name, fn) => handlers.set(name, fn), removeHandler: name => handlers.delete(name) },
    app: {}, preload: "/fixture/preload.cjs", platform: "darwin", icon: "/fixture/icon.png",
    showMain: () => mainOpened++, isQuitting: () => false,
  });
  await mini.toggle({ x: 900, y: 0, width: 18, height: 20 });
  expect(instances.length).toBe(1);
  expect(instances[0].visible).toBe(true);
  expect(instances[0].url).toBe("http://127.0.0.1:3210/mini");
  expect(instances[0].options.webPreferences.sandbox).toBe(true);
  const event = { sender: instances[0].webContents, senderFrame: instances[0].webContents.mainFrame };
  expect(handlers.get("pofis:mini:get")(event)).toEqual({ pinned: false });
  expect(handlers.get("pofis:mini:pin")(event)).toEqual({ pinned: true });
  expect(instances[0].alwaysOnTop).toBe(true);
  instances[0].emit("blur");
  expect(instances[0].visible).toBe(true);
  handlers.get("pofis:mini:open-main")(event);
  expect([instances[0].visible, mainOpened]).toEqual([false, 1]);
  await mini.toggle();
  expect(instances.length).toBe(1);
  expect(instances[0].reloads).toBe(2);
  expect(() => handlers.get("pofis:mini:get")({ sender: {} })).toThrow();
  mini.stop();
  expect(instances[0].destroyed).toBe(true);
  expect(handlers.size).toBe(0);
});
