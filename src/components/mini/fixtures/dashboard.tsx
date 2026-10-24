import { mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { emptyWorkPlans } from "@/domain/rules/work-plan";
import type { Report } from "@/domain/report";

let now = Date.parse("2026-10-19T16:00:00+03:00");
let connected: boolean | null = true;
let failure: object | null = null;
let error = "";
let report: Report | null = {
  person: { id: "self", name: "Fixture", unit: "", title: "" },
  from: "2026-10-19", to: "2026-10-25", fetchedAt: new Date(now).toISOString(),
  passages: [{ date: "2026-10-19", time: "08:00:17", direction: "in" }],
};
let plan = emptyWorkPlans().defaultPlan;
let stale = false;
let targetSeconds = 40 * 3600;
mock.module("@/data/use-clock", () => ({ useClock: () => now }));
mock.module("@/data/use-pdks", () => ({ usePdks: () => ({ connected, report, failure, stale }) }));
mock.module("@/data/use-work-plans", () => ({ useWorkPlans: () => ({
  ready: !error, error, plan, targetSeconds, zeroOpenDays: [], userLockedDays: [],
}) }));
const { MiniDashboard } = await import("../mini-dashboard");
function render() {
  const $ = load(renderToStaticMarkup(createElement(MiniDashboard, { initialNow: now })));
  return {
    brand: $(".pofi-mini-brand strong").text(),
    target: $(".pofi-mini-grid > div").eq(0).find("strong").text(),
    delta: $(".pofi-mini-grid > div").eq(1).text(),
    alert: $("[role=alert]").text(), status: $("[role=status]").text(),
    duration: $(".pofi-mini-duration").text(), open: $(".pofi-mini-open").length,
    disconnected: $(".pofi-mini-empty strong").text(),
    summary: $(".pofi-mini-summary").text(),
    grid: $(".pofi-mini-grid").length,
    week: $(".pofi-mini-week").length,
    weekNote: $(".pofi-mini-week small").text(),
  };
}
const remaining = render();
now += 17_000;
const equal = render();
now += 1000;
const over = render();
targetSeconds = 8 * 3600;
const weekComplete = render();
targetSeconds = 40 * 3600;
stale = true;
const staleTarget = render();
stale = false;
report!.passages.push({ date: "2026-10-19", time: "07:00:00", direction: "out" });
report!.passages.push({ date: "2026-10-19", time: "16:00:18", direction: "out" });
const uncertain = render();
report!.passages = [];
plan = [0, 480, 480, 480, 480, 0, 0];
const leave = render();
report!.passages = [{ date: "2026-10-19", time: "08:00:17", direction: "in" }];
const unplannedWork = render();
error = "Mesai planın okunamadı.";
const storage = render();
error = ""; failure = {};
const failedReport = render();
connected = false;
const failedSession = render();
failure = null; report = null;
const disconnected = render();
connected = null;
const loading = render();
console.log(JSON.stringify({ remaining, equal, over, weekComplete, staleTarget, uncertain, leave, unplannedWork, storage, failedReport, failedSession, disconnected, loading }));
