import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { presentReport, type Report } from "@/domain/report";
import { DayFlow } from "./day-flow";
import { WeekChart } from "./week-chart";
import { RecordIntervals } from "./records";
import { ReportTable } from "./report-table";
import { demoData } from "@/demo/report";
import { DEFAULT_WORK_PLAN } from "@/domain/rules/work-plan";
import { demoClock, previewDemoReport } from "@/demo/navigation";

test("live report keeps three-part day flow and source chart with recorded and live totals", () => {
  const date = "2026-10-16";
  const now = Date.parse(`${date}T15:00:00+03:00`);
  const report: Report = {
    person: { id: "self", name: "Fixture", unit: "", title: "" },
    from: "2026-10-12",
    to: "2026-10-18",
    fetchedAt: new Date(now).toISOString(),
    passages: [
      { date, time: "08:00:00", direction: "in" },
      { date, time: "12:00:00", direction: "out" },
      { date, time: "13:00:00", direction: "in" },
    ],
  };
  const { days, plan } = presentReport(
    report,
    { goals: { hours: 40, days: 5, weekdays: [0, 1, 2, 3, 4] } },
    now,
    false,
  );
  const day = days.find((day) => day.date === date)!;
  const flow = renderToStaticMarkup(<DayFlow day={day} target={28800} />);
  expect(flow).toContain(
    "Kayda dayalı süre 4 sa 00 dk 00 sn; Anlık tahmin 3 sa 00 dk 00 sn; Hedef 8 sa 00 dk 00 sn",
  );
  expect(flow).toContain('style="width:50%"');
  expect(flow).toContain('style="width:37.5%"');
  const chart = renderToStaticMarkup(
    <WeekChart
      days={days}
      plan={plan}
      today={date}
      start={report.from}
      current
    />,
  );
  expect(chart).toContain("07:00:00");
  expect(chart).toContain("04:00:00");
  const chartDom = load(chart);
  expect(chartDom(".duration-track-target")).toHaveLength(0);
  expect(chartDom(".chart-bar").last().attr("style")).toBe("height:40%");
  expect(chartDom(".chart-estimate").attr("style")).toBe(
    "bottom:40%;height:30%",
  );
  expect(chartDom(".chart-tooltip > span")).toHaveLength(2);
  expect(
    chartDom(".chart-tooltip b")
      .map((_, element) => chartDom(element).text())
      .get(),
  ).toEqual(["04:00:00", "07:00:00"]);
  expect(chartDom(".chart-foot").text()).toBe(
    "Günlük kayıtlı süreAnlık tahmin",
  );
  expect(chart).toContain('tabindex="0"');
  const records = renderToStaticMarkup(<RecordIntervals day={day} />);
  expect(records).toContain("13:00:00");
  expect(records).toContain("08:00:00");
  expect(records).toContain("12:00:00");
  const table = renderToStaticMarkup(
    <ReportTable days={days} plan={plan} today={date} />,
  );
  expect(table).toContain('aria-expanded="false"');
  expect(table).toContain(`id="day-passages-${date}"`);
  expect(table).not.toContain("<ol>");
  expect(table).not.toContain("13:00:00");
  expect(load(table)(".today-row .report-status").text()).toBe(
    "Mesai devam ediyor",
  );
});

test("report status separates target deficit from uncertain passages and shares the day flow label", () => {
  const { now, reports } = demoData();
  const { days, plan } = presentReport(
    reports[2],
    DEFAULT_WORK_PLAN,
    now,
    false,
  );
  const table = load(
    renderToStaticMarkup(
      <ReportTable days={days} plan={plan} today="2026-10-16" />,
    ),
  );
  const rows = table("tbody > tr:not(.report-detail-row)");
  expect(rows.eq(2).find(".report-status").text()).toBe(
    "Kayıtlarda belirsizlik var",
  );
  expect(rows.eq(2).find(".report-duration").text()).toBe("09:15:58");
  expect(rows.eq(2).find(".report-difference").text()).toBe("-");
  expect(rows.eq(0).find(".report-status").text()).toBe(
    "Giriş–çıkış kaydı var",
  );
  expect(rows.eq(0).find(".report-difference").text()).toContain("eksik");
  expect(rows.eq(4).find(".report-status").text()).toBe("Kayıt bulunamadı");
  expect(rows.eq(5).find(".report-status").text()).toBe("Çalışma günü değil");
  const flow = load(
    renderToStaticMarkup(<DayFlow day={days[2]} target={null} />),
  );
  expect(flow(".flow-status").text()).toBe(
    rows.eq(2).find(".report-status").text(),
  );
});

