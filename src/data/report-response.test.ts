import { expect, test } from "bun:test";
import { readReportResponse } from "./report-response";

const from = "2026-10-12";
const to = "2026-10-18";
const report = {
  from, to, fetchedAt: "2026-10-17T08:00:00Z",
  person: { id: "self", name: "Fixture", unit: "", title: "" },
  passages: [{ date: from, time: "08:00:00", direction: "in" as const }],
};

test("geçerli rapor ve boş kayıt listesi korunur", () => {
  expect(readReportResponse(report, from, to)).toBe(report);
  expect(readReportResponse({ ...report, passages: [] }, from, to).passages).toEqual([]);
  const paired = {
    ...report,
    passages: [
      ...report.passages,
      { date: from, time: "12:00:00", direction: "out" as const },
    ],
  };
  expect(readReportResponse(paired, from, to)).toBe(paired);
});

test.each([{ direction: ["in"] }, { direction: ["out"] }, { direction: null }, { direction: 1 }, { direction: "unknown" }])("geçersiz yön türü başarıya çevrilmez: %j", ({ direction }) => {
  expect(() => readReportResponse({ ...report, passages: [{ ...report.passages[0], direction }] }, from, to)).toThrow();
});

test.each([
  null,
  { ...report, person: { ...report.person, id: "another-person" } },
  { ...report, from: "2026-10-05" },
  { ...report, passages: undefined },
  { ...report, passages: null },
  { ...report, passages: [{ ...report.passages[0], date: "2026-10-11" }] },
  { ...report, passages: [{ ...report.passages[0], date: "2026-10-19" }] },
  { ...report, passages: [{ ...report.passages[0], time: "25:00:00" }] },
  { ...report, pofiNotes: [{ date: from, id: "fixture", parts: [42] }] },
])("uyuşmayan rapor kişi/tarih/kayıt yapısı reddedilir", value => {
  expect(() => readReportResponse(value, from, to)).toThrow();
});

test("aralığın içinde görünen gerçek olmayan takvim günü reddedilir", () => {
  const from = "2026-02-23";
  const to = "2026-03-01";
  expect(() => readReportResponse({
    ...report,
    from,
    to,
    passages: [{ date: "2026-02-30", time: "08:00:00", direction: "in" }],
  }, from, to)).toThrow();
});

test.each(["02:30:00", "04:00:00"])(
  "tarihsel saat geçişinde var olan %s rapor kaydı korunur",
  (time) => {
    const from = "2015-03-23";
    const to = "2015-03-29";
    const historical = {
      ...report,
      from,
      to,
      passages: [{ date: to, time, direction: "in" as const }],
    };
    expect(readReportResponse(historical, from, to)).toBe(historical);
  },
);

test("ileri saat geçişinde var olmayan yerel rapor saati reddedilir", () => {
  const from = "2015-03-23";
  const to = "2015-03-29";
  expect(() => readReportResponse({
    ...report,
    from,
    to,
    passages: [{ date: to, time: "03:30:00", direction: "in" }],
  }, from, to)).toThrow();
});
