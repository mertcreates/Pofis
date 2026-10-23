import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { presentReport, type Report } from "@/domain/report";
import { DEFAULT_WORK_PLAN } from "@/domain/rules/work-plan";
import { DayFlow } from "./day-flow";

function render(passages: Report["passages"], stale = false, now = "2026-10-19T14:40:31+03:00") {
  const report: Report = {
    person: { id: "fixture", name: "Örnek", unit: "", title: "" },
    from: "2026-10-19", to: "2026-10-25", fetchedAt: now, passages,
  };
  const day = presentReport(report, DEFAULT_WORK_PLAN, Date.parse(report.fetchedAt), stale).days[0];
  return load(renderToStaticMarkup(<DayFlow day={day} target={day.source.exitGoalSeconds} onOpenRecords={() => {}} />));
}

const entry = { date: "2026-10-19", time: "08:00:17", direction: "in" as const };

test("giriş yokken boş grafik veya sıfır mesai gösterilmez", () => {
  const $ = render([]);
  expect($("[role=status]").text()).toBe("Henüz giriş kaydı yok");
  expect($(".rail-track, .rail-elapsed, .rail-legend")).toHaveLength(0);
});

test("çıkış kaydı canlı Şimdi saatinin yerini alır; hedefin saniyeleri korunur", () => {
  const running = render([entry]);
  expect(running(".rail-marker-label > span").text()).toBe("Şimdi");
  expect(running(".rail-marker-label time").attr("aria-label")).toBe("14:40:31");
  expect(running(".rail-target-label time").text()).toBe("16:00:17");
  expect(running(".rail-exit-goal")).toHaveLength(0);
  const closed = render([entry, { date: entry.date, time: "14:40:31", direction: "out" }]);
  expect(closed(".rail-marker-label > span").text()).toBe("Son çıkış");
  expect(closed(".rail-marker-label time").attr("aria-label")).toBe("14:40:31");
});

test("hedef öncesinde Şimdi ilerler; hedef aşılınca hedef işareti geride kalır", () => {
  const before = render([entry], false, "2026-10-19T12:00:17+03:00");
  expect(before(".rail-chart").attr("style")).toContain("--rail-position:50cqw");
  expect(before(".rail-chart").attr("style")).toContain("--rail-target-position:100cqw");
  const after = render([entry], false, "2026-10-19T18:00:17+03:00");
  expect(after(".rail-chart").attr("style")).toContain("--rail-position:100cqw");
  expect(after(".rail-chart").attr("style")).toContain("--rail-target-position:80cqw");
  expect(after(".rail-target-label time").text()).toBe("16:00:17");
  expect(after(".rail-marker-label time").attr("aria-label")).toBe("18:00:17");
});

test("ara giriş-çıkış tekrarları Günün akışı uyarısı üretmez; güvenilir canlı süre korunur", () => {
  const $ = render([
    entry,
    { date: entry.date, time: "09:00:00", direction: "in" },
    { date: entry.date, time: "12:00:00", direction: "out" },
    { date: entry.date, time: "13:00:00", direction: "out" },
    { date: entry.date, time: "14:00:00", direction: "in" },
  ]);
  expect($("[role=status]")).toHaveLength(0);
  expect($(".rail-records-link")).toHaveLength(0);
  expect($(".rail-work dd").text()).toBe("6 sa 40 dk 14 sn");
  expect($(".rail-marker-label > span").text()).toBe("Şimdi");
});

test("eşleşmeyen ara çıkış bilinen ilk-son süresini belirsiz diye etiketlemez", () => {
  const $ = render([
    { date: entry.date, time: "07:00:00", direction: "out" },
    entry,
    { date: entry.date, time: "12:00:00", direction: "out" },
  ]);
  expect($("[role=status]")).toHaveLength(0);
  expect($(".rail-records-link")).toHaveLength(0);
  expect($(".rail-work dd").text()).toBe("3 sa 59 dk 43 sn");
});

test("gerçek belirsizlikte kısa uyarı ve kayıtları aç eylemi korunur", () => {
  const $ = render([{ date: entry.date, time: "12:00:00", direction: "out" }]);
  expect($("[role=status]").text()).toBe("Kayıtlarda belirsizlik var");
  expect($(".rail-records-link").text()).toBe("Kayıtları aç");
});

test("eski raporda giriş bilinse de bilinmeyen mesai sıfıra veya canlı süreye çevrilmez", () => {
  const $ = render([entry], true);
  expect($(".rail-work dd").text()).toBe("-");
  expect($(".rail-exit-goal > dd > time").text()).toBe("16:00:17");
  expect($(".rail-track, .rail-target-delta")).toHaveLength(0);
});
