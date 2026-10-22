const { test, expect } = require("bun:test");
const { stopCIProcesses } = require("./ci-processes.cjs");

test.each([false, true])("CI ağacı PID ile aynı grup yokken de kapanır; dirençli süreç: %s", async stubborn => {
  const rows = new Map([
    [10, { parent: 1, group: 5, state: "S" }],
    [11, { parent: 10, group: 5, state: "S" }],
    [12, { parent: 11, group: 5, state: "S" }],
    [20, { parent: 1, group: 5, state: "S" }],
  ]);
  const signals = [];
  await stopCIProcesses({ pid: 10, exitCode: null, signalCode: null }, {
    processGroup: true, timeoutMs: 0,
    execute: async () => ({ stdout: [...rows].map(([pid, row]) =>
      `${pid} ${row.parent} ${row.group} ${row.state}`).join("\n") }),
    kill(pid, signal) {
      expect(pid).not.toBe(20);
      signals.push([pid, signal]);
      if (pid === 10) {
        rows.delete(10);
        rows.get(11).parent = 1; // child is adopted when its leader exits
      } else if (pid === 12 && stubborn && signal === "SIGTERM") {
        rows.get(pid).parent = 1;
      } else rows.get(pid).state = "Z";
    },
  });
  expect(signals).toEqual([[10, "SIGTERM"], [11, "SIGTERM"], [12, "SIGTERM"],
    ...(stubborn ? [[12, "SIGKILL"]] : [])]);
  expect(rows.get(20).state).toBe("S");
});

test("lideri çıkmış gerçek gruptaki alt süreçler kapanır; başka gruba dokunulmaz", async () => {
  let stdout = "11 1 10 S\n12 1 20 S\n";
  await stopCIProcesses({ pid: 10, exitCode: 0, signalCode: null }, {
    processGroup: true, execute: async () => ({ stdout }),
    kill(pid, signal) { expect([pid, signal]).toEqual([11, "SIGTERM"]); stdout = "12 1 20 S\n"; },
  });
});

test("CI temizliği ps ve sinyal hatalarını veya yaşamaya devam eden süreci gizlemez", async () => {
  const child = { pid: 10, exitCode: null, signalCode: null };
  const table = async () => ({ stdout: "10 1 10 S\n" });
  await expect(stopCIProcesses(child, { execute: async () => { throw new Error("ps failed"); } }))
    .rejects.toThrow("ps failed");
  await expect(stopCIProcesses(child, { execute: table, kill: () => { throw new Error("denied"); } }))
    .rejects.toThrow("denied");
  await expect(stopCIProcesses(child, { execute: table, kill() {}, timeoutMs: 0 }))
    .rejects.toThrow("CI alt süreçleri kapanmadı: 10");
});
