const { test, expect } = require("bun:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { join } = require("node:path");

const python = process.env.POFIS_TEST_PYTHON || (process.platform === "linux" ? "python3" : null);
(python ? test : test.skip)("Linux kurulum sözleşmesi izole Python fixture'larında", async () => {
  const result = await promisify(execFile)(python, [join(__dirname, "linux-installer.test.py")], { timeout: 30000 });
  expect(result.stderr).toContain("OK");
}, 35000);
