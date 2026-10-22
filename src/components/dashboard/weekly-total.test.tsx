import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { presentReport, type Report } from "@/domain/report";
import { readDayPlan } from "@/domain/rules/work-plan";
import { DashboardMetrics } from "./metrics";

const report: Report = {
  person: { id: "fixture", name: "Örnek", unit: "", title: "" },
  from: "2026-10-19", to: "2026-10-25", fetchedAt: "2026-10-23T12:00:00+03:00", passages: [],
};

function render(leaveDays: number[], passages: Report["passages"] = [], isCurrent = true, today = "2026-10-23") {
  const fetchedAt = `${today}T12:00:00+03:00`;
  const days = presentReport({ ...report, fetchedAt, passages }, readDayPlan([480, 480, 480, 480, 0, 0, 0])!,
    Date.parse(fetchedAt), false).days;
  const $ = load(renderToStaticMarkup(<DashboardMetrics days={days} today={today} week={report.from}
    isCurrent={isCurrent} targetSeconds={32 * 3600} leaveDays={leaveDays} onSelectDay={() => {}} onOpenRecords={() => {}} />));
  return { $ };
}

test("izinli gün kendi sırasını korur; normal kapalı günler cetvele eklenmez", () => {
  const { $ } = render([4]);
  expect($(".weekly-ruler-day-label").map((_, day) => $(day).text()).get()).toEqual([
    "Pzt", "Sal", "Çar", "Per", "Cum",
  ]);
  expect($(".weekly-ruler-day").last().attr("aria-label")).toBe("Cuma · Bugün, İzinli. Cuma mesai planını aç");
  expect($(".weekly-ruler-leave").text()).toBe("İzinli");
  expect($(".weekly-ruler-leave-duration")).toHaveLength(0);
  expect($(".weekly-ruler-tick:not(.weekly-ruler-leave)")).toHaveLength(4);
  expect(render([]).$(".weekly-ruler-day")).toHaveLength(4);
});

test("izinli günün çalışma kaydı görünür ve haftalık toplamda korunur", () => {
  const passages: Report["passages"] = [
    { date: "2026-10-23", time: "08:00:00", direction: "in" },
    { date: "2026-10-23", time: "16:23:17", direction: "out" },
  ];
  const { $ } = render([4], passages);
  expect($(".weekly-ruler-leave-duration").text()).toBe("8 sa 23 dk");
  expect($(".weekly-ruler-day").last().attr("aria-label")).toBe("Cuma · Bugün, İzinli, Çalışılan: 8 sa 23 dk 17 sn. Cuma mesai planını aç");
  expect($(".weekly-total .metric-value").text()).toBe("8 sa 23 dk 17 sn");
  expect($(".weekly-total-target").attr("aria-label")).toContain("32 sa");
});

test("izin işareti geçmiş haftanın cetvelini açmaz", () => {
  expect(render([4], [], false).$(".weekly-ruler")).toHaveLength(0);
});

test("bugün tek gün olarak belirginleşir; gelecek günler kayıt eksikliği yerine planlanan süreyi anlatır", () => {
  const { $ } = render([4], [], true, "2026-10-19");
  expect($(".weekly-ruler-day.is-today")).toHaveLength(1);
  expect($(".weekly-ruler-day.is-today .weekly-ruler-day-label").text()).toBe("Pzt");
  expect($(".weekly-ruler-day.is-today").attr("aria-label")).toContain("Pazartesi · Bugün");
  const tuesday = $(".weekly-ruler-day").eq(1);
  expect(tuesday.hasClass("is-future")).toBe(true);
  expect(tuesday.attr("aria-label")).toBe("Salı, Planlanan · 8 sa. Salı mesai planını aç");
  expect($(".weekly-ruler-day").last().attr("aria-label")).toBe("Cuma, İzinli. Cuma mesai planını aç");
  expect(tuesday.prop("tagName")).toBe("BUTTON");
  expect($(".weekly-ruler-day.has-record-issue")).toHaveLength(0);
});

test("geçmiş kayıtsız gün, sıfır saat çalışılmış gibi gösterilmez", () => {
  const { $ } = render([]);
  const monday = $(".weekly-ruler-day").first();
  expect(monday.hasClass("has-record-issue")).toBe(true);
  expect(monday.find(".weekly-ruler-day-label svg")).toHaveLength(1);
  expect(monday.attr("aria-label")).toBe("Pazartesi, Kayıt bulunamadı, Çalışılan: Kayıtlı süre yok, Hedef: 8 sa. Pazartesi kayıtlarını aç");
});

test.each([
  ["süresi bilinmeyen", [{ date: "2026-10-22", time: "12:00:00", direction: "out" }], "Kayıtlı süre yok", 0],
  ["süresi bilinen", [
    { date: "2026-10-22", time: "08:00:00", direction: "in" },
    { date: "2026-10-22", time: "12:00:00", direction: "out" },
    { date: "2026-10-22", time: "13:00:00", direction: "in" },
  ], "≈ 4 sa", 0.5],
] as const)("%s belirsiz gün işaretlenir; bilinen süre korunur", (_, passages, actual, fraction) => {
  const { $ } = render([], passages.map(passage => ({ ...passage })));
  const thursday = $(".weekly-ruler-day").eq(3);
  expect(thursday.hasClass("has-record-issue")).toBe(true);
  expect(thursday.find(".weekly-ruler-day-label svg")).toHaveLength(1);
  expect(thursday.attr("aria-label")).toBe(`Perşembe, Kayıtlarda belirsizlik var, Çalışılan: ${actual}, Hedef: 8 sa. Perşembe kayıtlarını aç`);
  expect(thursday.find(".weekly-ruler-tick").attr("style")).toContain(`--ruler-recorded:${fraction * 100}%`);
});

test("hedef altında olsa da tutarlı kayıtlı gün uyarı almaz; süre ve hedef ayrı adlandırılır", () => {
  const { $ } = render([], [
    { date: "2026-10-22", time: "08:00:00", direction: "in" },
    { date: "2026-10-22", time: "10:00:00", direction: "out" },
  ]);
  const thursday = $(".weekly-ruler-day").eq(3);
  expect(thursday.hasClass("has-record-issue")).toBe(false);
  expect(thursday.find(".weekly-ruler-day-label svg")).toHaveLength(0);
  expect(thursday.attr("aria-label")).toBe("Perşembe, Çalışılan: 2 sa, Hedef: 8 sa. Perşembe kayıtlarını aç");
});
