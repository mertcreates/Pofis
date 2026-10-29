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
  expect(miniPosition({ x: -1500, y: -900, width: 24, height: 24 },
    { x: -1512, y: -982, width: 1512, height: 982 }, 356, 280, "darwin"))
    .toEqual({ x: -1512, y: -868 });
});

test("Pofi Mini tek pencerede açılır, gizlenir, sabitlenir ve ana uygulamaya geçer", async () => {
  const instances = [];
  const handlers = new Map();
  let mainOpened = 0;
  let activations = 0;
  let areaHeight = 800;
  let areaWidth = 1000;
  const displays = Object.assign(new EventEmitter(), {
    getCursorScreenPoint: () => ({ x: 200, y: 20 }),
    getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 0, width: areaWidth, height: areaHeight } }),
  });
  class BrowserWindow extends EventEmitter {
    constructor(options) {
      super(); this.options = options; this.visible = false; this.focused = false; this.destroyed = false;
      this.position = null; this.alwaysOnTop = false; this.reloads = 0; this.focuses = 0;
      this.webContents = new EventEmitter();
      this.webContents.mainFrame = { url: "http://127.0.0.1:3210/mini" };
      this.webContents.setWindowOpenHandler = () => {};
      this.webContents.reload = () => this.reloads++;
      instances.push(this);
    }
    loadURL(url) { this.url = url; return Promise.resolve(); }
    getBounds() { return { ...this.position, ...this.size }; }
    setBounds({ x, y, width, height }) { this.position = { x, y }; this.size = { width, height }; }
    show() { this.visible = true; }
    focus() { this.focuses++; this.focused = true; }
    hide() { this.visible = false; this.focused = false; }
    isVisible() { return this.visible; }
    isFocused() { return this.focused; }
    isDestroyed() { return this.destroyed; }
    setAlwaysOnTop(value) { this.alwaysOnTop = value; }
    setVisibleOnAllWorkspaces(value, options) { this.spaces = { value, options }; }
    destroy() { this.destroyed = true; this.emit("closed"); }
  }
  const mini = createMiniWindow({
    BrowserWindow, screen: displays,
    ipcMain: { handle: (name, fn) => handlers.set(name, fn), removeHandler: name => handlers.delete(name) },
    app: { isHidden: () => false, focus(options) { expect(options).toEqual({ steal: true }); activations++; } },
    preload: "/fixture/preload.cjs", platform: "darwin", icon: "/fixture/icon.png",
    showMain: () => mainOpened++, isQuitting: () => false,
  });
  await mini.toggle({ x: 900, y: 0, width: 18, height: 20 });
  expect(instances.length).toBe(1);
  expect(instances[0].visible).toBe(true);
  expect(activations).toBe(1);
  expect(instances[0].url).toBe("http://127.0.0.1:3210/mini");
  expect(instances[0].options.webPreferences.sandbox).toBe(true);
  expect(instances[0].options.paintWhenInitiallyHidden).toBe(false);
  expect(instances[0].spaces).toEqual({ value: true, options: { visibleOnFullScreen: true, skipTransformProcessType: true } });
  const event = { sender: instances[0].webContents, senderFrame: instances[0].webContents.mainFrame };
  expect(handlers.get("pofis:mini:get")(event)).toEqual({ pinned: false });
  handlers.get("pofis:mini:resize")(event, 280.2);
  expect(instances[0].size).toEqual({ width: 356, height: 281 });
  expect(instances[0].position).toEqual({ x: 644, y: 28 });
  handlers.get("pofis:mini:resize")(event, 2000);
  expect(instances[0].size.height).toBe(600);
  handlers.get("pofis:mini:resize")(event, 240);
  expect(instances[0].size.height).toBe(240);
  instances[0].emit("will-move", {}, instances[0].getBounds());
  instances[0].position = { x: 100, y: 200 };
  instances[0].emit("move");
  handlers.get("pofis:mini:resize")(event, 300);
  expect(instances[0].position).toEqual({ x: 100, y: 200 });
  areaHeight = 350;
  handlers.get("pofis:mini:resize")(event, 800);
  expect(instances[0].size.height).toBe(334);
  expect(instances[0].position).toEqual({ x: 100, y: 16 });
  areaHeight = 800;
  areaWidth = 300;
  displays.emit("display-metrics-changed");
  expect(instances[0].size.width).toBe(284);
  expect(instances[0].position.x).toBe(16);
  areaWidth = 1000;
  displays.emit("display-removed");
  expect(instances[0].size.width).toBe(356);
  for (const value of [NaN, Infinity, -1, 0, "300", null]) {
    expect(() => handlers.get("pofis:mini:resize")(event, value)).toThrow();
  }
  expect(() => handlers.get("pofis:mini:resize")({ sender: {} }, 300)).toThrow();
  expect(() => handlers.get("pofis:mini:resize")({ ...event, senderFrame: {} }, 300)).toThrow();
  event.senderFrame.url = "https://example.com/mini";
  expect(() => handlers.get("pofis:mini:resize")(event, 300)).toThrow();
  event.senderFrame.url = "http://127.0.0.1:3210/mini";
  let escapes = 0;
  instances[0].webContents.emit("before-input-event", { preventDefault: () => escapes++ }, { key: "Escape" });
  expect(instances[0].visible).toBe(false);
  await mini.toggle();
  expect(handlers.get("pofis:mini:pin")(event)).toEqual({ pinned: true });
  expect(instances[0].alwaysOnTop).toBe(true);
  instances[0].emit("blur");
  expect(instances[0].visible).toBe(true);
  instances[0].webContents.emit("before-input-event", { preventDefault: () => escapes++ }, { key: "Escape" });
  expect(instances[0].visible).toBe(true);
  expect(escapes).toBe(1);
  const pinnedPosition = { ...instances[0].position };
  const focuses = instances[0].focuses;
  const beforePinned = activations;
  for (let click = 0; click < 3; click++) {
    await mini.toggle({ x: 900, y: 0, width: 18, height: 20 });
    expect(instances[0].visible).toBe(true);
    expect(instances[0].position).toEqual(pinnedPosition);
  }
  expect(instances[0].focuses).toBe(focuses + 3);
  expect(activations).toBe(beforePinned + 3);
  expect(handlers.get("pofis:mini:pin")(event)).toEqual({ pinned: false });
  await mini.toggle();
  expect(instances[0].visible).toBe(false);
  await mini.toggle();
  expect(handlers.get("pofis:mini:pin")(event)).toEqual({ pinned: true });
  handlers.get("pofis:mini:open-main")(event);
  expect([instances[0].visible, mainOpened]).toEqual([false, 1]);
  await mini.toggle();
  expect(instances.length).toBe(1);
  expect(instances[0].reloads).toBe(0);
  expect(() => handlers.get("pofis:mini:get")({ sender: {} })).toThrow();
  mini.stop();
  expect(instances[0].destroyed).toBe(true);
  expect(handlers.size).toBe(0);
  expect(displays.listenerCount("display-metrics-changed")).toBe(0);
  expect(displays.listenerCount("display-removed")).toBe(0);
});

