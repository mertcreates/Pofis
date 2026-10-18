import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { prepareReport, type SourcePassage } from "@/domain/report";
import { DEFAULT_WORK_PLAN } from "@/domain/rules/work-plan";
import { ReportTable } from "./report-table";

function render(passages: SourcePassage[] = [], compact = true) {
  const report = {
    person: { id: "fixture", name: "Örnek", unit: "", title: "" },
    from: "2026-10-12", to: "2026-10-18", fetchedAt: "2026-10-18T12:00:00+03:00", passages,
  };
  const days = prepareReport(report, DEFAULT_WORK_PLAN, "2026-10-18", false)(Date.parse(report.fetchedAt)).days;
  return load(renderToStaticMarkup(<ReportTable days={days} today="2026-10-18" compact={compact} />));
}

test("current report uses collapsed day disclosures and omits weekends without data", () => {
  const $ = render();
  expect($("table")).toHaveLength(0);
  expect($("details")).toHaveLength(5);
  expect($("details[open]")).toHaveLength(0);
  expect($("summary")).toHaveLength(5);
  expect($("summary").first().text()).toContain("İlk giriş");
  expect($("summary").first().text()).toContain("Son çıkış");
  expect($(".report-accordion-detail").first().text()).toContain("Kayıt bulunamadı");
  expect($("summary .report-duration").first().text()).toBe("-");
});

test("weekend records remain visible, including an unmatched entry", () => {
  const $ = render([
    { date: "2026-10-17", time: "09:00:00", direction: "in" },
    { date: "2026-10-17", time: "11:00:00", direction: "out" },
    { date: "2026-10-18", time: "09:00:00", direction: "in" },
  ]);
  expect($("summary")).toHaveLength(7);
  expect($("summary").text()).toContain("17 Ekim");
  expect($("summary").text()).toContain("18 Ekim");
  expect($("summary .report-duration").eq(5).text()).toBe("2 sa");
  expect($("summary").eq(5).text()).toContain("09:00:00");
  expect($("summary").eq(5).text()).toContain("11:00:00");
  expect($("details").eq(5).find(".day-passages li")).toHaveLength(2);
  expect($("summary").eq(6).text()).toContain("Anlık");
  expect($("summary .report-duration").eq(6).text()).toBe("3 sa");
});

test("uncertain records stay visible in the collapsed summary", () => {
  const $ = render([{ date: "2026-10-12", time: "11:00:00", direction: "out" }]);
  expect($("summary").first().find(".report-accordion-warning").text()).toBe("Kayıtlarda belirsizlik var");
  expect($("details").first().find(".day-passages li")).toHaveLength(1);
});

test("full historical report retains its six columns", () => {
  const $ = render([], false);
  expect($("thead th")).toHaveLength(6);
  expect($("thead").text()).toContain("Hedef farkı");
  expect($("thead").text()).toContain("Kayıt durumu");
});
