import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { presentReport, type Report } from "@/domain/report";
import { DayFlow } from "./day-flow";
import { WeekChart } from "./week-chart";
import { RecordIntervals } from "./records";
import { ReportTable } from "./report-table";
import { demoData } from "@/demo/report";
import { DEFAULT_WORK_PLAN, readDayPlan } from "@/domain/rules/work-plan";
import { demoClock, previewDemoReport } from "@/demo/navigation";
import { DashboardMetrics } from "../dashboard/metrics";

test("sıfır planlı açık gün rapor, grafik ve yüzde göstergesinde çalışma günü kalır", () => {
  const today = "2026-10-16";
  const report: Report = { person: { id: "self", name: "Fixture", unit: "", title: "" },
    from: "2026-10-12", to: "2026-10-18", fetchedAt: `${today}T05:15:00Z`,
    passages: ["20:00:00", "20:00:00", "16:00:00", "15:00:00"].flatMap((time, day) => [
      { date: `2026-10-${12 + day}`, time: "08:00:00", direction: "in" as const },
      { date: `2026-10-${12 + day}`, time, direction: "out" as const },
    ]),
  };
  const at = Date.parse(`${today}T08:15:00+03:00`);
  const plan = readDayPlan([480,480,480,450,0,0,0])!;
  const waiting = presentReport(report, plan, at, false, 39.5 * 3600, [4]);
  const chart = load(renderToStaticMarkup(<WeekChart days={waiting.days} today={today} start={report.from} current />));
  expect(chart(".chart-column")).toHaveLength(5);
  report.passages.push({ date: today, time: "08:00:00", direction: "in" });
  const view = presentReport(report, plan, at, false, 39.5 * 3600, [4]);
  const metrics = load(renderToStaticMarkup(<DashboardMetrics days={view.days} plan={view.plan} today={today} isCurrent targetSeconds={39.5 * 3600} />));
  expect(metrics(".metric-tag").first().text()).toBe("%50");
  const table = load(renderToStaticMarkup(<ReportTable days={view.days} today={today} />));
  expect(table(".today-row td").last().text()).toBe("Mesai devam ediyor");
});

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
  const { days } = presentReport(
    report,
    DEFAULT_WORK_PLAN,
    now,
    false,
  );
  const day = days.find((day) => day.date === date)!;
  const flow = renderToStaticMarkup(<DayFlow day={day} target={28800} />);
  expect(flow).toContain(
    "Kayda dayalı süre 4 sa; Anlık tahmin 3 sa; Hedef 8 sa",
  );
  expect(flow).toContain('style="width:50%"');
  expect(flow).toContain('style="width:37.5%"');
  const chart = renderToStaticMarkup(
    <WeekChart
      days={days}
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
    <ReportTable days={days} today={date} />,
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
  const { days } = presentReport(
    reports[2],
    DEFAULT_WORK_PLAN,
    now,
    false,
  );
  const table = load(
    renderToStaticMarkup(
      <ReportTable days={days} today="2026-10-16" />,
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

test("devirli gün kartları, çıkış saati ve tablonun hedef farkı aynı etkin hedefi gösterir", () => {
  const report: Report = {
    person: { id: "self", name: "Fixture", unit: "", title: "" },
    from: "2026-10-12", to: "2026-10-18", fetchedAt: "2026-10-16T12:15:00Z",
    passages: [12, 13, 14, 15, 16].flatMap((day, index) => [
      { date: `2026-10-${day}`, time: "08:00:00", direction: "in" as const },
      { date: `2026-10-${day}`, time: ["16:30:00", "16:15:00", "16:00:00", "16:00:00", "15:15:00"][index], direction: "out" as const },
    ]),
  };
  const view = presentReport(report, DEFAULT_WORK_PLAN, Date.parse("2026-10-16T15:15:00+03:00"), false);
  const metrics = load(renderToStaticMarkup(<DashboardMetrics days={view.days} plan={view.plan} today="2026-10-16" isCurrent />));
  expect(metrics(".metric-tag").map((_, element) => metrics(element).text()).get()).toEqual(["%100", "%100"]);
  expect(metrics('.metric-value time[title="15:15:00"]')).toHaveLength(1);
  expect(metrics(".metric").first().find(".metric-facts dd").text()).toBe("7 sa 15 dk");
  const table = load(renderToStaticMarkup(<ReportTable days={view.days} today="2026-10-16" />));
  expect(table(".today-row .report-difference").text()).toBe("Hedefle aynı");
  expect(table(".report-difference").first().text()).toBe("30 dk fazla");
});

test("tamamlanan günün tablo farkı özgün plandan gelir; kapalı gündeki mesai fazla görünür", () => {
  const today = "2026-10-18";
  const report: Report = {
    person: { id: "self", name: "Fixture", unit: "", title: "" },
    from: "2026-10-12", to: today, fetchedAt: `${today}T12:00:00Z`,
    passages: [
      { date: "2026-10-12", time: "08:00:00", direction: "in" },
      { date: "2026-10-12", time: "16:30:17", direction: "out" },
      { date: "2026-10-17", time: "08:00:00", direction: "in" },
      { date: "2026-10-17", time: "09:20:00", direction: "out" },
    ],
  };
  const view = presentReport(report, readDayPlan([240, 480, 480, 480, 480, 0, 0])!, Date.parse(`${today}T15:00:00+03:00`), false);
  const table = load(renderToStaticMarkup(<ReportTable days={view.days} today={today} />));
  expect(table(".report-difference").eq(0).text()).toBe("4 sa 30 dk 17 sn fazla");
  expect(table(".report-difference").eq(5).text()).toBe("1 sa 20 dk fazla");
  expect(view.days[0].source.dailyGoalSeconds).toBe(14400);
  expect(view.days[5].source.dailyGoalSeconds).toBe(0);
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
  const { days } = presentReport(
    report,
    DEFAULT_WORK_PLAN,
    Date.parse(`${date}T15:00:00+03:00`),
    true,
  );
  const table = load(
    renderToStaticMarkup(<ReportTable days={days} today={date} />),
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
  const { days } = presentReport(
    reports[3],
    DEFAULT_WORK_PLAN,
    now,
    false,
  );
  const chart = load(
    renderToStaticMarkup(
      <WeekChart
        days={days}
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
