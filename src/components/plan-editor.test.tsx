import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { PlanEditor } from "./plan-editor";
import { DEFAULT_WORK_PLAN, type PlanDay, type WorkPlan } from "@/domain/rules/work-plan";

function render(completedHours: number[], today = "2026-10-15", targetSeconds = 144000, plan: WorkPlan = DEFAULT_WORK_PLAN) {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`,
    state: day < completedHours.length ? "recorded" : "awaiting-entry",
    recordedSeconds: day < completedHours.length ? completedHours[day] * 3600 : null,
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

test("hedefle aynı beklenen toplam gereksiz Tamamla eylemi göstermez", () => {
  const $ = render([8,8,8]);
  expect($(".work-plan-complete").length).toBe(0);
  expect($('[role="status"]').length).toBe(0);
});

test.each([39.5, 40.5])("özel %s saat hedefinde üst bildirim gizlenir; güncel toplam ve Tamamla korunur", hours => {
  const $ = render([9,8,8], "2026-10-15", hours * 3600);
  expect($('[role="status"]').length).toBe(0);
  expect($(".work-plan-total").text()).toContain(`Haftalık plan ${Math.floor(hours)} sa 30 dk`);
  expect($(".work-plan-total").text()).not.toContain("Plan gerçekleşirse");
  expect($(".work-plan-actions").text()).toContain("30 dk");
  expect($(".work-plan-complete").text()).toBe("40 saate tamamla");
  expect($(".work-plan-complete").is(":disabled")).toBe(false);
});

test("39 saatlik plan ve 36:59 fazla kayıtta tek hedef karşılaştırması ana 40 saate kalan 1 saattir", () => {
  const $ = render([8,8,8 + 2219 / 3600], "2026-10-15", 39 * 3600, [480,480,480,480,420,0,0]);
  expect($(".work-plan-total").text()).toBe("Haftalık plan 39 sa");
  expect($(".work-plan-actions").text()).toContain("40 sa hedefine kalan: 1 sa");
  expect($(".work-plan-total").text()).not.toContain("36 dk");
  expect($(".work-plan-complete").is(":disabled")).toBe(false);
});

test("bütün günler kilitliyken fazla süre kalır; Tamamla kapasite açıklamasıyla kapalıdır", () => {
  const $ = render([9,8,8,8,8], "2026-10-17");
  expect($(".work-plan-complete").is(":disabled")).toBe(true);
  expect($(".work-plan-capacity").text()).toContain("mevcut açık günlerle ulaşılamıyor");
});
