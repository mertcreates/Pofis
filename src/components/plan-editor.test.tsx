import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { PlanEditor } from "./plan-editor";
import { DEFAULT_WORK_PLAN, readDayPlan, type WorkPlan, type PlanDay } from "@/domain/rules/work-plan";

function render(plan: WorkPlan = DEFAULT_WORK_PLAN, days: PlanDay[] = [], today = "2026-10-15") {
  return load(renderToStaticMarkup(<PlanEditor plan={plan} defaultPlan={DEFAULT_WORK_PLAN}
    days={days} special={false} ready week="2026-10-12" today={today} error=""
    onSave={() => true} onSaveDefault={() => true} onReset={() => true} onClose={() => {}} />));
}

test("open day separates duration, day action and bulk application", () => {
  const $ = render([480, 480, 480, 320, 480, 0, 0]);
  expect($(".work-plan-control-label")).toHaveLength(0);
  expect($(".work-plan-stepper").attr("aria-label")).toBe("Perşembe çalışma süresi");
  expect($(".work-plan-stepper output").text()).toBe("5 sa 20 dk");
  expect($(".work-plan-day-title > strong + .work-plan-day-action").text()).toBe("Kapat");
  expect($(".work-plan-day-action").attr("aria-label")).toBe("Perşembe gününü kapat");
  expect($(".work-plan-duration-control > .work-plan-apply + .work-plan-stepper")).toHaveLength(1);
  expect($(".work-plan-apply").text()).toBe("Açık günlere uygula");
  expect($(".work-plan-apply").attr("aria-label")).toBe("Açık günlere uygula: 5 sa 20 dk");
  expect($(".work-plan-editor-bottom")).toHaveLength(0);
});

test("closed day offers reopening in place of duration and bulk controls", () => {
  const $ = render([0, 0, 0, 0, 0, 0, 0]);
  expect($(".work-plan-day-title > strong + .work-plan-day-action").text()).toBe("Aç");
  expect($(".work-plan-day-action").attr("aria-label")).toBe("Pazartesi gününü aç");
  expect($(".work-plan-closed-status").text()).toBe("Kapalı");
  expect($(".work-plan-stepper, .work-plan-close-day, .work-plan-apply")).toHaveLength(0);
});

test("zero required duration from carryover keeps the open day editable", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`, state: "missing", recordedSeconds: null,
  }));
  days[0] = { date: "2026-10-12", state: "recorded", recordedSeconds: 16 * 3600 };
  const $ = render(DEFAULT_WORK_PLAN, days, "2026-10-16");
  expect($(".work-plan-stepper output").text()).toBe("0 sa");
  expect($(".work-plan-day-action").text()).toBe("Kapat");
  expect($(".work-plan-reopen")).toHaveLength(0);
});

test("completed day keeps recorded duration and hides editing actions", () => {
  const $ = render(DEFAULT_WORK_PLAN, [
    { date: "2026-10-16", state: "recorded", recordedSeconds: 8 * 3600 },
  ], "2026-10-17");
  expect($(".work-plan-recorded-time").text()).toContain("8 sa");
  expect($(".work-plan-stepper, .work-plan-day-action, .work-plan-apply")).toHaveLength(0);
});

test("sole editable Friday keeps completion enabled and shows compact total/actions", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`, state: day < 4 ? "recorded" : "awaiting-entry",
    recordedSeconds: day < 4 ? 7.5 * 3600 + (day === 3 ? 60 : 0) : null,
  }));
  const $ = load(renderToStaticMarkup(<PlanEditor plan={DEFAULT_WORK_PLAN} defaultPlan={DEFAULT_WORK_PLAN}
    days={days} special ready week="2026-10-12" today="2026-10-16" error="" targetSeconds={38 * 3600 + 60}
    onSave={() => true} onSaveDefault={() => true} onReset={() => true} onClose={() => {}} />));
  expect($(".work-plan-days > button")).toHaveLength(5);
  expect($(".work-plan-total > span").first().text()).toBe("Toplam 38 sa 1 dk");
  expect($(".work-plan-total s").text()).toBe("40 sa");
  expect($(".work-plan-actions > span").text()).toBe("40 sa hedefe kalan: 1 sa 59 dk");
  expect($(".work-plan-complete").text()).toBe("40 saate tamamla");
  expect($(".work-plan-complete").attr("disabled")).toBeUndefined();
  expect($(".work-plan-reset").text()).toBe("Sıfırla");
  expect($(".work-plan-capacity")).toHaveLength(0);
});

test("reset week at 45 hours shows recalculated Friday without redundant reset or completion actions", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`, state: day < 3 ? "recorded" : "awaiting-entry",
    recordedSeconds: day < 3 ? [32400,32400,31200][day] : null,
  }));
  const $ = load(renderToStaticMarkup(<PlanEditor plan={readDayPlan([480,480,480,540,540,0,0])!}
    defaultPlan={readDayPlan([540,540,540,540,540,0,0])!} days={days} special ready
    week="2026-10-12" today="2026-10-15" error="" targetSeconds={45 * 3600}
    onSave={() => true} onSaveDefault={() => true} onReset={() => true} onClose={() => {}} />));
  expect($(".work-plan-total > span").first().text()).toBe("Toplam 45 sa");
  expect($(".work-plan-day-time").map((_, day) => $(day).text()).get()).toEqual([
    "9 sa", "9 sa", "8 sa 40 dk", "9 sa", "9 sa 20 dk",
  ]);
  expect($(".work-plan-actions, .work-plan-reset, .work-plan-complete")).toHaveLength(0);
});
