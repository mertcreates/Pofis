import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { presentReport, type Report } from "@/domain/report";
import { DEFAULT_WORK_PLAN } from "@/domain/rules/work-plan";
import { PofiPanel } from "./pofi-panel";

function render(clock: string, closed = false) {
  const now = Date.parse(`2026-10-19T${clock}+03:00`);
  const report: Report = {
    person: { id: "fixture", name: "Örnek", unit: "", title: "" },
    from: "2026-10-19", to: "2026-10-25",
    fetchedAt: new Date(now).toISOString(),
    passages: [
      { date: "2026-10-19", time: "08:00:00", direction: "in" },
      ...(closed ? [{ date: "2026-10-19", time: "16:00:00", direction: "out" as const }] : []),
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
  const $ = render("17:00:00", true);
  expect($(".pofi-message-title").text()).toBe("Hedefe ulaşıldı.");
  expect($(".pofi-message-copy").text()).toBe("Kalemin kapağını kapattım.");
});
