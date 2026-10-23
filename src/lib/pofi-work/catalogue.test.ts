import { expect, test } from "bun:test";
import { addDays, dateKey } from "@/domain/rules/calendar";
import { createPofiWorkCatalogue } from "./catalogue";
import { pofiWork } from "./index";
import type { PofiWorkCategory, PofiWorkDay } from "./types";

const categories = ["window", "break", "company"] as const;
const pool = (category: PofiWorkCategory, size: number) => Array.from({ length: size }, (_, index) => ({
  id: `${category}-${index}`, text: `${category} ${index}.`,
}));
function content(sizes = [10, 10, 10]) {
  return {
    pools: { window: pool("window", sizes[0]), break: pool("break", sizes[1]), company: pool("company", sizes[2]) },
    linked: [] as PofiWorkDay[],
  };
}
const linked = [
  { id: "mandarin", window: "Pencereye baktım.", break: "Mandalinamı soydum.", company: "Yarısını verdim." },
  { id: "tea", window: "Perdeyi açtım.", break: "Çay koydum.", company: "Bir bardak da yan masaya götürdüm." },
];

test("günlük seçim sabittir; havuzlar aynı eşleşmeyle başa sarmaz", () => {
  const catalogue = createPofiWorkCatalogue(content());
  expect(catalogue.forDate("1970-01-01")).toEqual({
    id: "mixed:window-0:break-0:company-0", window: "window 0.", break: "break 0.", company: "company 0.",
  });
  expect(catalogue.forDate("1970-01-11")).toEqual({
    id: "mixed:window-0:break-1:company-1", window: "window 0.", break: "break 1.", company: "company 1.",
  });
  expect(catalogue.forDate("1970-04-11")).toEqual({
    id: "mixed:window-0:break-0:company-1", window: "window 0.", break: "break 0.", company: "company 1.",
  });
  expect(catalogue.forDate("1970-01-11")).toEqual(catalogue.forDate("1970-01-11"));
});

test("20 kayıtlı üç havuz 8.000 farklı normal üçlüye ulaşır", () => {
  const catalogue = createPofiWorkCatalogue(content([20, 20, 20]));
  const ids = Array.from({ length: 8_000 }, (_, index) => catalogue.forDate(addDays("1970-01-01", index)).id);
  expect(new Set(ids).size).toBe(8_000);
});

test("yeni kayıt yalnız içerik değişikliğiyle seçime katılır", () => {
  const source = content();
  source.pools.window.push({ id: "extra", text: "Yeni pencere kaydı." });
  expect(createPofiWorkCatalogue(source).forDate("1970-01-11").window).toBe("Yeni pencere kaydı.");
});

test("bağlantılı üçlüler yedi günde bir bütün seçilir; aradaki günler havuzlardan gelir", () => {
  const catalogue = createPofiWorkCatalogue({ ...content(), linked });
  expect(catalogue.forDate("1970-01-01")).toEqual({ ...linked[0], id: "linked:mandarin" });
  expect(catalogue.forDate("1970-01-08")).toEqual({ ...linked[1], id: "linked:tea" });
  expect(catalogue.forDate("1970-01-15")).toEqual({ ...linked[0], id: "linked:mandarin" });
  expect(catalogue.forDate("1970-01-02").id).toBe("mixed:window-1:break-1:company-1");
});

test("üretim içeriğinde ve farklı büyüklükteki havuzlarda son yedi günün kaydı tekrarlanmaz", () => {
  for (const catalogue of [pofiWork, createPofiWorkCatalogue({ ...content([10, 11, 13]), linked })]) {
    const recent: Record<PofiWorkCategory, string[]> = { window: [], break: [], company: [] };
    for (let offset = 0; offset < 450; offset++) {
      const day = catalogue.forDate(addDays("1969-12-20", offset));
      for (const category of categories) {
        expect(recent[category].slice(-7)).not.toContain(day[category]);
        recent[category].push(day[category]);
      }
    }
  }
});

test("İstanbul gece yarısında set değişir; yıl ve artık gün sınırları korunur", () => {
  const before = dateKey(Date.parse("2026-10-23T20:59:59Z"));
  const after = dateKey(Date.parse("2026-10-23T21:00:00Z"));
  expect(before).toBe("2026-10-23");
  expect(after).toBe("2026-10-24");
  expect(pofiWork.forDate(before)).not.toEqual(pofiWork.forDate(after));
  expect(pofiWork.forDate("2026-12-31")).not.toEqual(pofiWork.forDate("2027-01-01"));
  expect(pofiWork.forDate("2028-02-28")).not.toEqual(pofiWork.forDate("2028-02-29"));
  expect(pofiWork.forDate("2028-02-29")).not.toEqual(pofiWork.forDate("2028-03-01"));
});

test("boş veya bozuk içerik ve geçersiz tarih sessizce gösterilmez", () => {
  expect(() => createPofiWorkCatalogue(content([0, 10, 10]))).toThrow();
  expect(() => createPofiWorkCatalogue(content([10, 9, 10]))).toThrow();
  for (const category of categories) {
    for (const invalid of [{ id: "Bad ID" }, { id: undefined }, { text: " " }]) {
      const source = content();
      Object.assign(source.pools[category][0], invalid);
      expect(() => createPofiWorkCatalogue(source)).toThrow();
    }
    const duplicateId = content();
    duplicateId.pools[category][1].id = duplicateId.pools[category][0].id;
    expect(() => createPofiWorkCatalogue(duplicateId)).toThrow();
    const duplicateText = content();
    duplicateText.pools[category][1].text = duplicateText.pools[category][0].text;
    expect(() => createPofiWorkCatalogue(duplicateText)).toThrow();
  }
  expect(() => createPofiWorkCatalogue({ ...content(), linked: [linked[0]] })).toThrow();
  expect(() => createPofiWorkCatalogue({ ...content(), linked: [linked[0], linked[0]] })).toThrow();
  expect(() => createPofiWorkCatalogue({ ...content(), linked: [linked[0], { ...linked[1], break: linked[0].break }] })).toThrow();
  expect(() => createPofiWorkCatalogue({ ...content(), linked: [linked[0], { ...linked[1], window: "window 0." }] })).toThrow();
  for (const date of ["", "2026-02-29", "2026-13-01", "2026-10-23T00:00:00Z"])
    expect(() => pofiWork.forDate(date)).toThrow();
});

test("yazarlık verisi ve dönen set çalışan kataloğu değiştiremez", () => {
  const source = { ...content(), linked: linked.map(day => ({ ...day })) };
  const catalogue = createPofiWorkCatalogue(source);
  source.pools.window[1].text = "Değişti.";
  source.linked[0].window = "Değişti.";
  source.pools.window.push({ id: "extra", text: "Yeni kayıt." });
  expect(catalogue.forDate("1970-01-01")).toEqual({ ...linked[0], id: "linked:mandarin" });
  expect(catalogue.forDate("1970-01-02").window).toBe("window 1.");
  expect(() => { (catalogue.forDate("1970-01-02") as { window: string }).window = "Değişti."; }).toThrow();
  expect(catalogue.forDate("1970-01-02").window).toBe("window 1.");
});
