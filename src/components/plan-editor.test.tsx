import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { PlanEditor } from "./plan-editor";
import { DEFAULT_WORK_PLAN, type PlanDay } from "@/domain/rules/work-plan";

function render(completedHours: number[], today = "2026-10-15", targetSeconds = 144000) {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
    date: `2026-10-${12 + day}`,
    state: day < completedHours.length ? "recorded" : "awaiting-entry",
    recordedSeconds: day < completedHours.length ? completedHours[day] * 3600 : null,
  }));
  return load(renderToStaticMarkup(<PlanEditor plan={DEFAULT_WORK_PLAN} defaultPlan={DEFAULT_WORK_PLAN}
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
  expect($(".work-plan-total").text()).toContain(`Haftalık hedef ${Math.floor(hours)} sa 30 dk`);
  expect($(".work-plan-total").text()).toContain(`Plan gerçekleşirse: hedefin ${hours === 39.5 ? "1 sa 30 dk" : "30 dk"} üzerinde`);
  expect($(".work-plan-actions").text()).toContain("30 dk");
  expect($(".work-plan-complete").text()).toBe("40 saate tamamla");
  expect($(".work-plan-complete").is(":disabled")).toBe(false);
});

test("hedefin altındaki plan farkı doğru yönde ve tam süre açıklamasıyla gösterilir", () => {
  const $ = render([7,8,8,8,8], "2026-10-17");
  expect($(".work-plan-total").text()).toContain("Haftalık hedef 40 sa");
  expect($(".work-plan-total").text()).toContain("Plan gerçekleşirse: hedefin 1 sa altında");
  expect($(".work-plan-total [title]").attr("title")).toBe("Plan gerçekleşirse: hedefin 1 sa altında");
});

test("bütün günler kilitliyken fazla süre kalır; Tamamla kapasite açıklamasıyla kapalıdır", () => {
  const $ = render([9,8,8,8,8], "2026-10-17");
  expect($(".work-plan-complete").is(":disabled")).toBe(true);
  expect($(".work-plan-capacity").text()).toContain("mevcut açık günlerle ulaşılamıyor");
});
