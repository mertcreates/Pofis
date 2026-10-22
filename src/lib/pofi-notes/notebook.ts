import { ui } from "../ui-text.js";
import { isDateKey, weekStart, weekday } from "@/domain/rules/calendar";
import {
  isNotebookDate,
  pofiNotebookDates,
} from "@/domain/rules/notebook-calendar";
import type { NoteCatalogue } from "./catalogue";
import type { DatedNote } from "./types";

const STRIDE_CANDIDATES = [1, 3, 5, 7, 9, 11, 13, 17, 19] as const;

function hash(value: string) {
  let result = 2166136261;
  for (const character of value)
    result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function createPofiNotebook(
  catalogue: NoteCatalogue,
  specialDaySource: Readonly<
    Record<string, { note: string; sharedVariant?: string }>
  > = {},
) {
  const notes = catalogue.createPool();
  if ((notes.length > 0 && notes.length < 5) || new Set(notes).size !== notes.length)
    throw new Error(ui.internalErrors.notePoolTooSmall);
  for (const id of notes) {
    if (id.startsWith("special:"))
      throw new Error(ui.internalErrors.regularPoolContainsSpecialNote(id));
    catalogue.resolve(id);
  }

  const specialDays = new Map<
    string,
    { note: string; variants: string[]; sharedVariant?: string }
  >();
  for (const [date, special] of Object.entries(specialDaySource)) {
    if (date.length !== 5 || !isDateKey(`2000-${date}`))
      throw new Error(ui.internalErrors.invalidSpecialDay(date));
    const variants = catalogue.variants(special.note);
    if (special.sharedVariant && !variants.includes(special.sharedVariant))
      throw new Error(ui.internalErrors.unknownSharedVariant(date));
    specialDays.set(date, { ...special, variants });
  }

  // A stride coprime to the pool size avoids repeats within a week.
  const strides = STRIDE_CANDIDATES.filter(
    (stride) => stride < notes.length && gcd(stride, notes.length) === 1,
  );
  const specialDates = [...specialDays.keys()];

  function noteForDate(date: string, userKey: string): DatedNote {
    if (!isDateKey(date))
      throw new RangeError(ui.internalErrors.invalidPofiNoteDate(date));
    if (typeof userKey !== "string" || !userKey.trim())
      throw new Error(ui.internalErrors.missingPofiUserKey);
    if (!isNotebookDate(date, specialDates))
      throw new RangeError(
        ui.internalErrors.pofiNotesAreForWeekdaysAndSpecialDates(date),
      );
    const special = specialDays.get(date.slice(5));
    let id: string;
    if (special) {
      const variant =
        special.sharedVariant ??
        special.variants[
          hash(`pofi-notes:v1:${userKey}:${date.slice(5)}`) %
            special.variants.length
        ];
      id = `special:${special.note}:${variant}`;
    } else {
      if (!notes.length) throw new Error(ui.internalErrors.noRegularPofiNotes);
      const seed = hash(`pofi-notes:v1:${userKey}:${weekStart(date)}`);
      const stride = strides[(seed >>> 16) % strides.length];
      id = notes[(seed + weekday(date) * stride) % notes.length];
    }
    return { date, ...catalogue.resolve(id) };
  }

  return {
    noteForDate,
    notesForWeek(today: string, userKey: string): DatedNote[] {
      if (!isDateKey(today))
        throw new RangeError(ui.internalErrors.invalidPofiNoteDate(today));
      if (typeof userKey !== "string" || !userKey.trim())
        throw new Error(ui.internalErrors.missingPofiUserKey);
      return pofiNotebookDates(today, specialDates)
        .filter((date) => notes.length > 0 || specialDays.has(date.slice(5)))
        .map((date) => noteForDate(date, userKey));
    },
  };
}
