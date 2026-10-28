import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { presentReport, type Report } from "@/domain/report";
import { DEFAULT_WORK_PLAN } from "@/domain/rules/work-plan";
import { PofiPanel } from "./pofi-panel";

function render(clock: string, scenario: "open" | "closed" | "uncertain" = "open") {
  const now = Date.parse(`2026-10-19T${clock}+03:00`);
  const report: Report = {
    person: { id: "fixture", name: "Örnek", unit: "", title: "" },
    from: "2026-10-19", to: "2026-10-25",
    fetchedAt: new Date(now).toISOString(),
    passages: scenario === "uncertain" ? [
      { date: "2026-10-19", time: "08:00:00", direction: "out" },
    ] : [
      { date: "2026-10-19", time: "08:00:00", direction: "in" },
      ...(scenario === "closed" ? [{ date: "2026-10-19", time: "16:00:00", direction: "out" as const }] : []),
    ],
  };
  const day = presentReport(report, DEFAULT_WORK_PLAN, now, false).days[0];
  return load(renderToStaticMarkup(<PofiPanel day={day} now={now} onOpen={() => {}} />));
}

test("canlı mesajda iki cümlenin özgün noktalaması korunur", () => {
  const $ = render("10:00:00");
  expect($(".pofi-message-title")).toHaveLength(0);
  expect($(".pofi-message-copy").text()).toBe("Mesai devam ediyor. Ben de yerime geçtim.");
});

test("canlı hedef tamamlanınca boş başlık nokta veya boşluk üretmez", () => {
  const $ = render("16:00:00");
  expect($(".pofi-message-copy").text()).toBe("Ben biraz daha oturuyorum.");
});

test("kayıtlı hedef tamamlanınca cümleler ayrı gösterilir ve noktalamaları korunur", () => {
  const $ = render("17:00:00", "closed");
  expect($(".pofi-message-title").text()).toBe("Hedefe ulaşıldı.");
  expect($(".pofi-message-copy").text()).toBe("Kalemin kapağını kapattım.");
});

test("saat sürprizi dakika boyunca görünür ve sonraki dakikada normal mesaj döner", () => {
  const $ = render("12:34:00");
  expect($(".pofi-panel").attr("data-state")).toBe("working");
  expect($(".pofi-hero").attr("src")).toBe("/pofi/states/working.webp");
  expect($(".pofi-message-copy").text())
    .toBe("Mesai devam ediyor. 12:34. Her şey sırayla.");
  expect(render("12:34:59")(".pofi-message-copy").text())
    .toBe("Mesai devam ediyor. 12:34. Her şey sırayla.");
  expect(render("12:35:00")(".pofi-message-copy").text())
    .toBe("Mesai devam ediyor. Ben de yerime geçtim.");
});

test("belirsiz kayıt mesajı saat sürprizinden önce gelir", () => {
  const $ = render("12:34:00", "uncertain");
  expect($(".pofi-panel").attr("data-state")).toBe("error");
  expect($(".pofi-message-title").text()).toBe("Kayıtlarda belirsizlik var.");
  expect($(".pofi-message-copy").text()).toBe("Giriş-çıkış kayıtlarını kontrol et.");
});
