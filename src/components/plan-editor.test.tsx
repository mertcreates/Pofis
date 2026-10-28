import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { PlanEditor } from "./plan-editor";
import { completeWeekPlan, DEFAULT_WORK_PLAN, readDayPlan, readWeekPlan, resolveWeekPlan, type PlanDay, type WorkPlan } from "@/domain/rules/work-plan";

test("cetvelden gelen gün bugünden farklıysa o gün seçili açılır", () => {
  const $ = load(renderToStaticMarkup(<PlanEditor plan={DEFAULT_WORK_PLAN} defaultPlan={DEFAULT_WORK_PLAN}
    days={[]} special={false} ready week="2026-10-12" today="2026-10-15" initialDate="2026-10-16" error=""
    onSave={() => true} onSaveDefault={() => true} onReset={() => true} onClose={() => {}} />));
  expect($(".work-plan-day[aria-pressed=true] strong").text()).toBe("Cum");
});

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

test("hedef, beklenen toplam ve fark tek özette görünür; fazla süre için ayarla kullanılır", () => {
  const $ = render([9,8,8]);
  expect($(".work-plan-tabs button").first().text()).toBe("Çalışma düzeni");
  expect($(".work-planner > .inline-notice").length).toBe(0);
  expect($(".work-plan-summary > div").map((_, row) => $(row).text()).get()).toEqual([
    "Haftalık hedef 40 sa", "Beklenen toplam 41 sa", "Hedefi aşan 1 sa",
  ]);
  expect($(".work-plan-actions .work-plan-difference").length).toBe(0);
  expect($(".work-plan-complete").text()).toBe("40 saate ayarla");
  expect($(".work-plan-complete").is(":disabled")).toBe(false);
  expect($(".work-plan-reset").length).toBe(0);
  expect($(".work-plan-day").eq(4).text()).toContain("8 sa");
});

test("hedef farkı tek yerde saniye hassasiyetiyle gösterilir", () => {
  const $ = render([8, 8, 8 + 211 / 3600]);
  expect($(".work-planner > .inline-notice").length).toBe(0);
  expect($(".work-plan-difference").text()).toBe("Hedefi aşan 3 dk 31 sn");
  expect($(".work-plan-total dd").text()).toBe("40 sa 3 dk 31 sn");
  expect($(".work-plan-day").eq(3).text()).toContain("8 sa");
  expect($(".work-plan-day").eq(4).text()).toContain("8 sa");
});

test("hedefle aynı beklenen toplam gereksiz Tamamla eylemi göstermez", () => {
  const $ = render([8,8,8]);
  expect($(".work-plan-complete").length).toBe(0);
  expect($(".work-plan-difference").length).toBe(0);
  expect($(".work-plan-summary > div").first().text()).toBe("Haftalık hedef 40 sa");
  expect($('[role="status"]').length).toBe(0);
});

test("günlük kapasiteye sığmayan süre kısa uyarıyla görünür", () => {
  const $ = render([2,2,2], "2026-10-15", 144000, [480,480,480,960,960,0,0]);
  expect($('.work-planner > .inline-notice').text()).toBe('Plana eklenemeyen · 2 sa');
  expect($('.work-plan-difference').text()).toBe('Hedefe kalan 2 sa');
  expect($('.work-plan-complete').text()).toBe('40 saate tamamla');
  expect($('.work-plan-complete').is(':disabled')).toBe(true);
});

