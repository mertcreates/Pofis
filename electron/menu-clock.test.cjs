const { expect, test } = require("bun:test");
const { mkdtempSync, readFileSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { formatTrayCountdown, createMenuClockPreference } = require("./menu-clock.cjs");

test("İstanbul takviminde doğrulanmış hedefe kalan ve aşan dakika doğru yazılır", () => {
  const at = Date.parse("2026-10-23T17:00:00+03:00");
  const goal = { date: "2026-10-23", at };
  expect(formatTrayCountdown(goal, Date.parse("2026-10-23T15:59:01+03:00"))).toBe("1:01");
  expect(formatTrayCountdown(goal, Date.parse("2026-10-23T16:59:01+03:00"))).toBe("0:01");
  expect(formatTrayCountdown(goal, at)).toBe("0:00");
  expect(formatTrayCountdown(goal, at + 1000)).toBe("+0:01");
  expect(formatTrayCountdown(goal, at + 3600000 + 1000)).toBe("+1:01");
  expect(formatTrayCountdown(goal, Date.parse("2026-10-24T00:00:00+03:00"))).toBe("");
  expect(formatTrayCountdown(null, at)).toBe("");
  expect(formatTrayCountdown({ date: "2026-10-23", at: NaN }, at)).toBe("");
  // Outside Istanbul, the machine timezone must not change what counts as today.
  expect(formatTrayCountdown(goal, Date.parse("2026-10-22T23:30:00Z"))).toBe("");
});

test("menü süresi tercihi yeniden açılınca korunur, bozuk dosya değiştirilmez", () => {
  const folder = mkdtempSync(join(tmpdir(), "pofis-menu-clock-"));
  try {
    const file = join(folder, "menu-clock.json");
    const setting = createMenuClockPreference(file);
    expect(setting.get()).toBe(true);
    setting.set(false);
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ enabled: false });
    expect(createMenuClockPreference(file).get()).toBe(false);
    writeFileSync(file, "{broken");
    expect(createMenuClockPreference(file).get()).toBe(true);
    expect(readFileSync(file, "utf8")).toBe("{broken");
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
