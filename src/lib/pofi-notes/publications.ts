import {
  POFI_NOTE_POOL_V1,
  POFI_NOTE_POOL_V1_LEGACY_LENGTH,
  POFI_NOTE_POOL_V1_EXPANSION_DATE,
  POFI_SPECIAL_VARIANTS_V1,
} from "./pool-v1.js";
import scheduled from "./scheduled-publications.json";
import type { NotePublication } from "./types";

// Frozen archive schedule. New special dates/variants belong in a future publication.
const archiveDays = {
  "01-01": "new-year",
  "02-14": "small-heart",
  "02-29": "leap-day",
  "03-12": "paper-boat-arrives",
  "04-01": "april-fools",
  "04-09": "paper-boat-moves",
  "04-23": "children-day",
  "05-07": "paper-boat-returns",
  "08-08": "cat-day",
  "12-08": "little-star",
  "12-31": "year-end",
};
const archiveSpecialDays = Object.fromEntries(
  Object.entries(archiveDays).map(([date, note]) => [
    date,
    {
      note,
      variants: [...POFI_SPECIAL_VARIANTS_V1],
      ...(date === "12-08" ? { sharedVariant: "v1" } : {}),
    },
  ]),
);

export const NOTE_PUBLICATIONS: readonly NotePublication[] = [
  {
    from: "0001-01-01",
    notes: POFI_NOTE_POOL_V1.slice(0, POFI_NOTE_POOL_V1_LEGACY_LENGTH),
    strides: [1, 5, 7, 11, 13, 17, 19, 23],
    specialDays: archiveSpecialDays,
  },
  {
    from: POFI_NOTE_POOL_V1_EXPANSION_DATE,
    notes: [...POFI_NOTE_POOL_V1],
    strides: [1, 3, 7, 9, 11, 13, 17, 19],
    specialDays: archiveSpecialDays,
  },
  ...scheduled,
];