function loadingFixture(load, options = {}) {
  const windows = [];
  class BrowserWindow extends EventEmitter {
    constructor() {
      super(); this.visible = false; this.focused = false; this.destroyed = false; this.loads = 0; this.boundsChanges = 0;
      this.webContents = new EventEmitter();
      this.webContents.setWindowOpenHandler = () => {};
      this.webContents.reload = () => { throw new Error("An opening must not load twice"); };
      windows.push(this);
    }
    loadURL() { this.loads++; return load(windows.length); }
    setAlwaysOnTop() {} setVisibleOnAllWorkspaces() {} focus() { this.focused = true; }
    getBounds() { return this.bounds || {}; }
    setBounds(bounds) { this.bounds = bounds; this.position = { x: bounds.x, y: bounds.y }; this.boundsChanges++; }
    show() { this.visible = true; }
    hide() { this.visible = false; this.focused = false; }
    isVisible() { return this.visible; }
    isFocused() { return this.focused; }
    isDestroyed() { return this.destroyed; }
    destroy() { this.destroyed = true; this.emit("closed"); }
  }
  const screen = Object.assign(new EventEmitter(), { getCursorScreenPoint: () => ({ x: 100, y: 20 }),
    getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 0, width: 1000, height: 800 } }) });
  const mini = createMiniWindow({ BrowserWindow, screen,
    ipcMain: { handle() {}, removeHandler() {} }, app: { isHidden: () => false, focus() {} }, platform: "darwin",
    isQuitting: () => false, showMain() {}, ...options,
  });
  return { mini, windows, screen };
}

