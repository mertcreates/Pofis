import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { presentReport, type Report } from "@/domain/report";
import { DEFAULT_WORK_PLAN } from "@/domain/rules/work-plan";
import { ReportTable } from "./report-table";

test.each([true, false])("izinli günler geçmiş, bugün ve gelecekte sade durum satırı gösterir (compact=%s)", compact => {
  const now = Date.parse("2026-10-14T18:00:00+03:00");
  const report: Report = {
    person: { id: "self", name: "Örnek kullanıcı", title: "", unit: "" },
    from: "2026-10-12", to: "2026-10-18", fetchedAt: new Date(now).toISOString(),
    passages: [
      { date: "2026-10-12", time: "08:00:00", direction: "in" },
      { date: "2026-10-12", time: "10:00:00", direction: "out" },
    ],
  };
  const { days } = presentReport(report, DEFAULT_WORK_PLAN, now, false);
  const html = load(renderToStaticMarkup(<ReportTable days={days} today="2026-10-14" compact={compact} leaveDays={[0, 2, 4]} />));
  const rows = compact ? html(".report-accordion > *") : html("tbody > tr:not(.report-detail-row)");
  expect(rows).toHaveLength(5);
  for (const index of [0, 2, 4]) {
    const row = rows.eq(index);
    expect(row.find(".report-status").text()).toBe("İzinli");
    expect(row.find("time, summary, button, .report-accordion-clocks, .report-accordion-total, .report-duration, .report-day-facts")).toHaveLength(0);
    expect(row.text()).not.toContain("İlk giriş");
    expect(row.text()).not.toContain("Son çıkış");
  }
  for (const index of [1, 3]) expect(rows.eq(index).text()).not.toContain("İzinli");
  const regular = load(renderToStaticMarkup(<ReportTable days={days} today="2026-10-14" compact={compact} leaveDays={[]} />));
  expect(regular(".report-accordion, tbody").text()).toContain("08:00");
  expect(regular(".report-accordion, tbody").text()).toContain("10:00");
  expect(regular(".report-accordion, tbody").text()).toContain("2 sa");
});
