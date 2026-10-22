import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { presentReport, type Report } from "@/domain/report";
import { readDayPlan } from "@/domain/rules/work-plan";
import { ReportTable } from "./report-table";

const report: Report = {
  person: { id: "fixture", name: "Örnek", unit: "", title: "" },
  from: "2026-10-12", to: "2026-10-18",
  fetchedAt: "2026-10-15T09:00:00+03:00", passages: [],
};

for (const compact of [false, true]) {
  test(`${compact ? "akordeon" : "tablo"}: gelecek günün izin etiketi haftanın açık izin işaretini kullanır`, () => {
    const today = "2026-10-15";
    const days = presentReport(report, readDayPlan([480, 480, 480, 480, 0, 0, 0])!,
      Date.parse(`${today}T09:00:00+03:00`), false).days;
    const render = (leaveDays: number[]) => load(renderToStaticMarkup(
      <ReportTable days={days} today={today} compact={compact} leaveDays={leaveDays} />,
    ));
    const onLeave = render([4]);
    expect(onLeave(".future-row .report-status").text()).toBe("İzinli");
    expect(onLeave(".future-row button, .future-row summary, .future-row time").length).toBe(0);
    expect(render([])(".future-row .report-status").text()).toBe("Henüz gelmedi");
    expect(render([3])(".future-row .report-status").text()).toBe("Henüz gelmedi");
  });
}