test("manuel kilitler hedefe tamamlamayı engellerse uygulanabilir yönlendirme korunur", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`, state: "awaiting-entry", recordedSeconds: null,
  }));
  const $ = load(renderToStaticMarkup(<PlanEditor plan={[420,420,420,420,420,0,0]} defaultPlan={DEFAULT_WORK_PLAN}
    days={days} special ready week="2026-10-12" today="2026-10-12" error="" userLockedDays={[0,1,2,3,4]}
    onSave={() => true} onSaveDefault={() => true} onReset={() => true} onClose={() => {}} />));
  expect($('.work-plan-capacity').text()).toBe('Bir günün kilidini aç.');
  expect($('.work-plan-complete').is(':disabled')).toBe(true);
});

test.each([39.5, 40.5])("özel %s saat hedefinde üst bildirim gizlenir; güncel toplam ve Tamamla korunur", hours => {
  const $ = render([9,8,8], "2026-10-15", hours * 3600);
  expect($('[role="status"]').length).toBe(0);
  expect($(".work-plan-total").text()).toBe("Beklenen toplam 41 sa");
  expect($(".work-plan-total").text()).not.toContain("Plan gerçekleşirse");
  expect($(".work-plan-summary > div").first().text()).toBe("Haftalık hedef 40 sa");
  expect($(".work-plan-difference").text()).toBe("Hedefi aşan 1 sa");
  expect($(".work-plan-complete").text()).toBe("40 saate ayarla");
  expect($(".work-plan-complete").is(":disabled")).toBe(false);
});

test("39 saatlik hedefte gerçekleşen fazla süre beklenen toplama ve referans farkına katılır", () => {
  const $ = render([8,8,8 + 2219 / 3600], "2026-10-15", 39 * 3600, [480,480,480,480,420,0,0]);
  expect($(".work-plan-total").text()).toBe("Beklenen toplam 39 sa 36 dk 59 sn");
  expect($(".work-plan-difference").text()).toBe("Hedefe kalan 23 dk 1 sn");
  expect($(".work-plan-complete").text()).toBe("40 saate tamamla");
  expect($(".work-plan-complete").is(":disabled")).toBe(false);
});

test("Tamamla sonrası saniyeli gereken gün yukarı, geçmiş gerçekleşen gün aşağı gösterilir", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`, state: day < 3 ? "recorded" : "awaiting-entry",
    recordedSeconds: day < 3 ? [8 * 3600 + 31, 8 * 3600 + 29, 9 * 3600 + 8 * 60 + 17][day] : null,
  }));
  for (const mode of ["equal", "last"] as const) {
    const resolved = resolveWeekPlan(days, DEFAULT_WORK_PLAN, "2026-10-15");
    const plan = completeWeekPlan(DEFAULT_WORK_PLAN, DEFAULT_WORK_PLAN, resolved, mode)!;
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
  expect($(".work-plan-difference").text()).toBe("Hedefi aşan 41 sn");
  expect($(".work-plan-total dd").text()).toBe("40 sa 41 sn");
});

test("geçmiş gerçekleşenler varken 1,5 saat azaltma beklenen toplamı düşürür ve fazlayı korur", () => {
  const completed = [9 + 46 / 60, 8 + 40 / 60, 8 + 14 / 60 + 11 / 3600];
  const before = render(completed);
  expect(before(".work-plan-total").text()).toBe("Beklenen toplam 42 sa 40 dk 11 sn");
  expect(before(".work-plan-difference").text()).toBe("Hedefi aşan 2 sa 40 dk 11 sn");
  const after = render(completed, "2026-10-15", 38.5 * 3600, [480,480,480,390,480,0,0]);
  expect(after(".work-plan-total").text()).toBe("Beklenen toplam 41 sa 10 dk 11 sn");
  expect(after(".work-plan-difference").text()).toBe("Hedefi aşan 1 sa 10 dk 11 sn");
  expect(after(".work-plan-summary > div").first().text()).toBe("Haftalık hedef 40 sa");
  expect(after(".work-plan-day").eq(0).text()).toContain("9 sa 46 dk");
  expect(after(".work-plan-complete").is(":disabled")).toBe(false);
});

