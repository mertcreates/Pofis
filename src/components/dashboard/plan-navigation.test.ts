import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("Mesai planı ve yemek menüsü seçili haftayı korur; Mesaim güncel haftayı açar", () => {
  // Keep the shell mock in its own process so other component tests use the real shell.
  const result = Bun.spawnSync([process.execPath, resolve(import.meta.dir, "fixtures/plan-navigation.tsx")], {
    cwd: resolve(import.meta.dir, "../../.."), timeout: 10_000,
  });
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  const changes = JSON.parse(result.stdout.toString());
  for (const week of ["2026-10-12", "2026-10-19"]) {
    expect(changes[`${week}:settings`]).toEqual([]);
    expect(changes[`${week}:meals`]).toEqual([]);
    expect(changes[`${week}:overview`]).toEqual(["2026-10-19"]);
  }
});