test.each(["darwin", "win32", "linux"])("%s Mini gösterilirken macOS uygulama odağı önce alınır; gizli hazırlık odak almaz", async platform => {
  const calls = [];
  const f = loadingFixture(() => Promise.resolve(), { platform,
    app: { isHidden: () => false, focus: options => calls.push(["activate", options]) },
    showMain: () => calls.push(["main"]),
  });
  try {
    await f.mini.prepare();
    expect(calls).toEqual([]);
    const window = f.windows[0];
    const nativeShow = window.show.bind(window);
    window.show = () => { calls.push(["show"]); nativeShow(); };
    window.focus = () => calls.push(["focus"]);
    const expected = platform === "darwin"
      ? [["activate", { steal: true }], ["show"], ["focus"]]
      : [["show"], ["focus"]];
    await f.mini.toggle();
    expect(calls).toEqual(expected);
    calls.length = 0;
    await f.mini.toggle();
    expect(calls).toEqual([]);
    await f.mini.toggle();
    expect(calls).toEqual(expected);
    calls.length = 0;
    window.emit("blur");
    expect(window.visible).toBe(false);
  } finally { f.mini.stop(); }
});

test("kısayol ve ekran değişimi güncel tray konumunu kullanır; elle taşınan panel yerini korur", async () => {
  let anchor = { x: 900, y: 0, width: 18, height: 20 };
  const f = loadingFixture(() => Promise.resolve(), { getAnchorBounds: () => anchor });
  try {
    await f.mini.toggle();
    expect(f.windows[0].position).toEqual({ x: 644, y: 28 });
    anchor = { x: 500, y: 0, width: 18, height: 20 };
    f.screen.emit("display-metrics-changed");
    expect(f.windows[0].position).toEqual({ x: 331, y: 28 });
    f.windows[0].emit("will-move", {}, f.windows[0].getBounds());
    f.windows[0].bounds = { ...f.windows[0].bounds, x: 80, y: 90 };
    f.windows[0].position = { x: 80, y: 90 };
    f.windows[0].emit("move");
    anchor = { x: 800, y: 0, width: 18, height: 20 };
    f.screen.emit("display-removed");
    expect(f.windows[0].position).toEqual({ x: 80, y: 90 });
    f.mini.hide(); await f.mini.toggle();
    expect(f.windows[0].position).toEqual({ x: 631, y: 28 });
  } finally { f.mini.stop(); }
});

test("ilk açılış tek yükleme yapar; tekrar açılış aynı renderer'ı anında kullanır", async () => {
  const f = loadingFixture(() => Promise.resolve());
  try {
    await f.mini.toggle();
    expect(f.windows[0].loads).toBe(1);
    expect(f.windows[0].visible).toBe(true);
    await f.mini.toggle();
    expect(f.windows[0].visible).toBe(false);
    const opening = f.mini.toggle();
    expect(f.windows[0].visible).toBe(true);
    await opening;
    expect(f.windows[0].loads).toBe(1);
    expect(f.windows[0].visible).toBe(true);
  } finally { f.mini.stop(); }
});

test("değişmeyen konum/boyut tekrar uygulanmaz; ekran değişimi tek bounds çağrısı yapar", async () => {
  const f = loadingFixture(() => Promise.resolve());
  try {
    await f.mini.toggle();
    expect(f.windows[0].boundsChanges).toBe(1);
    f.mini.hide(); await f.mini.toggle();
    f.screen.emit("display-metrics-changed");
    expect(f.windows[0].boundsChanges).toBe(1);
    f.screen.getDisplayNearestPoint = () => ({ workArea: { x: 0, y: 0, width: 300, height: 200 } });
    f.screen.emit("display-metrics-changed");
    expect(f.windows[0].boundsChanges).toBe(2);
    expect(f.windows[0].getBounds()).toEqual({ x: 0, y: 16, width: 284, height: 184 });
  } finally { f.mini.stop(); }
});

test("ön yükleme gizli kalır; ilk tık hazır pencereyi yeni yükleme olmadan gösterir", async () => {
  const f = loadingFixture(() => Promise.resolve());
  try {
    await f.mini.prepare();
    await f.mini.prepare();
    expect(f.windows).toHaveLength(1);
    expect(f.windows[0].loads).toBe(1);
    expect(f.windows[0].visible).toBe(false);
    const opening = f.mini.toggle();
    expect(f.windows[0].visible).toBe(true);
    await opening;
    expect(f.windows[0].loads).toBe(1);
  } finally { f.mini.stop(); }
});

