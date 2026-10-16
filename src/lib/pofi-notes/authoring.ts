import { isDateKey, weekday, weekStart } from "@/domain/rules/calendar";
import { createPofiNotebook, publicationStrides } from "./notebook";
import type { NoteCatalogue } from "./catalogue";
import type { NotePublication, PoolSelection } from "./types";

export function prepareNotePublication(
  catalogue: NoteCatalogue,
  history: readonly NotePublication[],
  specialDays: Readonly<
    Record<string, { note: string; sharedVariant?: string }>
  >,
  input: PoolSelection & {
    from: string;
    today: string;
    excludeSpecialDates?: readonly string[];
  },
): NotePublication {
  if (
    !isDateKey(input.today) ||
    !isDateKey(input.from) ||
    weekday(input.from) !== 0 ||
    input.from <= weekStart(input.today) ||
    (history.length && input.from <= history.at(-1)!.from)
  ) {
    throw new Error(
      "New publication must start on a future Monday after the last publication",
    );
  }
  const excludedDates = new Set(input.excludeSpecialDates ?? []);
  for (const date of excludedDates)
    if (!Object.hasOwn(specialDays, date))
      throw new Error(`Unknown excluded special date: ${date}`);
  const days = Object.fromEntries(
    Object.entries(specialDays)
      .filter(([date]) => !excludedDates.has(date))
      .map(([date, special]) => [
        date,
        { ...special, variants: catalogue.variants(special.note) },
      ]),
  );
  const notes = catalogue.createPool(input);
  const publication: NotePublication = {
    from: input.from,
    notes,
    strides: publicationStrides(notes.length),
    specialDays: days,
  };
  // The exact same validation is used by the running application.
  createPofiNotebook(catalogue, [...history, publication]);
  return publication;
}
