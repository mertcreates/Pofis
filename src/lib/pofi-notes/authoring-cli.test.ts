import { expect, test } from "bun:test";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, relative } from "node:path";

test("yönetim komutu yalnız izole kaynak kopyasında yayın hazırlar; eski seçimleri korur", () => {
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
    cpSync(
      join(root, "scripts/pofi-notes.ts"),
      join(fixture, "scripts/pofi-notes.ts"),
    );
    writeFileSync(
      join(fixture, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }),
    );
    const before = run("preview", "--date", "2026-10-16", "--key", "example");
    expect(before.status).toBe(0);
    // 2100-01-04 is a future Monday; this test needs no wall-clock mocking.
    const prepared = run(
      "prepare",
      "--from",
      "2100-01-04",
      "--exclude-theme",
      "chair",
      "--exclude-part",
      "coffee:intros:i1",
      "--exclude-note",
      "plant:i1:d1:e1",
    );
    expect(prepared.status).toBe(0);
    expect(JSON.parse(prepared.output)).toMatchObject({
      prepared: true,
      notes: 1199,
    });
    expect(run("validate").status).toBe(0);
    const after = run("preview", "--date", "2026-10-16", "--key", "example");
    expect(after.output).toBe(before.output);
    const current = run("preview", "--date", "2100-01-04", "--key", "example");
    expect(current.status).toBe(0);
    expect(
      JSON.parse(current.output).every(
        (note: { id: string }) => !note.id.startsWith("chair:"),
      ),
    ).toBe(true);
    const target = join(
      fixture,
      "src/lib/pofi-notes/scheduled-publications.json",
    );
    const saved = readFileSync(target, "utf8");
    expect(run("prepare", "--from", "2100-01-04").status).not.toBe(0);
    expect(
      run("prepare", "--from", "2100-01-11", "--exclude-theme", "typo").status,
    ).not.toBe(0);
    expect(readFileSync(target, "utf8")).toBe(saved);
  } finally {
    const path = relative(work, fixture);
    if (path.startsWith("..") || path.includes(":"))
      throw new Error("Fixture escaped work directory");
    rmSync(fixture, { recursive: true, force: true });
  }
});
