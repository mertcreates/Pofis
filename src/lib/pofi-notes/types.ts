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
