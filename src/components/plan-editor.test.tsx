import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { PlanEditor } from "./plan-editor";
import { completeWeekPlan, DEFAULT_WORK_PLAN, readDayPlan, readWeekPlan, resolveWeekPlan, type PlanDay, type WorkPlan } from "@/domain/rules/work-plan";

function render(completedHours: number[], today = "2026-10-15", targetSeconds = 144000, plan: WorkPlan = DEFAULT_WORK_PLAN) {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`,
    state: day < completedHours.length ? "recorded" : "awaiting-entry",
    recordedSeconds: day < completedHours.length ? Math.round(completedHours[day] * 3600) : null,
  }));
  return load(renderToStaticMarkup(<PlanEditor plan={plan} defaultPlan={DEFAULT_WORK_PLAN}
    days={days} special={targetSeconds !== 144000} targetSeconds={targetSeconds} ready week="2026-10-12" today={today} error=""
    onSave={() => true} onSaveDefault={() => true} onReset={() => true} onClose={() => {}} />));
}

test("standart 40 saatlik planda fazla süre Tamamla eylemini ve bilgilendirmeyi açar", () => {
  const $ = render([9,8,8]);
  expect($('[role="status"]').text()).toContain("haftalık hedefin 1 sa üzerinde");
  expect($(".work-plan-complete").text()).toBe("40 saate tamamla");
  expect($(".work-plan-complete").is(":disabled")).toBe(false);
  expect($(".work-plan-reset").length).toBe(0);
  expect($(".work-plan-day").eq(4).text()).toContain("8 sa");
});

test("fazla sürenin 36 dk 59 sn üzerinde kısmı vurgulanır", () => {
  const $ = render([8, 8, 8 + 2219 / 3600]);
  expect($(".work-planner > .inline-notice").text()).toBe(
    "Beklenen toplam, haftalık hedefin 36 dk 59 sn üzerinde. Kalan günlerin planı korunuyor.",
  );
  expect($(".work-plan-surplus-emphasis").text()).toBe("36 dk 59 sn üzerinde");
});

test("hedefle aynı beklenen toplam gereksiz Tamamla eylemi göstermez", () => {
  const $ = render([8,8,8]);
  expect($(".work-plan-complete").length).toBe(0);
  expect($('[role="status"]').length).toBe(0);
});

test.each([39.5, 40.5])("özel %s saat hedefinde üst bildirim gizlenir; güncel toplam ve Tamamla korunur", hours => {
  const $ = render([9,8,8], "2026-10-15", hours * 3600);
  expect($('[role="status"]').length).toBe(0);
  expect($(".work-plan-total").text()).toBe("Beklenen toplam 41 sa");
  expect($(".work-plan-total").text()).not.toContain("Plan gerçekleşirse");
  expect($(".work-plan-actions").text()).toContain("40 sa hedefinin üzerinde: 1 sa");
  expect($(".work-plan-complete").text()).toBe("40 saate tamamla");
  expect($(".work-plan-complete").is(":disabled")).toBe(false);
});

test("39 saatlik hedefte gerçekleşen fazla süre beklenen toplama ve referans farkına katılır", () => {
  const $ = render([8,8,8 + 2219 / 3600], "2026-10-15", 39 * 3600, [480,480,480,480,420,0,0]);
  expect($(".work-plan-total").text()).toBe("Beklenen toplam 39 sa 36 dk");
  expect($(".work-plan-actions").text()).toContain("40 sa hedefine kalan: 24 dk");
  expect($(".work-plan-complete").is(":disabled")).toBe(false);
});

test("Tamamla sonrası saniyeli gereken gün yukarı, geçmiş gerçekleşen gün aşağı gösterilir", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`, state: day < 3 ? "recorded" : "awaiting-entry",
    recordedSeconds: day < 3 ? [8 * 3600 + 31, 8 * 3600 + 29, 9 * 3600 + 8 * 60 + 17][day] : null,
  }));
  for (const mode of ["equal", "last"] as const) {
    const resolved = resolveWeekPlan(days, DEFAULT_WORK_PLAN, "2026-10-15");
    const plan = completeWeekPlan(DEFAULT_WORK_PLAN, DEFAULT_WORK_PLAN, resolved, 3, [], mode)!;
    const $ = render(days.slice(0, 3).map(day => day.recordedSeconds! / 3600), "2026-10-15", 144000, plan);
    const required = mode === "last" ? "8 sa" : "7 sa 21 dk";
    expect($('.work-plan-duration-input').attr("value")).toBe(required);
    expect($(".work-plan-day").eq(3).text()).toContain(required);
    expect($(".work-plan-day").eq(0).text()).toContain("8 sa");
    expect($(".work-plan-day").eq(0).text()).not.toContain("1 dk");
    expect($(".work-plan-total").text()).toBe("Beklenen toplam 40 sa");
    expect($(".work-plan-complete").length).toBe(0);
    if (mode === "last") expect($(".work-plan-day").eq(4).text()).toContain("6 sa 51 dk");
  }
});