test.each([0, 1, 2, 3])("ön yükleme sürerken %i tıklama son görünürlük isteğini korur", async clicks => {
  let release;
  const f = loadingFixture(() => new Promise(resolve => { release = resolve; }));
  try {
    const pending = [f.mini.prepare(), ...Array.from({ length: clicks }, () => f.mini.toggle())];
    expect(f.windows[0].loads).toBe(1);
    expect(f.windows[0].visible).toBe(false);
    release(); await Promise.all(pending);
    expect(f.windows[0].visible).toBe(clicks % 2 === 1);
  } finally { f.mini.stop(); }
});

test("ön yükleme hatası sonraki kullanıcı açılışında toparlanır; durdurma yeniden pencere oluşturmaz", async () => {
  const f = loadingFixture(attempt => attempt === 1 ? Promise.reject(new Error("offline")) : Promise.resolve());
  try {
    await expect(f.mini.prepare()).rejects.toThrow("offline");
    expect(f.windows[0].destroyed).toBe(true);
    await f.mini.toggle();
    expect(f.windows).toHaveLength(2);
    expect(f.windows[1].visible).toBe(true);
    f.mini.stop();
    await f.mini.prepare(); await f.mini.toggle();
    expect(f.windows).toHaveLength(2);
  } finally { f.mini.stop(); }
});

test("renderer çökerse sonraki açılış yeni pencere yükler", async () => {
  const f = loadingFixture(() => Promise.resolve());
  try {
    await f.mini.toggle();
    f.windows[0].webContents.emit("render-process-gone");
    expect(f.windows[0].destroyed).toBe(true);
    await f.mini.toggle();
    expect(f.windows).toHaveLength(2);
    expect(f.windows[1].loads).toBe(1);
  } finally { f.mini.stop(); }
});

test("ilk yüklemede çöken pencerenin geç yanıtı yeni açılışı bozamaz", async () => {
  for (const outcome of ["resolve", "reject"]) {
    let finish;
    let finishReplacement;
    const f = loadingFixture(attempt => attempt === 1
      ? new Promise((resolve, reject) => { finish = () => outcome === "resolve" ? resolve() : reject(new Error("crashed")); })
      : new Promise(resolve => { finishReplacement = resolve; }));
    try {
      const first = f.mini.toggle().catch(error => error);
      f.windows[0].webContents.emit("render-process-gone");
      const second = f.mini.toggle();
      expect(f.windows).toHaveLength(2);
      finish(); expect(await first).toBeUndefined();
      expect(f.windows[1].visible).toBe(false);
      const hide = f.mini.toggle();
      const show = f.mini.toggle();
      expect(f.windows[1].loads).toBe(1);
      finishReplacement(); await Promise.all([second, hide, show]);
      expect(f.windows[1].destroyed).toBe(false);
      expect(f.windows[1].visible).toBe(true);
    } finally { finish(); finishReplacement?.(); f.mini.stop(); }
  }
});

test.each([2, 3])("ilk yükleme sürerken %i tıklama son görünürlük isteğini korur", async clicks => {
  let release;
  const f = loadingFixture(() => new Promise(resolve => { release = resolve; }));
  try {
    const pending = Array.from({ length: clicks }, () => f.mini.toggle());
    expect(f.windows[0].loads).toBe(1);
    release();
    await Promise.all(pending);
    expect(f.windows[0].visible).toBe(clicks === 3);
  } finally { f.mini.stop(); }
});

test("başarısız ilk yüklemeden sonra yeni pencereyle toparlanır", async () => {
  const f = loadingFixture(attempt => attempt === 1 ? Promise.reject(new Error("offline")) : Promise.resolve());
  try {
    await expect(f.mini.toggle()).rejects.toThrow("offline");
    expect(f.windows[0].destroyed).toBe(true);
    await f.mini.toggle();
    expect(f.windows).toHaveLength(2);
    expect(f.windows[1].visible).toBe(true);
  } finally { f.mini.stop(); }
});

test("yükleme sırasında gizleme ve durdurma pencereyi yeniden açmaz", async () => {
  for (const action of ["hide", "stop"]) {
    let release;
    const f = loadingFixture(() => new Promise(resolve => { release = resolve; }));
    const opening = f.mini.toggle();
    f.mini[action]();
    release(); await opening;
    expect(f.windows[0].visible).toBe(false);
    f.mini.stop();
    await f.mini.toggle();
    expect(f.windows).toHaveLength(1);
  }
});
