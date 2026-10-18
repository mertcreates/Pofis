import { expect, test } from "bun:test";
import {
  durationClock,
  durationText,
  formatClock,
  formatDate,
  weekLabel,
} from "./time";
import {
  addDays,
  clockSeconds,
  dateKey,
  isDateKey,
  sourceTimestamp,
  weekday,
  weekStart,
} from "@/domain/rules/calendar";
import { percentage } from "@/domain/rules/progress.js";

test("kaynak saatini İstanbul'un tarihsel UTC farkıyla taşır", () => {
  expect(sourceTimestamp("2026-10-16", "08:00:00")).toBe(
    Date.parse("2026-10-16T05:00:00Z"),
  );
  expect(sourceTimestamp("2015-01-05", "08:00:00")).toBe(
    Date.parse("2015-01-05T06:00:00Z"),
  );
  expect(formatClock(sourceTimestamp("2015-01-05", "08:00:00"))).toBe(
    "08:00:00",
  );
});

test.each([
  ["2015-03-29", "01:30:00", "2015-03-28T23:30:00Z"],
  ["2015-03-29", "02:30:00", "2015-03-29T00:30:00Z"],
  ["2015-03-29", "02:59:59", "2015-03-29T00:59:59Z"],
  ["2015-03-29", "04:00:00", "2015-03-29T01:00:00Z"],
  ["2016-03-27", "02:30:00", "2016-03-27T00:30:00Z"],
  ["2016-03-27", "04:00:00", "2016-03-27T01:00:00Z"],
])("yaz saati geçişinde %s %s kaynak saatini korur", (date, clock, utc) => {
  const expected = Date.parse(utc);
  expect(dateKey(expected)).toBe(date);
  expect(formatClock(expected)).toBe(clock);
  expect(sourceTimestamp(date, clock)).toBe(expected);
});

test.each(["2015-03-29", "2016-03-27"])(
  "%s ileri saat geçişinde var olmayan yerel saati reddeder",
  (date) => {
    expect(sourceTimestamp(date, "03:30:00")).toBeNull();
  },
);

test("UTC gece yarısından önce İstanbul'da yeni güne geçer", () => {
  expect(dateKey(Date.parse("2026-10-14T21:30:00Z"))).toBe("2026-10-15");
  expect(weekStart(dateKey(Date.parse("2026-10-18T21:01:00Z")))).toBe(
    "2026-10-19",
  );
});
test("takvim haftası pazartesi başlar, yıl/ay sınırlarını aşar", () => {
  expect(weekStart("2027-01-01")).toBe("2026-12-28");
  expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  expect(weekday("2026-10-18")).toBe(6);
  expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
});
test("geçersiz takvim gününü reddeder", () => {
  expect(isDateKey("2026-02-30")).toBe(false);
  expect(isDateKey("2026-2-2")).toBe(false);
});
test("arşiv gibi hedef altında aşağı yuvarlar, hedef üstünü gizlemez", () => {
  expect(percentage(6998, 10000)).toBe(69);
  expect(percentage(102, 100)).toBe(102);
  expect(percentage(0, 0)).toBe(100);
});
test("saniyeleri ve 24 saat üstü süreyi kaybetmez", () => {
  expect(durationClock(40 * 3600 + 31)).toBe("40:00:31");
  expect(durationText(7 * 3600 + 45 * 60 + 51)).toBe("7 sa 45 dk 51 sn");
});
test("yeniden kullanılan formatlayıcılar Türkçe tarihi ve İstanbul saatini korur", () => {
  const at = Date.parse("2026-10-15T09:34:56Z");
  expect(formatClock(at)).toBe("12:34:56");
  expect(formatClock(at, false)).toBe("12:34");
  expect(formatClock(null)).toBe("–");
  expect(formatDate("2026-10-15", { day: "numeric", month: "long" })).toBe(
    "15 Ekim",
  );
  expect(formatDate("2026-10-15", { month: "long", day: "numeric" })).toBe(
    "15 Ekim",
  );
  expect(formatDate("2026-10-15", { weekday: "long" })).toBe("Perşembe");
});

test("bozuk kayıt saati geçerli bir saat uydurmadan boş gösterilir", () => {
  expect(formatClock(Date.parse("bad-date"))).toBe("–");
  expect(formatClock(Infinity)).toBe("–");
  expect(formatClock(1e20)).toBe("–");
});

test("hafta etiketi başka yıl ve yıl geçişini açık gösterir", () => {
  expect(weekLabel("2025-10-13", false, "2026-10-16")).toBe("13–19 Ekim 2025");
  expect(weekLabel("2026-12-28", false, "2026-10-16")).toBe(
    "28 Aralık 2026 – 3 Ocak 2027",
  );
  expect(weekLabel("2026-10-12", false, "2026-10-16")).toBe("12 – 18 Ekim");
});

test("05:57:32 girişi ve gece yarısı İstanbul gün/haftasına göre çözülür", () => {
  const entry = sourceTimestamp("2026-10-19", "05:57:32");
  expect(entry).toBe(Date.parse("2026-10-19T02:57:32Z"));
  if (entry === null) throw new Error("Expected a valid source timestamp");
  expect(formatClock(entry)).toBe("05:57:32");
  expect(clockSeconds(entry)).toBe(5 * 3600 + 57 * 60 + 32);
  expect(dateKey(entry)).toBe("2026-10-19");
  expect(weekStart(dateKey(entry))).toBe("2026-10-19");
  expect(dateKey(Date.parse("2026-10-18T20:59:59Z"))).toBe("2026-10-18");
  expect(dateKey(Date.parse("2026-10-18T21:00:00Z"))).toBe("2026-10-19");
});
