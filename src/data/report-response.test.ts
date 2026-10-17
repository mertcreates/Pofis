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
});

test.each([{ direction: ["in"] }, { direction: ["out"] }, { direction: null }, { direction: 1 }, { direction: "unknown" }])("geçersiz yön türü başarıya çevrilmez: %j", ({ direction }) => {
  expect(() => readReportResponse({ ...report, passages: [{ ...report.passages[0], direction }] }, from, to)).toThrow();
});

test.each([
  { ...report, person: { ...report.person, id: "another-person" } },
  { ...report, from: "2026-10-05" },
  { ...report, passages: [{ ...report.passages[0], date: "2026-10-19" }] },
  { ...report, passages: [{ ...report.passages[0], time: "25:00:00" }] },
  { ...report, pofiNotes: [{ date: from, id: "fixture", parts: [42] }] },
])("uyuşmayan rapor kişi/tarih/kayıt yapısı reddedilir", value => {
  expect(() => readReportResponse(value, from, to)).toThrow();
});
