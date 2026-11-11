import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { DEFAULT_WORK_PLAN, resolveWeekPlan, type PlanDay } from "@/domain/rules/work-plan";
import { IndependentWeekSchedule, WeekSchedulePreview } from "./week-schedule-preview";

test("bağımsız hafta çalışma düzeninin hedefini kullanır; gerçekleşen kayıt ve Bugün işareti taşımaz", () => {
  const html = load(renderToStaticMarkup(<IndependentWeekSchedule plan={[540,540,540,540,540,0,0]} week="2026-11-09" ready />));
  expect(html(".work-plan-summary").text()).toContain("45 sa");
  expect(html(".work-plan-days button")).toHaveLength(5);
  expect(html("input:not([disabled])")).toHaveLength(4);
  expect(html("input").map((_, el) => html(el).attr("value")).get()).toEqual(["", "", "", ""]);
  expect(html("section").text()).not.toContain("Bugün");
  expect(html(".work-plan-day-title").text()).not.toContain("Gerçekleşen");
});

test("izinli gün izni kaldırma eylemi sunar; kullanıcı kilidi izin düzenlemesini kapatır", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, index) => ({
    date: `2026-11-${String(9 + index).padStart(2, "0")}`,
    state: "future", recordedSeconds: null,
  }));
  const plan = [480,480,480,480,0,0,0] as const;
  const resolved = resolveWeekPlan(days, plan, "2026-11-09", false, 115200, [], false, [3]);
  const render = (selectedDay: number) => load(renderToStaticMarkup(<WeekSchedulePreview week="2026-11-09" today="2026-11-09"
    days={days} resolved={resolved} plan={plan} defaultPlan={DEFAULT_WORK_PLAN} times={{}} leaveDays={[4]}
    userLockedDays={[3]} ready selectedDay={selectedDay} onSelectDay={() => {}} />));
  const leave = render(4);
  expect(leave('button[aria-label="Cuma iznini kaldır"][aria-pressed="true"]')).toHaveLength(1);
  expect(leave('.work-plan-day-options .work-plan-day-action[aria-pressed="true"]')).toHaveLength(1);
  expect(leave(".week-schedule-editor").text().match(/İzinli/g)).toHaveLength(1);
  expect(leave(".work-plan-days button").last().attr("data-locked")).toBe("false");
  expect(leave("input")).toHaveLength(0);
  const locked = render(3);
  expect(locked('button[aria-label="Perşembe gününü izinli yap"]')).toHaveLength(0);
  expect(locked("input")).toHaveLength(0);
});

test.each([true, false])("geçmiş günün gerçek saatleri salt okunur gösterilir; eksik çıkış üretilmez (%s)", hasExit => {
  const days = Array.from({ length: 7 }, (_, index) => ({
    date: `2026-11-${String(9 + index).padStart(2, "0")}`,
    state: index < 2 ? "recorded" as const : "future" as const,
    recordedSeconds: index < 2 ? 28800 : null,
    firstEntry: index === 0 ? Date.parse("2026-11-09T06:30:17+03:00") : null,
    lastExit: index === 0 && hasExit ? Date.parse("2026-11-09T14:30:17+03:00") : null,
  }));
  const resolved = resolveWeekPlan(days, DEFAULT_WORK_PLAN, "2026-11-11");
  const html = load(renderToStaticMarkup(<WeekSchedulePreview week="2026-11-09" today="2026-11-11"
    days={days} resolved={resolved} plan={DEFAULT_WORK_PLAN} defaultPlan={DEFAULT_WORK_PLAN} times={{ 0: { anchor: "entry", minute: 9 * 60 } }} leaveDays={[]} ready selectedDay={0} onSelectDay={() => {}} />));
  expect(html("input")).toHaveLength(4);
  expect(html("input:not([disabled])")).toHaveLength(0);
  expect(html(".work-plan-time-clear")).toHaveLength(0);
  expect(html("input").map((_, el) => html(el).attr("value")).get()).toEqual(hasExit ? ["06", "30", "14", "30"] : ["06", "30", "", ""]);
  expect(html(".week-schedule-label").map((_, el) => html(el).text()).get()).toEqual(["Giriş saati", "Çıkış saati"]);
  const card = html(".work-plan-days button").first();
  expect(card.find(".week-schedule-day-clocks").text()).toContain("06:30");
  expect(card.find(".week-schedule-day-clocks").text().includes("14:30")).toBe(hasExit);
  expect(html(".work-plan-day-title").text()).toBe("Pazartesi");
});