test("stale open entry retains its last direction without claiming live work or a broken record", () => {
  const date = "2026-10-16";
  const report: Report = {
    person: { id: "self", name: "Fixture", title: "", unit: "" },
    from: "2026-10-12",
    to: "2026-10-18",
    fetchedAt: `${date}T12:00:00Z`,
    passages: [{ date, time: "08:00:00", direction: "in" }],
  };
  const { days, plan } = presentReport(
    report,
    DEFAULT_WORK_PLAN,
    Date.parse(`${date}T15:00:00+03:00`),
    true,
  );
  const table = load(
    renderToStaticMarkup(<ReportTable days={days} plan={plan} today={date} />),
  );
  const flow = load(
    renderToStaticMarkup(<DayFlow day={days[4]} target={null} />),
  );
  expect(table(".today-row .report-status").text()).toBe(
    "Son hareket giriş kaydı",
  );
  expect(flow(".flow-status").text()).toBe("Son hareket giriş kaydı");
  expect(days[4].liveSeconds).toBeNull();
});

test("source chart retains captured durations, empty days and record notice without scaling by goals", () => {
  const { now, reports } = demoData();
  const { days, plan } = presentReport(
    reports[3],
    DEFAULT_WORK_PLAN,
    now,
    false,
  );
  const chart = load(
    renderToStaticMarkup(
      <WeekChart
        days={days}
        plan={plan.map((minutes) => (minutes > 0 ? 1440 : 0))}
        today="2026-10-16"
        start="2026-10-12"
        current
        blocked
      />,
    ),
  );
  expect(
    chart(".chart-column strong")
      .map((_, node) => chart(node).text())
      .get(),
  ).toEqual(["08:03:31", "08:42:21", "08:23:17", "04:51:52", "-"]);
  expect(chart(".grid-line span").first().text()).toBe("10 sa");
  expect(chart(".chart-column.today .chart-bar").attr("style")).toBe(
    "height:0%",
  );
  expect(
    chart(".chart-estimate, .chart-tooltip, .duration-track-target"),
  ).toHaveLength(0);
  expect(chart(".chart-foot").text()).toBe("Günlük kayıtlı süre");
  expect(chart(".table-footnote").text()).toBe("Mevcut kayıtların toplamı");
});

test("day flow ends at the later of observed time and target and positions the source target label", () => {
  const { now, reports } = demoData();
  for (const [date, axisEnd, targetTime] of [
    ["2026-10-13", "14:35:12", "13:52:51"],
    ["2026-10-15", "14:46:54", ""],
  ]) {
    const clock = demoClock(date, now);
    const { days } = presentReport(
      previewDemoReport(reports[3], date),
      DEFAULT_WORK_PLAN,
      clock,
      false,
    );
    const day = days.find((item) => item.date === date)!;
    const flow = load(
      renderToStaticMarkup(<DayFlow day={day} target={28800} />),
    );
    expect(flow(".timeline-axis > span").last().text()).toBe(axisEnd);
    expect(flow(".timeline-target-marker")).toHaveLength(1);
    expect(flow(".duration-track-target")).toHaveLength(0);
    expect(flow(".timeline-target-label time").text()).toBe(targetTime);
    expect(flow(".timeline-target-label").attr("style")).toStartWith(
      "--target-position:",
    );
    expect(flow(".timeline-target-label").hasClass("at-end")).toBe(
      targetTime === "",
    );
    const withoutTarget = load(
      renderToStaticMarkup(<DayFlow day={day} target={null} />),
    );
    expect(
      withoutTarget(".timeline-target-marker, .timeline-target-label"),
    ).toHaveLength(0);
    expect(withoutTarget(".timeline-axis > span").last().text()).toBe(
      date === "2026-10-13" ? "14:35:12" : "11:38:46",
    );
  }
});
