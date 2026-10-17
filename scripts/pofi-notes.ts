import { pofiNoteCatalogue, pofiNotebook } from "../src/lib/pofi-notes";
import { SPECIAL_DAYS } from "../src/lib/pofi-notes/special-days";

const [command, ...args] = process.argv.slice(2);
const flags = new Map<string, string[]>();
for (let index = 0; index < args.length; index += 2) {
  const flag = args[index];
  const value = args[index + 1];
  if (
    !["--date", "--key"].includes(flag) ||
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
        notes: pofiNoteCatalogue.createPool().length,
        specialDays: Object.keys(SPECIAL_DAYS).length,
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
} else {
  throw new Error(
    "Usage: bun scripts/pofi-notes.ts list | validate | preview --date YYYY-MM-DD --key example",
  );
}