test("bütün günler kilitliyken fazla süre kalır; Tamamla kapasite açıklamasıyla kapalıdır", () => {
  const $ = render([9,8,8,8,8], "2026-10-17");
  expect($(".work-plan-complete").is(":disabled")).toBe(true);
  expect($(".work-plan-capacity").text()).toContain("Kalan günlerde yeterli süre yok.");
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

test("planlayıcı kapalı başlar; kilitli günlerde açılamaz, tamamlanan ve kapalı günlerde sunulmaz", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`, state: day < 3 ? "recorded" : "awaiting-entry",
    recordedSeconds: day < 3 ? 28800 : null,
  }));
  function clockEditor(plan: WorkPlan, today: string, userLockedDays: number[] = []) {
    return load(renderToStaticMarkup(<PlanEditor plan={plan} defaultPlan={DEFAULT_WORK_PLAN} days={days}
      special ready week="2026-10-12" today={today} error="" userLockedDays={userLockedDays}
      times={{ 3: { anchor: "entry", minute: 1200 } }} onSetTime={() => true}
      onSave={() => true} onSaveDefault={() => true} onReset={() => true} onClose={() => {}} />));
  }
  const $ = clockEditor(DEFAULT_WORK_PLAN, "2026-10-15");
  expect($(".work-plan-clock-toggle").text()).toBe("Planlayıcı");
  expect($(".work-plan-clock-toggle").attr("aria-expanded")).toBe("false");
  expect($(".work-plan-clock-panel").length).toBe(0);
  expect($(".work-plan-reset").length).toBe(1);
  expect(clockEditor(DEFAULT_WORK_PLAN, "2026-10-15", [3])('.work-plan-clock-toggle:disabled').length).toBe(1);
  expect(clockEditor([0,0,0,0,0,0,0], "2026-10-12")('.work-plan-clock-toggle').length).toBe(0);
  expect(clockEditor([0,480,0,0,0,0,0], "2026-10-15")('.work-plan-clock-toggle').length).toBe(0);
});

test("gün eylemleri sırasını korur; manuel kilit durum ve sabit süre olarak görünür", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`, state: "awaiting-entry", recordedSeconds: null,
  }));
  function editor(userLockedDays: number[] = []) {
    return load(renderToStaticMarkup(<PlanEditor plan={DEFAULT_WORK_PLAN} defaultPlan={DEFAULT_WORK_PLAN}
      days={days} special ready week="2026-10-12" today="2026-10-16" error="" userLockedDays={userLockedDays}
      onSave={() => true} onSaveDefault={() => true} onReset={() => true} onSetLockedDays={() => true}
      onSetTime={() => true} onClose={() => {}} />));
  }
  const open = editor();
  expect(open('.work-plan-day-options button').map((_, el) => open(el).text()).get()).toEqual(['İzin', '', 'Planlayıcı']);
  expect(open('.work-plan-lock').attr('aria-label')).toBe('Süreyi kilitle');
  expect(open('.work-plan-stepper').length).toBe(1);
  const locked = editor([4]);
  expect(locked('.work-plan-lock').text()).toBe('');
  expect(locked('.work-plan-lock').attr('aria-pressed')).toBe('true');
  expect(locked('.work-plan-lock').attr('aria-label')).toBe('Kilidi aç');
  expect(locked('.work-plan-locked-time').text()).toBe('8 sa');
  expect(locked('.work-plan-stepper').length).toBe(0);
  expect(locked('.work-plan-day-action:disabled, .work-plan-clock-toggle:disabled').length).toBe(2);
});

test("izin seçimi durumunu gösterir ve izni kaldırma eylemini korur", () => {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`, state: "awaiting-entry", recordedSeconds: null,
  }));
  const $ = load(renderToStaticMarkup(<PlanEditor plan={[0,0,0,0,0,0,0]} defaultPlan={DEFAULT_WORK_PLAN}
    days={days} special ready week="2026-10-12" today="2026-10-12" error="" leaveDays={[0]}
    onSave={() => true} onSaveDefault={() => true} onReset={() => true} onSetLockedDays={() => true}
    onSetTime={() => true} onClose={() => {}} />));
  expect($('.work-plan-day-action').text()).toBe('İzinli');
  expect($('.work-plan-day-action').attr('aria-pressed')).toBe('true');
  expect($('.work-plan-day-action').attr('aria-label')).toBe('Pazartesi iznini kaldır');
  expect($('.work-plan-duration-control').length).toBe(1);
  expect($('.work-plan-duration-control').text()).toBe('');
  expect($('.work-plan-closed-status').length).toBe(0);
  expect($('.work-plan-stepper, .work-plan-lock, .work-plan-clock-toggle').length).toBe(0);
});
