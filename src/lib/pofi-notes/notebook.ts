import { isDateKey, weekStart, weekday } from "@/domain/rules/calendar";
import {
  isNotebookDate,
  pofiNotebookDates,
} from "@/domain/rules/notebook-calendar";
import type { NoteCatalogue } from "./catalogue";
import type { DatedNote, NotePublication } from "./types";

function hash(value: string) {
  let result = 2166136261;
  for (const character of value)
    result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
export function publicationStrides(poolSize: number): number[] {
  return Array.from(
    { length: Math.min(23, poolSize - 1) },
    (_, index) => index + 1,
  ).filter((stride) => gcd(stride, poolSize) === 1);
}

export function createPofiNotebook(
  catalogue: NoteCatalogue,
  source: readonly NotePublication[],
) {
  if (!source.length)
    throw new Error("At least one note publication is required");
  // Snapshot configuration to keep later editor mutations from changing this notebook.
  const publications: NotePublication[] = structuredClone([...source]);
  for (const [index, publication] of publications.entries()) {
    if (
      !isDateKey(publication.from) ||
      weekday(publication.from) !== 0 ||
      (index > 0 && publication.from <= publications[index - 1].from)
    )
      throw new Error(
        `Publication dates must be unique ascending Mondays: ${publication.from}`,
      );
    if (
      publication.notes.length < 5 ||
      new Set(publication.notes).size !== publication.notes.length
    )
      throw new Error(
        `Publication needs at least five unique notes: ${publication.from}`,
      );
    for (const id of publication.notes) {
      if (id.startsWith("special:"))
        throw new Error(`Regular pool contains special note: ${id}`);
      catalogue.resolve(id);
    }
    if (
      !publication.strides.length ||
      publication.strides.some(
        (stride) =>
          !Number.isInteger(stride) ||
          stride < 1 ||
          gcd(stride, publication.notes.length) !== 1,
      )
    )
      throw new Error(`Invalid publication strides: ${publication.from}`);
    for (const [date, special] of Object.entries(publication.specialDays)) {
      if (
        !isDateKey(`2000-${date}`) ||
        date.length !== 5 ||
        !special.variants.length ||
        new Set(special.variants).size !== special.variants.length
      )
        throw new Error(`Invalid special day: ${date}`);
      for (const variant of special.variants)
        catalogue.resolve(`special:${special.note}:${variant}`);
      if (
        special.sharedVariant &&
        !special.variants.includes(special.sharedVariant)
      )
        throw new Error(`Unknown shared variant: ${date}`);
    }
  }

  function publicationFor(date: string) {
    if (!isDateKey(date))
      throw new RangeError(`Invalid Pofi note date: ${date}`);
    const monday = weekStart(date);
    const publication = publications.findLast((item) => item.from <= monday);
    if (!publication) throw new RangeError(`No note publication for: ${date}`);
    return publication;
  }

  function noteForDate(date: string, userKey: string): DatedNote {
    const publication = publicationFor(date);
    if (typeof userKey !== "string" || !userKey.trim())
      throw new Error("Missing Pofi user key");
    const specialDates = Object.keys(publication.specialDays);
    if (!isNotebookDate(date, specialDates))
      throw new RangeError(
        `Pofi notes are for weekdays and special dates: ${date}`,
      );
    const special = publication.specialDays[date.slice(5)];
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
      const seed = hash(`pofi-notes:v1:${userKey}:${weekStart(date)}`);
      const stride =
        publication.strides[(seed >>> 16) % publication.strides.length];
      id =
        publication.notes[
          (seed + weekday(date) * stride) % publication.notes.length
        ];
    }
    return { date, ...catalogue.resolve(id) };
  }

  return {
    noteForDate,
    notesForWeek(today: string, userKey: string): DatedNote[] {
      const publication = publicationFor(today);
      return pofiNotebookDates(today, Object.keys(publication.specialDays)).map(
        (date) => noteForDate(date, userKey),
      );
    },
  };
}
