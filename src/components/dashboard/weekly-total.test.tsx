import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { presentReport, type Report } from "@/domain/report";
import { readDayPlan } from "@/domain/rules/work-plan";
import { summarizeWeek } from "@/domain/rules/week";
import { weeklyRuler } from "./weekly-ruler";
import { DashboardMetrics } from "./metrics";

const report: Report = {
  person: { id: "fixture", name: "Örnek", unit: "", title: "" },
  from: "2026-10-19", to: "2026-10-25", fetchedAt: "2026-10-23T12:00:00+03:00", passages: [],
};

function render(leaveDays: number[], passages: Report["passages"] = [], isCurrent = true) {
  const days = presentReport({ ...report, passages }, readDayPlan([480, 480, 480, 480, 0, 0, 0])!,
    Date.parse(report.fetchedAt), false).days;
  const summary = summarizeWeek(days, "2026-10-23");
  const $ = load(renderToStaticMarkup(<DashboardMetrics days={days} today="2026-10-23" week={report.from}
    isCurrent={isCurrent} targetSeconds={32 * 3600} leaveDays={leaveDays} />));
  return { $, days, summary };
}

test("izinli gün kendi sırasını korur; normal kapalı günler cetvele eklenmez", () => {
  const { $, days } = render([4]);
  expect(weeklyRuler(days, [4]).map(segment => segment.day.date)).toEqual([
    "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23",
  ]);
  expect($(".weekly-ruler-day")).toHaveLength(5);
  expect($(".weekly-ruler-day").last().attr("aria-label")).toBe("Cuma, İzinli");
  expect($(".weekly-ruler-leave").text()).toBe("İzinli");
  expect($(".weekly-ruler-leave").attr("style")).toBeUndefined();
  expect($(".weekly-ruler-leave-duration")).toHaveLength(0);
  expect($(".weekly-ruler-tick:not(.weekly-ruler-leave)")).toHaveLength(4);
  expect(render([]).$(".weekly-ruler-day")).toHaveLength(4);
});

test("izinli günün çalışma kaydı görünür ve haftalık toplamda korunur", () => {
  const passages: Report["passages"] = [
    { date: "2026-10-23", time: "08:00:00", direction: "in" },
    { date: "2026-10-23", time: "10:00:00", direction: "out" },
  ];
  const { $, summary } = render([4], passages);
  expect($(".weekly-ruler-leave-duration").text()).toBe("2 sa");
  expect($(".weekly-ruler-day").last().attr("aria-label")).toBe("Cuma, İzinli, 2 sa");
  expect(summary.totalSeconds).toBe(7200);
  expect(summary.totalSeconds).toBe(render([], passages).summary.totalSeconds);
  expect($(".weekly-total-target").attr("aria-label")).toContain("32 sa");
});

test("izin işareti geçmiş haftanın cetvelini açmaz", () => {
  expect(render([4], [], false).$(".weekly-ruler")).toHaveLength(0);
});
