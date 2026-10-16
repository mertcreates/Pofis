import type { Note, NoteTheme, PoolSelection, SpecialNote } from "./types";

const groups = ["intros", "developments", "endings"] as const;
const validId = (value: string) => /^[a-z][a-z0-9-]*$/.test(value);
function requireText(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`Empty note text: ${label}`);
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
  for (const theme of content.themes) {
    if (!validId(theme.id) || theme.id === "special" || themes.has(theme.id))
      throw new Error(`Invalid or duplicate theme: ${theme.id}`);
    requireText(theme.title, theme.id);
    requireText(theme.premise, theme.id);
    const keys = {
      intros: [] as string[],
      developments: [] as string[],
      endings: [] as string[],
    };
    for (const group of groups) {
      if (!theme[group] || !Object.keys(theme[group]).length)
        throw new Error(`Empty theme group: ${theme.id}:${group}`);
      for (const [id, text] of Object.entries(theme[group])) {
        if (!validId(id))
          throw new Error(`Invalid fragment: ${theme.id}:${group}:${id}`);
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
        }
    themes.set(theme.id, {
      title: theme.title,
      premise: theme.premise,
      groups: keys,
    });
  }
  for (const [id, special] of Object.entries(content.specials)) {
    if (!validId(id)) throw new Error(`Invalid special note: ${id}`);
    requireText(special.theme, id);
    const variants = Object.keys(special.variants);
    if (!variants.length) throw new Error(`Empty special note: ${id}`);
    for (const variant of variants) {
      if (
        !validId(variant) ||
        !Array.isArray(special.variants[variant]) ||
        !special.variants[variant].length
      )
        throw new Error(`Invalid special variant: ${id}:${variant}`);
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

  function resolve(id: string): Note {
    const note = notes.get(id);
    if (!note) throw new Error(`Unknown Pofi note: ${id}`);
    return { ...note, parts: [...note.parts] };
  }

  function createPool(selection: PoolSelection = {}): string[] {
    const excludedThemes = new Set(selection.excludeThemes ?? []);
    const excludedParts = new Set(selection.excludeParts ?? []);
    const excludedNotes = new Set(selection.excludeNotes ?? []);
    for (const id of excludedThemes)
      if (!themes.has(id)) throw new Error(`Unknown excluded theme: ${id}`);
    for (const reference of excludedParts) {
      const [theme, group, id, extra] = reference.split(":");
      if (
        extra ||
        !groups.includes(group as (typeof groups)[number]) ||
        !themes
          .get(theme)
          ?.groups[group as (typeof groups)[number]]?.includes(id)
      )
        throw new Error(`Unknown excluded fragment: ${reference}`);
    }
    for (const id of excludedNotes) {
      resolve(id);
      if (id.startsWith("special:"))
        throw new Error(
          `Special notes are managed by special-day selection: ${id}`,
        );
    }
    const pools: string[][] = [];
    for (const [themeId, theme] of themes) {
      if (excludedThemes.has(themeId)) continue;
      const included = Object.fromEntries(
        groups.map((group) => [
          group,
          theme.groups[group].filter(
            (id) => !excludedParts.has(`${themeId}:${group}:${id}`),
          ),
        ]),
      ) as Record<(typeof groups)[number], string[]>;
      if (groups.some((group) => !included[group].length))
        throw new Error(
          `No eligible fragments in theme: ${themeId}; exclude the theme instead`,
        );
      const pool: string[] = [];
      for (const intro of included.intros)
        for (const development of included.developments)
          for (const ending of included.endings) {
            const id = `${themeId}:${intro}:${development}:${ending}`;
            if (!excludedNotes.has(id)) pool.push(id);
          }
      pools.push(pool);
    }
    // Interleave themes while supporting different fragment counts per theme.
    const result: string[] = [];
    const longest = Math.max(0, ...pools.map((pool) => pool.length));
    for (let index = 0; index < longest; index++)
      for (const pool of pools) if (pool[index]) result.push(pool[index]);
    return result;
  }

  return {
    resolve,
    createPool,
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
      if (!variants) throw new Error(`Unknown special note: ${id}`);
      return [...variants];
    },
  };
}
export type NoteCatalogue = ReturnType<typeof createNoteCatalogue>;
