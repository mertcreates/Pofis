import { expect, test } from "bun:test";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, relative } from "node:path";

test("Pofi CLI lists, validates and previews the catalogue; unsupported commands fail", () => {
  const root = resolve(import.meta.dir, "../../..");
  const work = join(root, "work");
  mkdirSync(work, { recursive: true });
  const fixture = mkdtempSync(join(work, "note-cli-"));
  const run = (...args: string[]) => {
    const result = Bun.spawnSync(
      [process.execPath, "scripts/pofi-notes.ts", ...args],
      { cwd: fixture, env: { ...process.env, NODE_ENV: "test" } },
    );
    return {
      status: result.exitCode,
      output: result.stdout.toString(),
      error: result.stderr.toString(),
    };
  };
  try {
    for (const directory of ["src/lib", "src/domain/rules", "scripts"])
      mkdirSync(join(fixture, directory), { recursive: true });
    cpSync(
      join(root, "src/lib/pofi-notes"),
      join(fixture, "src/lib/pofi-notes"),
      { recursive: true },
    );
    for (const name of ["calendar.ts", "notebook-calendar.ts"])
      cpSync(
        join(root, "src/domain/rules", name),
        join(fixture, "src/domain/rules", name),
      );
    cpSync(join(root, "src/lib/ui-text.js"), join(fixture, "src/lib/ui-text.js"));
    cpSync(
      join(root, "scripts/pofi-notes.ts"),
      join(fixture, "scripts/pofi-notes.ts"),
    );
    writeFileSync(
      join(fixture, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }),
    );

    expect(run("list").status).toBe(0);
    const validation = run("validate");
    expect(validation.status).toBe(0);
    expect(JSON.parse(validation.output)).toMatchObject({
      valid: true,
    });
    expect(
      run("preview", "--date", "2026-10-16", "--key", "example").status,
    ).toBe(0);
    expect(run("prepare", "--from", "2100-01-04").status).not.toBe(0);
  } finally {
    const path = relative(work, fixture);
    if (path.startsWith("..") || path.includes(":"))
      throw new Error("Fixture escaped work directory");
    rmSync(fixture, { recursive: true, force: true });
  }
});
