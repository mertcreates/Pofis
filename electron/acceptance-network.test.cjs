const { test, expect } = require("bun:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { isolateAcceptanceAnalytics } = require("./acceptance-network.cjs");

test("normal startup leaves the session network handlers unchanged", () => {
  expect(() => isolateAcceptanceAnalytics({}, false)).not.toThrow();
});

test("real Electron blocks acceptance analytics before network and keeps loopback available", async () => {
  const profile = await mkdtemp(join(tmpdir(), "pofis-network-test-"));
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  try {
    const { stdout } = await promisify(execFile)(require("electron"), [
      join(__dirname, "fixtures/acceptance-network.cjs"), `--user-data-dir=${profile}`,
    ], { env, windowsHide: true, timeout: 15000 });
    expect(stdout).toContain("PASS: analytics blocked; loopback available");
  } finally {
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}, 20000);
