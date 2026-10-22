import { expect, test } from "bun:test";
import { createNoteCatalogue } from "./catalogue";
import { createPofiNotebook } from "./notebook";
import { pofiNotebook } from "./index";
import type { NoteTheme } from "./types";

test("8 Aralık hafta içi ve hafta sonunda herkese korunan Küçük yıldız v1 notunu verir", () => {
  for (const date of ["2026-12-08", "2029-12-08"])
    for (const key of ["fixture-a", "fixture-b", "Türkçe-anahtar"])
      expect(pofiNotebook.notesForWeek(date, key).find((note) => note.date === date))
        .toEqual({
          date,
          id: "special:little-star:v1",
          theme: "Küçük yıldız",
          parts: [
            "Takvimin kenarına bugün için küçük bir yıldız çizdim.",
            "Biri nedenini sordu.",
            "“İyi ki,” dedim.",
          ],
        });
});

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

test("dolu havuzda haftalık seçim sabittir ve aynı hafta not tekrarlanmaz", () => {
  const notebook = createPofiNotebook(smallCatalogue());
  const notes = notebook.notesForWeek("2026-10-16", "a");
  expect(notes.map((note) => note.date)).toEqual([
    "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16",
  ]);
  expect(new Set(notes.map((note) => note.id)).size).toBe(5);
  expect(notebook.notesForWeek("2026-10-16", "a")).toEqual(notes);
  expect(notebook.notesForWeek("2026-10-16", "b")).not.toEqual(notes);
});

test("boş normal havuz haftayı boş bırakır ve özel günleri korur", () => {
  const notebook = createPofiNotebook(createNoteCatalogue({
    themes: [],
    specials: { star: { theme: "Yıldız", variants: { v1: ["Ortak not."] } } },
  }), { "12-08": { note: "star", sharedVariant: "v1" } });
  expect(notebook.notesForWeek("2026-10-16", "a")).toEqual([]);
  expect(notebook.notesForWeek("2026-12-08", "a")).toEqual([
    { date: "2026-12-08", id: "special:star:v1", theme: "Yıldız", parts: ["Ortak not."] },
  ]);
  expect(notebook.notesForWeek("2029-12-08", "a")[0].date).toBe("2029-12-08");
  expect(() => notebook.notesForWeek("2026-10-16", " ")).toThrow("Pofi kullanıcı anahtarı bulunamadı.");
  expect(() => notebook.noteForDate("2026-10-16", "a")).toThrow("Özel günler dışında Pofi notu bulunamadı.");
});

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
    "Pofi kullanıcı anahtarı bulunamadı.",
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

  const pool = catalogue.createPool();
  expect(pool).toHaveLength(6);
  expect(new Set(pool).size).toBe(6);
  pool.pop();
  expect(catalogue.createPool()).toHaveLength(6);
  expect(catalogue.inventory()).toHaveLength(1);
});
