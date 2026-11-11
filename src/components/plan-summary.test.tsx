import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { PlanSummary } from "./plan-summary";

test.each([
  [39, "Hedefe kalan"],
  [41, "Hedefi aşan"],
] as const)("%s saatlik beklenen toplamda fark ortak üst özette gösterilir", (hours, label) => {
  const html = load(renderToStaticMarkup(<PlanSummary targetSeconds={40 * 3600} totalSeconds={hours * 3600} />));
  expect(html("dt").map((_, el) => html(el).text()).get()).toEqual(["Haftalık hedef", "Beklenen toplam", label]);
  expect(html(".work-plan-difference dd").text()).toBe("1 sa");
});

test("bilinmeyen toplamda toplam ve fark üretilmez; eşitlikte fark satırı gerekmez", () => {
  const unknown = load(renderToStaticMarkup(<PlanSummary targetSeconds={144000} totalSeconds={null} />));
  expect(unknown("dt").text()).toBe("Haftalık hedef");
  const equal = load(renderToStaticMarkup(<PlanSummary targetSeconds={144000} totalSeconds={144000} />));
  expect(equal("dt")).toHaveLength(2);
});
