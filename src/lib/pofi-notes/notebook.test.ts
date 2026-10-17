import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { createNoteCatalogue } from "./catalogue";
import { createPofiNotebook } from "./notebook";
import { prepareNotePublication } from "./authoring";
import { pofiNoteCatalogue } from "./index";
import { NOTE_PUBLICATIONS } from "./publications";
import { POFI_NOTE_THEMES } from "./themes/index.js";
import { POFI_SPECIAL_NOTES } from "./specials.js";
import contentFixture from "./fixtures/archive-content.json";
import selectionFixture from "./fixtures/archive-selections.json";
import type { NoteTheme, NotePublication, DatedNote } from "./types";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

test("ZIP'teki 20 tema / 240 parça ve 11 özel not / 44 varyant metinleri aynen korunur", () => {
  for (const [id, reference] of Object.entries(contentFixture.themes)) {
    const theme = POFI_NOTE_THEMES.find((theme) => theme.id === id);
    expect(theme).toBeDefined();
    const archiveGroup = (group: Record<string, string>, prefix: string) =>
      Object.fromEntries(
        [1, 2, 3, 4].map((number) => [
          `${prefix}${number}`,
          group[`${prefix}${number}`],
        ]),
      );
    expect(
      sha(
        canonical({
          ...theme,
          intros: archiveGroup(theme!.intros, "i"),
          developments: archiveGroup(theme!.developments, "d"),
          endings: archiveGroup(theme!.endings, "e"),
        }),
      ),
    ).toBe(reference.sha256);
  }
  for (const [id, reference] of Object.entries(contentFixture.specials)) {
    const special = POFI_SPECIAL_NOTES[id as keyof typeof POFI_SPECIAL_NOTES];
    expect(special).toBeDefined();
    expect(
      sha(
        canonical({
          ...special,
          variants: Object.fromEntries(
            ["v1", "v2", "v3", "v4"].map((key) => [
              key,
              special.variants[key as keyof typeof special.variants],
            ]),
          ),
        }),
      ),
    ).toBe(reference.sha256);
  }
});

test.each(selectionFixture)(
  "arşiv seçimleri 2026–2028 boyunca değişmez: $key",
  ({ key, count, sha256 }) => {
    // Future publications may intentionally change later selections; compare the archived schedule only.
    const pofiNotebook = createPofiNotebook(
      pofiNoteCatalogue,
      NOTE_PUBLICATIONS.slice(0, 1),
    );
    const notes: DatedNote[] = [];
    for (
      let at = Date.UTC(2026, 0, 1);
      at < Date.UTC(2029, 0, 1);
      at += 86400000
    ) {
      const date = new Date(at).toISOString().slice(0, 10);
      const note = pofiNotebook
        .notesForWeek(date, key)
        .find((note) => note.date === date);
      if (note) notes.push(note);
    }
    expect(notes.length).toBe(count);
    expect(sha(JSON.stringify(notes))).toBe(sha256);
  },
);

const theme = (id = "cloud"): NoteTheme => ({
  id,
  title: "Bulut",
  premise: "Pofi buluta baktı.",
  intros: { i1: "Bir.", i2: "İki.", i3: "Üç." },
  developments: { d1: "Bekledim." },
  endings: { e1: "Gitti.", e2: "Kaldı." },
});
const smallCatalogue = () =>
  createNoteCatalogue({ themes: [theme()], specials: {} });
const baseline = (catalogue = smallCatalogue()): NotePublication[] => [
  {
    from: "0001-01-01",
    notes: catalogue.createPool(),
    strides: [1, 5],
    specialDays: {},
  },
];

test("yeni tema ve beşinci giriş parçası motor değişmeden havuza girer; geçmiş atamalar korunur", () => {
  const old = smallCatalogue();
  const original = theme();
  const expanded = createNoteCatalogue({
    themes: [
      { ...original, intros: { ...original.intros, i4: "Dört.", i5: "Beş." } },
      theme("rain"),
    ],
    specials: {},
  });
  const history = baseline(old);
  const publication = prepareNotePublication(
    expanded,
    history,
    {},
    { from: "2026-10-26", today: "2026-10-16" },
  );
  expect(publication.notes).toHaveLength(16);
  expect(publication.notes).toContain("cloud:i5:d1:e2");
  expect(publication.notes).toContain("rain:i1:d1:e1");
  const before = createPofiNotebook(old, history);
  const after = createPofiNotebook(expanded, [...history, publication]);
  expect(after.notesForWeek("2026-10-16", "a")).toEqual(
    before.notesForWeek("2026-10-16", "a"),
  );
  expect(
    new Set(after.notesForWeek("2026-10-26", "a").map((note) => note.id)).size,
  ).toBe(5);
});

