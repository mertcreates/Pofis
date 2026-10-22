import { expect, test } from "bun:test";
import { resolve } from "node:path";

test.each([false, true])("kural değişikliği istek, form, demo ve oturum kararına yansır; değiştirilmiş sahip=%s", altered => {
  const result = Bun.spawnSync([process.execPath, resolve(import.meta.dir, "fixtures/policy-adapters.js"), ...(altered ? ["altered"] : [])], {
    cwd: resolve(import.meta.dir, "../../.."), env: process.env, timeout: 10000,
  });
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  expect(JSON.parse(result.stdout.toString())).toEqual({
    webPerson: altered ? "current" : "self", desktopPerson: altered ? "current" : "self",
    profilePerson: altered ? "current" : "self", demoPersons: [altered ? "current" : "self"],
    webTimeout: altered ? 25 : 10000, desktopTimeout: altered ? 25 : 10000,
    webAborted: altered, desktopAborted: altered,
    demo: { step: altered ? 30 : 15, nextAt: Date.parse(altered ? "2026-10-15T05:30:00Z" : "2026-10-15T05:15:00Z"),
      fifteenAccepted: !altered, disabledMaximum: altered ? 30 : 15, disabled: true },
    telegram: { inputAccepted: altered ? ["123456"] : ["1234", "123456"],
      formAccepted: altered ? ["123456"] : ["1234", "123456"], discovered: altered ? ["123456"] : ["1234", "123456"] },
    desktopExpiry: altered ? [false, true, false, false] : [true, false, false, false],
  });
});
