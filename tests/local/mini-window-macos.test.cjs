const { expect, test } = require("bun:test");
const { EventEmitter } = require("node:events");
const { createMiniWindow } = require("../../electron/mini-window.cjs");

function fixture() {
  let area = { x: 0, y: 0, width: 1000, height: 800 };
  const handlers = new Map();
  let window;
  class BrowserWindow extends EventEmitter {
    constructor() {
      super(); window = this; this.bounds = { x: 0, y: 0, width: 356, height: 240 };
      this.visible = false; this.focused = false; this.destroyed = false;
      this.webContents = new EventEmitter();
      this.webContents.mainFrame = { url: "http://127.0.0.1:3210/mini" };
      this.webContents.setWindowOpenHandler = () => {};
    }
    loadURL() { return Promise.resolve(); }
    getBounds() { return { ...this.bounds }; }
    setBounds(bounds) { this.bounds = { ...bounds }; this.emit("move"); }
    show() { this.visible = true; }
    hide() { this.visible = false; this.focused = false; }
    focus() { this.focused = true; }
    isFocused() { return this.focused; }
    isDestroyed() { return this.destroyed; }
    setAlwaysOnTop() {} setVisibleOnAllWorkspaces() {}
    destroy() { this.destroyed = true; this.emit("closed"); }
  }
  const screen = Object.assign(new EventEmitter(), {
    getCursorScreenPoint: () => ({ x: 900, y: 20 }),
    getDisplayNearestPoint: () => ({ workArea: area }),
  });
  const mini = createMiniWindow({ BrowserWindow, screen, platform: "darwin",
    ipcMain: { handle: (name, fn) => handlers.set(name, fn), removeHandler: name => handlers.delete(name) },
    app: { isHidden: () => false, focus() {} }, showMain() {}, isQuitting: () => false,
    getAnchorBounds: () => ({ x: 900, y: 0, width: 18, height: 20 }),
  });
  return { mini, screen, get window() { return window; }, setArea(value) { area = value; } };
}

test("macOS kullanıcının son konumunu çalışma alanı daralıp genişlerken korur", async () => {
  const f = fixture();
  try {
    await f.mini.toggle();
    const original = f.window.getBounds();
    f.window.emit("will-move", {}, original); // macOS reports the starting rectangle
    f.window.bounds = { ...original, x: 300, y: 200 };
    f.window.emit("move");
    f.screen.emit("display-metrics-changed");
    expect(f.window.getBounds()).toMatchObject({ x: 300, y: 200 });
    f.setArea({ x: 0, y: 0, width: 300, height: 350 });
    f.screen.emit("display-metrics-changed");
    expect(f.window.getBounds()).toMatchObject({ x: 16, y: 110 });
    f.setArea({ x: 0, y: 0, width: 1000, height: 800 });
    f.screen.emit("display-metrics-changed");
    expect(f.window.getBounds()).toMatchObject({ x: 300, y: 200 });
    f.mini.hide(); await f.mini.toggle();
    expect(f.window.getBounds()).toMatchObject({ x: 644, y: 28 });
  } finally { f.mini.stop(); }
});

test("gecikmiş blur yeni açılışı kapatmaz, gerçek odak kaybı kapatır", async () => {
  const f = fixture();
  try {
    await f.mini.toggle(); await f.mini.toggle(); await f.mini.toggle();
    expect(f.window.isFocused()).toBe(true);
    f.window.emit("blur"); // prior hide is delivered after the new show
    expect(f.window.visible).toBe(true);
    f.window.focused = false;
    f.window.emit("blur");
    expect(f.window.visible).toBe(false);
    await f.mini.toggle();
    f.window.focused = false;
    f.window.emit("blur");
    expect(f.window.visible).toBe(false);
  } finally { f.mini.stop(); }
});
