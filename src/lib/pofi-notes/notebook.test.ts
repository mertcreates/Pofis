import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { createNoteCatalogue } from "./catalogue";
import { createPofiNotebook } from "./notebook";
import { pofiNoteCatalogue, pofiNotebook } from "./index";
import { POFI_NOTE_THEMES } from "./themes/index.js";
import { POFI_SPECIAL_NOTES } from "./specials.js";
import contentFixture from "./fixtures/current-content.json";
import selectionFixture from "./fixtures/selections.json";
import type { NoteTheme, DatedNote } from "./types";

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

test("güncel tema ve özel not metinleri içerik referansıyla eşleşir", () => {
  for (const [id, reference] of Object.entries(contentFixture.themes)) {
    const theme = POFI_NOTE_THEMES.find((theme) => theme.id === id);
    expect(theme).toBeDefined();
    const sourceGroup = (group: Record<string, string>, prefix: string) =>
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
          intros: sourceGroup(theme!.intros, "i"),
          developments: sourceGroup(theme!.developments, "d"),
          endings: sourceGroup(theme!.endings, "e"),
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
  "tek havuz günlük seçimleri 2026–2028 boyunca tutarlı: $key",
  ({ key, count, sha256 }) => {
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

test("katalog tek havuzu güncel bütün tema ve parçalardan üretir", () => {
  const original = theme();
  const expanded = createNoteCatalogue({
    themes: [
      { ...original, intros: { ...original.intros, i4: "Dört.", i5: "Beş." } },
      theme("rain"),
    ],
    specials: {},
  });
  const pool = expanded.createPool();
  const notebook = createPofiNotebook(expanded);

  expect(pool).toHaveLength(16);
  expect(pool).toContain("cloud:i5:d1:e2");
  expect(pool).toContain("rain:i1:d1:e1");
  for (const date of ["2020-10-19", "2026-10-16", "2026-10-19"])
    expect(pool).toContain(notebook.noteForDate(date, "a").id);
});

test("özel gün varyantı katalogdan gelir ve ortak seçim herkes için aynıdır", () => {
  const catalogue = createNoteCatalogue({
    themes: [theme()],
    specials: {
      star: {
        theme: "Yıldız",
        variants: { v1: ["İlk not."], v2: ["Yeni not."] },
      },
    },
  });
  const notebook = createPofiNotebook(catalogue, {
    "12-08": { note: "star", sharedVariant: "v2" },
  });
  expect(notebook.noteForDate("2026-12-08", "a")).toEqual(
    notebook.noteForDate("2026-12-08", "b"),
  );
  expect(notebook.noteForDate("2026-12-08", "a").parts).toEqual([
    "Yeni not.",
  ]);
  expect(() =>
    createPofiNotebook(catalogue, {
      "12-08": { note: "star", sharedVariant: "missing" },
    }),
  ).toThrow("Unknown shared variant");
});

test("bozuk içerik ve geçersiz tarih başarı gibi sunulmaz", () => {
  expect(() =>
    createNoteCatalogue({ themes: [theme(), theme()], specials: {} }),
  ).toThrow("duplicate theme");
  expect(() =>
    createNoteCatalogue({
      themes: [{ ...theme(), intros: { i1: "" } }],
      specials: {},
    }),
  ).toThrow("Empty note text");
  expect(() => smallCatalogue().resolve("cloud:i1:d1:e1:extra")).toThrow(
    "Unknown Pofi note",
  );
  expect(() =>
    createPofiNotebook(
      createNoteCatalogue({
        themes: [
          {
            ...theme(),
            intros: { i1: "Bir." },
            endings: { e1: "Gitti." },
          },
        ],
        specials: {},
      }),
    ),
  ).toThrow("at least five");
  expect(() =>
    createPofiNotebook(smallCatalogue(), { "2-08": { note: "star" } }),
  ).toThrow("Invalid special day");
  expect(() =>
    createPofiNotebook(smallCatalogue(), { "12-08": { note: "missing" } }),
  ).toThrow("Unknown special note");

  const notebook = createPofiNotebook(smallCatalogue());
  expect(() => notebook.noteForDate("not-a-date", "a")).toThrow(
    "Invalid Pofi note date",
  );
  expect(() => notebook.noteForDate("2026-10-16", " ")).toThrow(
    "Missing Pofi user key",
  );
  expect(() => notebook.noteForDate("2026-10-17", "a")).toThrow(
    "weekdays and special dates",
  );
  expect(() => notebook.notesForWeek("not-a-date", "a")).toThrow(
    "Invalid Pofi note date",
  );
});

test("katalog ve özel gün listesi motor kurulduktan sonra dışarıdan değiştirilemez", () => {
  const content = { ...theme(), intros: { ...theme().intros } };
  const catalogue = createNoteCatalogue({
    themes: [content],
    specials: {
      star: {
        theme: "Yıldız",
        variants: { v1: ["Ortak not."], v2: ["Yeni not."] },
      },
    },
  });
  const specialDays = { "12-08": { note: "star", sharedVariant: "v1" } };
  const notebook = createPofiNotebook(catalogue, specialDays);
  const expected = notebook.noteForDate("2026-12-08", "a");

  content.intros.i1 = "Değiştirildi.";
  specialDays["12-08"].sharedVariant = "v2";
  notebook.noteForDate("2026-12-08", "a").parts[0] = "Değiştirildi.";
  expect(notebook.noteForDate("2026-12-08", "a")).toEqual(expected);

  const pool = pofiNoteCatalogue.createPool();
  expect(pool).toHaveLength(1280);
  expect(new Set(pool).size).toBe(1280);
  pool.pop();
  expect(pofiNoteCatalogue.createPool()).toHaveLength(1280);
  expect(pofiNoteCatalogue.inventory().length).toBeGreaterThanOrEqual(20);
});
