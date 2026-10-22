import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { Progress, DurationTrack } from "./primitives";
import { weeklyRuler } from "./dashboard/weekly-ruler";
import { presentReport, type Report } from "@/domain/report";
import { DEFAULT_WORK_PLAN } from "@/domain/rules/work-plan";

const report: Report = {
  person: { id: "self", name: "Test", unit: "", title: "" },
  from: "2026-10-19", to: "2026-10-25", fetchedAt: "2026-10-19T12:00:00Z", passages: [],
};
const day = presentReport(report, DEFAULT_WORK_PLAN, Date.parse(report.fetchedAt), false).days[0];

test.each([
  ["sıfır hedef ve süre", 0, 0, 0, 0, 0],
  ["sıfır hedef ve kayıt", 0, 3600, 0, 1, 0],
  ["sıfır hedef ve tahmin", 0, 0, 3600, 0, 1],
  ["hedef altı", 28800, 14400, 7200, 0.5, 0.25],
  ["hedefe eşit", 28800, 21600, 7200, 0.75, 0.25],
  ["hedef üstü", 28800, 21600, 21600, 0.5, 0.5],
] as const)("%s: süre çubuğu ve haftalık cetvel aynı parçaları gösterir", (_, target, recorded, estimated, recordedFraction, estimatedFraction) => {
  const html = load(renderToStaticMarkup(<Progress recorded={recorded} estimated={estimated} target={target} label="Mesai" />));
  expect(html(".duration-track-recorded").attr("style")).toBe(`width:${recordedFraction * 100}%`);
  expect(html(".duration-track-estimated").attr("style")).toBe(`width:${estimatedFraction * 100}%`);
  const [segment] = weeklyRuler([{ ...day, source: { ...day.source, workingDay: true, dailyGoalSeconds: target, recorded, estimated, total: recorded + estimated } }]);
  expect(segment.recorded).toBe(recordedFraction);
  expect(segment.filled).toBe(recordedFraction + estimatedFraction);
  if (target === 0) expect(html(".duration-track-target")).toHaveLength(0);
  else expect(html(".duration-track-target").attr("style")).toBe(`left:${Math.min(1, target / (recorded + estimated)) * 100}%`);
});

test("verilen ölçeğe sığmayan tahmin kırpılır, kayıtlı parça korunur", () => {
  const html = load(renderToStaticMarkup(<DurationTrack recorded={6} estimated={8} total={10} target={12} />));
  expect(html(".duration-track-recorded").attr("style")).toBe("width:60%");
  expect(html(".duration-track-estimated").attr("style")).toBe("width:40%");
  expect(html(".duration-track-target").attr("style")).toBe("left:100%");
  expect(weeklyRuler([{ ...day, source: { ...day.source, workingDay: false } }])).toEqual([]);
});
