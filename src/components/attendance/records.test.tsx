import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { presentReport, type Report } from "@/domain/report";
import { DEFAULT_WORK_PLAN } from "@/domain/rules/work-plan";
import { RawPassages } from "./records";

function render(passages: Report["passages"]) {
  const now = Date.parse("2026-10-19T18:00:00+03:00");
  const report: Report = {
    person: { id: "fixture", name: "Örnek", unit: "", title: "" },
    from: "2026-10-19", to: "2026-10-25",
    fetchedAt: new Date(now).toISOString(),
    passages,
  };
  const day = presentReport(report, DEFAULT_WORK_PLAN, now, false).days[0];
  return load(renderToStaticMarkup(<RawPassages day={day} />));
}

test("ayna giriş ve çıkış kayıtlarında Pofi notu görünür", () => {
  const $ = render([
    { date: "2026-10-19", time: "10:01:59", direction: "in" },
    { date: "2026-10-19", time: "12:21:03", direction: "out" },
  ]);
  expect($("time").map((_, element) => $(element).text()).get())
    .toEqual(["10:01:59", "12:21:03"]);
  expect($.text()).toContain("Pofi: Giriş saatinin saniyelerini patimle örttüm. Tersten de aynı okundu. Çıkışta da öyle.");
});

test("eksik veya ayna olmayan kayıtlarda Pofi notu görünmez", () => {
  const entry = { date: "2026-10-19", time: "10:01:00", direction: "in" } as const;
  expect(render([entry]).text()).not.toContain("Pofi:");
  expect(render([entry, { date: entry.date, time: "12:22:00", direction: "out" }]).text())
    .not.toContain("Pofi:");
});
