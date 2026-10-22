import { ui } from "../ui-text.js";
import type { Note, NoteTheme, SpecialNote } from "./types";

const groups = ["intros", "developments", "endings"] as const;
const validId = (value: string) => /^[a-z][a-z0-9-]*$/.test(value);
function requireText(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(ui.internalErrors.emptyNoteText(label));
}

// Content is copied at construction; authoring objects cannot mutate a running catalogue.
export function createNoteCatalogue(content: {
  themes: readonly NoteTheme[];
  specials: Readonly<Record<string, SpecialNote>>;
}) {
  const notes = new Map<string, Note>();
  const themes = new Map<
    string,
    {
      title: string;
      premise: string;
      groups: Record<(typeof groups)[number], string[]>;
    }
  >();
  const specialVariants = new Map<string, string[]>();
  const themePools: string[][] = [];
  for (const theme of content.themes) {
    if (!validId(theme.id) || theme.id === "special" || themes.has(theme.id))
      throw new Error(ui.internalErrors.invalidOrDuplicateTheme(theme.id));
    requireText(theme.title, theme.id);
    requireText(theme.premise, theme.id);
    const keys = {
      intros: [] as string[],
      developments: [] as string[],
      endings: [] as string[],
    };
    const themePool: string[] = [];
    for (const group of groups) {
      if (!theme[group] || !Object.keys(theme[group]).length)
        throw new Error(ui.internalErrors.emptyThemeGroup(theme.id, group));
      for (const [id, text] of Object.entries(theme[group])) {
        if (!validId(id))
          throw new Error(ui.internalErrors.invalidFragment(theme.id, group, id));
        requireText(text, `${theme.id}:${group}:${id}`);
        keys[group].push(id);
      }
    }
    for (const intro of keys.intros)
      for (const development of keys.developments)
        for (const ending of keys.endings) {
          const id = `${theme.id}:${intro}:${development}:${ending}`;
          notes.set(id, {
            id,
            theme: theme.title,
            parts: [
              theme.intros[intro],
              theme.developments[development],
              theme.endings[ending],
            ],
          });
          themePool.push(id);
        }
    themes.set(theme.id, {
      title: theme.title,
      premise: theme.premise,
      groups: keys,
    });
    themePools.push(themePool);
  }
  for (const [id, special] of Object.entries(content.specials)) {
    if (!validId(id)) throw new Error(ui.internalErrors.invalidSpecialNote(id));
    requireText(special.theme, id);
    const variants = Object.keys(special.variants);
    if (!variants.length) throw new Error(ui.internalErrors.emptySpecialNote(id));
    for (const variant of variants) {
      if (
        !validId(variant) ||
        !Array.isArray(special.variants[variant]) ||
        !special.variants[variant].length
      )
        throw new Error(ui.internalErrors.invalidSpecialVariant(id, variant));
      for (const part of special.variants[variant])
        requireText(part, `${id}:${variant}`);
      const noteId = `special:${id}:${variant}`;
      notes.set(noteId, {
        id: noteId,
        theme: special.theme,
        parts: [...special.variants[variant]],
      });
    }
    specialVariants.set(id, variants);
  }

  // Interleave theme pools once so catalogue creation is the only combination pass.
  const notePool: string[] = [];
  const longestThemePool = Math.max(0, ...themePools.map((pool) => pool.length));
  for (let index = 0; index < longestThemePool; index++)
    for (const pool of themePools) if (pool[index]) notePool.push(pool[index]);

  function resolve(id: string): Note {
    const note = notes.get(id);
    if (!note) throw new Error(ui.internalErrors.unknownPofiNote(id));
    return { ...note, parts: [...note.parts] };
  }

  return {
    resolve,
    createPool: () => [...notePool],
    inventory: () =>
      [...themes].map(([id, theme]) => ({
        id,
        title: theme.title,
        premise: theme.premise,
        fragments: groups.reduce(
          (sum, group) => sum + theme.groups[group].length,
          0,
        ),
      })),
    variants: (id: string) => {
      const variants = specialVariants.get(id);
      if (!variants) throw new Error(ui.internalErrors.unknownSpecialNote(id));
      return [...variants];
    },
  };
}
export type NoteCatalogue = ReturnType<typeof createNoteCatalogue>;
