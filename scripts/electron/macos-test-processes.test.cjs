const { test, expect } = require("bun:test");
const { fixtureProcesses } = require("./macos-test-processes.cjs");
const appPath = "/tmp/pofis test/Applications/Pofis.app";
const main = `${appPath}/Contents/MacOS/Pofis`;
const helper = `${appPath}/Contents/Frameworks/Pofis Helper (Renderer).app/Contents/MacOS/Pofis Helper (Renderer)`;

test("normal çıkış yardımcı süreçlerin de bitmesini bekler", async () => {
  let quitting = false, polls = 0;
  const processes = fixtureProcesses({ appPath, profile: "/tmp/profile", timeoutMs: 1000,
    execute: async (command, args) => {
      if (command === "/usr/bin/open") {
        expect(args).toEqual(["-n", appPath, "--args", "--pofis-quit", "--user-data-dir=/tmp/profile"]);
        quitting = true;
        return {};
      }
      if (!quitting) return { stdout: `10 ${main}\n11 ${helper}\n` };
      return { stdout: ++polls === 1 ? `11 ${helper}\n` : "" };
    },
    kill() { throw new Error("Normal çıkış zorla kapatmamalı."); },
  });
  await processes.close();
  expect(quitting).toBe(true);
  expect(polls).toBe(2);
});

test("takılan fixture temizlenir; diğer kurulumlar ve benzer yollar korunur", async () => {
  const owned = new Map([[10, main], [11, helper]]);
  const others = `20 /Applications/Pofis.app/Contents/MacOS/Pofis\n` +
    `21 ${appPath}.other/Contents/MacOS/Pofis\n22 ${appPath}/Contents/Frameworks/Other Helper\n`;
  const killed = [];
  const processes = fixtureProcesses({ appPath, profile: "/tmp/profile", timeoutMs: 10,
    execute: async command => command === "/bin/ps"
      ? { stdout: [...owned].map(([pid, path]) => `${pid} ${path}\n`).join("") + others }
      : {},
    kill(pid, signal) { expect(signal).toBe("SIGKILL"); killed.push(pid); owned.delete(pid); },
  });
  await expect(processes.close()).rejects.toThrow("kapanmadı");
  expect(killed).toEqual([]);
  await processes.close({ force: true });
  expect(killed).toEqual([10, 11]);
  expect(await processes.list()).toEqual([]);
});

test.each(["denied", "ignored"])("zorla kapatılamayan fixture temizlik hatasını görünür bırakır: %s", async outcome => {
  const processes = fixtureProcesses({ appPath, profile: "/tmp/profile", timeoutMs: 10,
    execute: async () => ({ stdout: `11 ${helper}\n` }),
    kill() {
      if (outcome === "denied") throw Object.assign(new Error("permission denied"), { code: "EPERM" });
    },
  });
  await expect(processes.close({ force: true })).rejects.toThrow(outcome === "denied" ? "permission denied" : "kapanmadı");
});
