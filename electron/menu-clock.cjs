const { readFileSync, writeFileSync, renameSync, mkdirSync } = require("node:fs");
const { dirname } = require("node:path");

// The target exit is computed by the existing notification/report engine.
const istanbulDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
});
function dateKey(now) {
  const parts = istanbulDate.formatToParts(now);
  const part = type => parts.find(item => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function formatTrayCountdown(goal, now = Date.now()) {
  if (!goal || !Number.isFinite(goal.at) || goal.date !== dateKey(now)) return "";
  const remaining = goal.at - now;
  const minutes = Math.ceil(Math.abs(remaining) / 60000);
  const hours = Math.floor(minutes / 60);
  const clock = `${hours}:${String(minutes % 60).padStart(2, "0")}`;
  return remaining < 0 ? `+${clock}` : clock;
}
function createMenuClockPreference(file) {
  let enabled = true;
  try {
    const saved = JSON.parse(readFileSync(file, "utf8"));
    if (typeof saved.enabled === "boolean") enabled = saved.enabled;
  } catch (error) {
    // Preserve an unreadable file; an absent or malformed preference uses the default.
    if (error.code !== "ENOENT") console.warn("Pofis menü çubuğu tercihi okunamadı.");
  }
  return {
    get: () => enabled,
    set(value) {
      const next = Boolean(value);
      const temp = `${file}.${process.pid}.tmp`;
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(temp, JSON.stringify({ enabled: next }), { mode: 0o600 });
      renameSync(temp, file);
      enabled = next;
    },
  };
}
module.exports = { formatTrayCountdown, createMenuClockPreference };
