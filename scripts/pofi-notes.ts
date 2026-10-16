import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { dateKey } from "../src/domain/rules/calendar";
import { pofiNoteCatalogue, pofiNotebook } from "../src/lib/pofi-notes";
import { prepareNotePublication } from "../src/lib/pofi-notes/authoring";
import { NOTE_PUBLICATIONS } from "../src/lib/pofi-notes/publications";
import { SPECIAL_DAYS } from "../src/lib/pofi-notes/special-days";
import scheduled from "../src/lib/pofi-notes/scheduled-publications.json";

const [command, ...args] = process.argv.slice(2);
const flags = new Map<string, string[]>();
for (let index = 0; index < args.length; index += 2) {
  const flag = args[index];
  const value = args[index + 1];
  if (
    ![
      "--from",
      "--exclude-theme",
      "--exclude-part",
      "--exclude-note",
      "--exclude-special-date",
      "--date",
      "--key",
    ].includes(flag) ||
    !value ||
    value.startsWith("--")
  )
    throw new Error(`Unknown or incomplete option: ${flag}`);
  flags.set(flag, [...(flags.get(flag) ?? []), value]);
}
function single(flag: string) {
  const values = flags.get(flag);
  if (values?.length !== 1) throw new Error(`Provide exactly one ${flag}`);
  return values[0];
}
function allow(allowed: string[]) {
  for (const flag of flags.keys())
    if (!allowed.includes(flag))
      throw new Error(`Option is not supported by ${command}: ${flag}`);
}

if (command === "list") {
  allow([]);
  console.table(pofiNoteCatalogue.inventory());
} else if (command === "validate") {
  allow([]);
  console.log(
    JSON.stringify(
      {
        valid: true,
        themes: pofiNoteCatalogue.inventory().length,
        publications: NOTE_PUBLICATIONS.map(({ from, notes, specialDays }) => ({
          from,
          notes: notes.length,
          specialDays: Object.keys(specialDays).length,
        })),
      },
      null,
      2,
    ),
  );
} else if (command === "preview") {
  allow(["--date", "--key"]);
  console.log(
    JSON.stringify(
      pofiNotebook.notesForWeek(single("--date"), single("--key")),
      null,
      2,
    ),
  );
} else if (command === "prepare") {
  allow([
    "--from",
    "--exclude-theme",
    "--exclude-part",
    "--exclude-note",
    "--exclude-special-date",
  ]);
  const publication = prepareNotePublication(
    pofiNoteCatalogue,
    NOTE_PUBLICATIONS,
    SPECIAL_DAYS,
    {
      from: single("--from"),
      today: dateKey(Date.now()),
      excludeThemes: flags.get("--exclude-theme"),
      excludeParts: flags.get("--exclude-part"),
      excludeNotes: flags.get("--exclude-note"),
      excludeSpecialDates: flags.get("--exclude-special-date"),
    },
  );
  const target = resolve(
    import.meta.dir,
    "../src/lib/pofi-notes/scheduled-publications.json",
  );
  const temporary = `${target}.tmp`;
  writeFileSync(
    temporary,
    JSON.stringify([...scheduled, publication], null, 2) + "\n",
    { flag: "wx" },
  );
  try {
    if (
      JSON.stringify(JSON.parse(readFileSync(target, "utf8"))) !==
      JSON.stringify(scheduled)
    )
      throw new Error(
        "Publications changed during preparation; rerun with the latest content",
      );
    renameSync(temporary, target);
  } finally {
    rmSync(temporary, { force: true });
  }
  console.log(
    JSON.stringify(
      {
        prepared: true,
        from: publication.from,
        notes: publication.notes.length,
        file: target,
        scope: "local source only",
      },
      null,
      2,
    ),
  );
} else {
  throw new Error(
    "Usage: bun scripts/pofi-notes.ts list | validate | preview --date YYYY-MM-DD --key example | prepare --from YYYY-MM-DD [--exclude-theme id] [--exclude-part theme:group:part] [--exclude-note id] [--exclude-special-date MM-DD]",
  );
}
