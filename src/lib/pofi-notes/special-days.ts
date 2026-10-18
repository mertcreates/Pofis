// Content scheduling metadata; the shared birthday note is explicit, not an engine exception.
export const SPECIAL_DAYS: Readonly<
  Record<string, { note: string; sharedVariant?: string }>
> = {
  "01-01": { note: "new-year" },
  "02-14": { note: "small-heart" },
  "02-29": { note: "leap-day" },
  "03-12": { note: "paper-boat-arrives" },
  "04-01": { note: "april-fools" },
  "04-09": { note: "paper-boat-moves" },
  "04-23": { note: "children-day" },
  "05-07": { note: "paper-boat-returns" },
  "08-08": { note: "cat-day" },
  "10-29": { note: "republic-day" },
  "11-10": { note: "ataturk-remembrance" },
  "12-08": { note: "little-star", sharedVariant: "v1" },
  "12-31": { note: "year-end" },
};