test("tema, parça ve tam not gelecek seçimden çıkarılabilir; arşivde çözülmeye devam eder", () => {
  const catalogue = createNoteCatalogue({
    themes: [theme(), theme("rain"), theme("sun")],
    specials: {},
  });
  const history = baseline(catalogue);
  const publication = prepareNotePublication(
    catalogue,
    history,
    {},
    {
      from: "2026-10-26",
      today: "2026-10-16",
      excludeThemes: ["rain"],
      excludeParts: ["cloud:intros:i3"],
      excludeNotes: ["sun:i2:d1:e1"],
    },
  );
  expect(publication.notes).toHaveLength(9);
  expect(publication.notes.some((id) => id.startsWith("rain:"))).toBe(false);
  expect(publication.notes.some((id) => id.startsWith("cloud:i3:"))).toBe(
    false,
  );
  expect(publication.notes).not.toContain("sun:i2:d1:e1");
  expect(catalogue.resolve("rain:i1:d1:e1").parts).toEqual([
    "Bir.",
    "Bekledim.",
    "Gitti.",
  ]);
  const notebook = createPofiNotebook(catalogue, [...history, publication]);
  for (const key of ["a", "b", "c"])
    expect(
      notebook
        .notesForWeek("2026-10-26", key)
        .every((note) => publication.notes.includes(note.id)),
    ).toBe(true);
});

test("özel gün varyantı ekleme/çıkarma tarihli yayına bağlıdır; ortak not içerik verisidir", () => {
  const catalogue = createNoteCatalogue({
    themes: [theme()],
    specials: {
      star: {
        theme: "Yıldız",
        variants: { v1: ["Ortak not."], v2: ["Yeni not."] },
      },
    },
  });
  const history = baseline(catalogue);
  const publication = prepareNotePublication(
    catalogue,
    history,
    { "12-08": { note: "star", sharedVariant: "v2" } },
    { from: "2026-10-26", today: "2026-10-16" },
  );
  const notebook = createPofiNotebook(catalogue, [...history, publication]);
  expect(notebook.noteForDate("2026-12-08", "a")).toEqual(
    notebook.noteForDate("2026-12-08", "b"),
  );
  expect(notebook.noteForDate("2026-12-08", "a").parts).toEqual(["Yeni not."]);
  const noSpecial = prepareNotePublication(
    catalogue,
    [...history, publication],
    { "12-08": { note: "star" } },
    { from: "2027-01-04", today: "2026-10-16", excludeSpecialDates: ["12-08"] },
  );
  expect(noSpecial.specialDays).toEqual({});
  expect(notebook.notesForWeek("2029-12-08", "a").at(-1)!.date).toBe(
    "2029-12-08",
  );
});

test("bozuk içerik ve yayınlar başarı gibi sunulmaz", () => {
  expect(() =>
    createNoteCatalogue({ themes: [theme(), theme()], specials: {} }),
  ).toThrow("duplicate theme");
  expect(() =>
    createNoteCatalogue({
      themes: [{ ...theme(), intros: { i1: "" } }],
      specials: {},
    }),
  ).toThrow("Empty note text");
  const catalogue = smallCatalogue();
  expect(() => catalogue.createPool({ excludeThemes: ["missing"] })).toThrow(
    "Unknown excluded theme",
  );
  expect(() =>
    catalogue.createPool({ excludeParts: ["cloud:intros:missing"] }),
  ).toThrow("Unknown excluded fragment");
  expect(() => catalogue.resolve("cloud:i1:d1:e1:extra")).toThrow(
    "Unknown Pofi note",
  );
  const history = baseline(catalogue);
  expect(() =>
    createPofiNotebook(catalogue, [
      { ...history[0], notes: history[0].notes.slice(0, 4) },
    ]),
  ).toThrow("at least five");
  expect(() =>
    createPofiNotebook(catalogue, [{ ...history[0], strides: [2] }]),
  ).toThrow("Invalid publication strides");
  expect(() =>
    prepareNotePublication(
      catalogue,
      history,
      {},
      { from: "2026-10-12", today: "2026-10-16" },
    ),
  ).toThrow("future Monday");
  expect(() =>
    prepareNotePublication(
      catalogue,
      history,
      {},
      { from: "2026-10-27", today: "2026-10-16" },
    ),
  ).toThrow("future Monday");
  expect(() => createPofiNotebook(catalogue, [...history, history[0]])).toThrow(
    "ascending Mondays",
  );
});

test("çağıran içerik, yayın veya dönen parçaları değiştirince motor etkilenmez", () => {
  const content = { ...theme(), intros: { ...theme().intros } };
  const catalogue = createNoteCatalogue({ themes: [content], specials: {} });
  const publications = baseline(catalogue);
  const notebook = createPofiNotebook(catalogue, publications);
  const expected = notebook.noteForDate("2026-10-16", "a");
  content.intros.i1 = "Değiştirildi.";
  publications[0].notes.length = 0;
  notebook.noteForDate("2026-10-16", "a").parts[0] = "Değiştirildi.";
  expect(notebook.noteForDate("2026-10-16", "a")).toEqual(expected);
  expect(pofiNoteCatalogue.inventory().length).toBeGreaterThanOrEqual(20);
  expect(NOTE_PUBLICATIONS[0].notes).toHaveLength(1280);
});