test("gün kartları bilinen saatleri gösterir; eksik taslak ve izin saat satırı oluşturmaz", () => {
  const html = load(renderToStaticMarkup(<IndependentWeekSchedule plan={DEFAULT_WORK_PLAN} week="2026-11-09" ready saved={{
    plan: DEFAULT_WORK_PLAN,
    drafts: { 0: { anchor: "entry", entry: "09:00" }, 1: { anchor: "exit", entry: "09:00", exit: "16:00" },
      2: { anchor: "entry", entry: "14:0" }, 4: { anchor: "entry", entry: "09:00" } },
    leaveChanges: { 4: true }, completion: null,
  }} />));
  const cards = html(".work-plan-days button");
  expect(cards.eq(0).find(".week-schedule-day-clocks span").map((_, el) => html(el).text()).get()).toEqual(["09:00", "– 17:00"]);
  expect(cards.eq(1).find(".week-schedule-day-clocks span").map((_, el) => html(el).text()).get()).toEqual(["09:00", "– 16:00"]);
  expect(cards.slice(2).find(".week-schedule-day-clocks")).toHaveLength(0);
  expect(html('button[aria-label="Pazartesi giriş saati alanını temizle"]:not([disabled])')).toHaveLength(1);
  expect(html('button[aria-label="Pazartesi çıkış saati alanını temizle"][disabled]')).toHaveLength(1);
});

test("mevcut günlük dağılım aynen gösterilir ve ayrı dağıtım seçimi sunulmaz", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, index) => ({
    date: `2026-11-${String(9 + index).padStart(2, "0")}`,
    state: index < 2 ? "recorded" : "future",
    recordedSeconds: index < 2 ? 28800 : null,
  }));
  const resolved = resolveWeekPlan(days, [480,480,360,540,540,0,0], "2026-11-11");
  const html = load(renderToStaticMarkup(<WeekSchedulePreview week="2026-11-09" today="2026-11-11"
    days={days} resolved={resolved} plan={DEFAULT_WORK_PLAN} defaultPlan={DEFAULT_WORK_PLAN} times={{}} leaveDays={[]} ready selectedDay={2} onSelectDay={() => {}} />));
  expect(html("select")).toHaveLength(0);
  expect(html(".work-plan-days button")).toHaveLength(5);
  expect(html(".week-schedule-duration").map((_, el) => html(el).text()).get()).toEqual(["6 sa"]);
  expect(html(".work-plan-day-title").text()).toBe("Çarşamba");
});

test.each(["missing", "partial"] as const)("%s kaynakta kesin sonuç gösterilmez ve düzenleme kapanır", kind => {
  const days: PlanDay[] = Array.from({ length: kind === "partial" ? 6 : 7 }, (_, index) => ({
    date: `2026-11-${String(9 + index).padStart(2, "0")}`,
    state: index === 0 ? "missing" : "future",
    recordedSeconds: null,
  }));
  const resolved = resolveWeekPlan(days, DEFAULT_WORK_PLAN, "2026-11-11", days.length !== 7);
  const html = load(renderToStaticMarkup(<WeekSchedulePreview week="2026-11-09" today="2026-11-11"
    days={days} resolved={resolved} plan={DEFAULT_WORK_PLAN} defaultPlan={DEFAULT_WORK_PLAN} times={{}} leaveDays={[]} ready selectedDay={2} onSelectDay={() => {}} />));
  expect(html("fieldset[disabled]")).toHaveLength(1);
  expect(html('[role="status"]')).toHaveLength(0);
  expect(html(".inline-notice").text()).toContain("Kesin hesap için haftanın kayıtları tamamlanmalı");
});
