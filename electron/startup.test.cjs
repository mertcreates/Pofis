const { test, expect } = require("bun:test");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { startupId, writeStartupResult } = require("./startup.cjs");

test("açılış sonucu yalnız güvenli istek kimliğiyle atomik yazılır", async () => {
  const root = await mkdtemp(join(tmpdir(), "pofis-startup-"));
  try {
    expect(startupId(["--startup-id=../../outside"])).toBeNull();
    const id = "a".repeat(32);
    expect(startupId([`--startup-id=${id}`])).toBe(id);
    await writeStartupResult(root, id, { status: "ready", version: "1.0.0", windowReady: true });
    expect(JSON.parse(await readFile(join(root, "launch-results", `${id}.json`), "utf8")))
      .toEqual({ schemaVersion: 1, requestId: id, status: "ready", version: "1.0.0", windowReady: true });
  } finally { await rm(root, { recursive: true, force: true }); }
});