test("dakika altındaki gereken süre açık günü sıfır gibi göstermez", () => {
  const plan = readWeekPlan([480, 480, 480, 1 / 60, 480, 0, 0])!;
  const $ = render([8, 8, 8], "2026-10-15", 32 * 3600 + 1, plan);
  expect($(".work-plan-day").eq(3).text()).toContain("1 dk");
  expect($(".work-plan-duration-input").attr("value")).toBe("1 dk");
});

test("dakika altındaki pozitif fazla süre hedef farkında sıfır gibi gösterilmez", () => {
  const $ = render([8, 8, 8 + 41 / 3600]);
  expect($(".work-plan-actions").text()).toContain("40 sa hedefinin üzerinde: 41 sn");
  expect($(".work-plan-actions").text()).not.toContain("üzerinde: 0 dk");
});

test("geçmiş gerçekleşenler varken 1,5 saat azaltma beklenen toplamı düşürür ve fazlayı korur", () => {
  const completed = [9 + 46 / 60, 8 + 40 / 60, 8 + 14 / 60 + 11 / 3600];
  const before = render(completed);
  expect(before(".work-plan-total").text()).toBe("Beklenen toplam 42 sa 40 dk");
  expect(before(".work-plan-actions").text()).toContain("40 sa hedefinin üzerinde: 2 sa 40 dk");
  const after = render(completed, "2026-10-15", 38.5 * 3600, [480,480,480,390,480,0,0]);
  expect(after(".work-plan-total").text()).toBe("Beklenen toplam 41 sa 10 dk");
  expect(after(".work-plan-actions").text()).toContain("40 sa hedefinin üzerinde: 1 sa 10 dk");
  expect(after(".work-plan-actions").text()).not.toContain("hedefine kalan");
  expect(after(".work-plan-day").eq(0).text()).toContain("9 sa 46 dk");
  expect(after(".work-plan-complete").is(":disabled")).toBe(false);
});

test("bütün günler kilitliyken fazla süre kalır; Tamamla kapasite açıklamasıyla kapalıdır", () => {
  const $ = render([9,8,8,8,8], "2026-10-17");
  expect($(".work-plan-complete").is(":disabled")).toBe(true);
  expect($(".work-plan-capacity").text()).toContain("kalan günlerle ulaşılamıyor");
});

test("geçmiş girişsiz çıkış planlayıcıda süre belirsiz olarak kilitlenir", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`,
    state: day === 3 ? "uncertain" : "awaiting-entry",
    recordedSeconds: null,
    records: day === 3 ? [{ direction: "exit" }] : [],
  }));
  const $ = load(renderToStaticMarkup(<PlanEditor plan={readDayPlan([0, 0, 0, 480, 0, 0, 0])!} defaultPlan={DEFAULT_WORK_PLAN}
    days={days} special={false} ready week="2026-10-12" today="2026-10-16" error=""
    onSave={() => true} onSaveDefault={() => true} onReset={() => true} onClose={() => {}} />));
  const thursday = $(".work-plan-day").eq(3);
  expect(thursday.attr("data-locked")).toBe("true");
  expect(thursday.text()).toContain("Süre belirsiz");
  expect(thursday.attr("aria-label")).toContain("değiştirilemez");
  expect($(".work-plan-recorded-time").text()).toContain("Süre belirsiz");
  expect($(".work-plan-editable").length).toBe(0);
});

test("kullanıcı kilidi tamamlanmış günün kayıt görünümünü değiştirmez", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`,
    state: day === 0 ? "recorded" : "awaiting-entry",
    recordedSeconds: day === 0 ? 8 * 3600 + 31 : null,
    records: day === 0 ? [{ direction: "in" }] : [],
  }));
  const $ = load(renderToStaticMarkup(<PlanEditor plan={readDayPlan([480, 0, 0, 0, 0, 0, 0])!} defaultPlan={DEFAULT_WORK_PLAN}
    days={days} special ready week="2026-10-12" today="2026-10-16" error="" userLockedDays={[1]}
    onSave={() => true} onSaveDefault={() => true} onReset={() => true} onSetLockedDays={() => true} onClose={() => {}} />));
  const monday = $(".work-plan-day").eq(0);
  expect(monday.attr("data-locked")).toBe("true");
  expect(monday.attr("aria-label")).toContain("Kayıtlı süre, değiştirilemez");
  expect($(".work-plan-recorded-time").text()).toContain("Gerçekleşen:");
  expect($(".work-plan-lock").length).toBe(0);
});

test("yalnız manuel kilit bulunan haftada Sıfırla görünür", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`,
    state: "awaiting-entry",
    recordedSeconds: null,
  }));
  const $ = load(renderToStaticMarkup(<PlanEditor plan={DEFAULT_WORK_PLAN} defaultPlan={DEFAULT_WORK_PLAN}
    days={days} special ready week="2026-10-12" today="2026-10-16" error="" userLockedDays={[4]}
    onSave={() => true} onSaveDefault={() => true} onReset={() => true} onSetLockedDays={() => true} onClose={() => {}} />));
  expect($(".work-plan-reset").text()).toBe("Planı sıfırla");
  expect($(".work-plan-reset").is(":disabled")).toBe(false);
});
