export type NoteTheme = {
  readonly id: string;
  readonly title: string;
  readonly premise: string;
  readonly intros: Readonly<Record<string, string>>;
  readonly developments: Readonly<Record<string, string>>;
  readonly endings: Readonly<Record<string, string>>;
};
export type SpecialNote = {
  readonly theme: string;
  readonly variants: Readonly<Record<string, readonly string[]>>;
};
export type Note = { id: string; theme: string; parts: string[] };
export type DatedNote = Note & { date: string };
export type SpecialDay = {
  note: string;
  variants: string[];
  sharedVariant?: string;
};
export type NotePublication = {
  from: string;
  notes: string[];
  strides: number[];
  specialDays: Record<string, SpecialDay>;
};
export type PoolSelection = {
  excludeThemes?: readonly string[];
  excludeParts?: readonly string[];
  excludeNotes?: readonly string[];
};
