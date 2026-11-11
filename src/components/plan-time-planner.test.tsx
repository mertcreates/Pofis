import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { PlanTimePlanner } from "./plan-time-planner";

test.each([8 * 3600, 9 * 3600])("kayıtlı giriş düzenlenemez; çıkış gereken %s saniyeden hesaplanır", seconds => {
  const html = load(renderToStaticMarkup(<PlanTimePlanner time={{ anchor: "entry", minute: 8 * 60 + 15 }}
    seconds={seconds} day={3} disabled={false} recordedEntry id="clock" onCommit={() => { throw new Error("Kayıtlı giriş kaydedilemez"); }} />));
  expect(html("input")).toHaveLength(2);
  expect(html("input:not(:disabled)")).toHaveLength(0);
  expect(html("input").map((_, el) => html(el).attr("value")).get()).toEqual(["08", "15"]);
  expect(html("button")).toHaveLength(0);
  expect(html(".small-label").text()).toBe("İlk giriş");
  expect(html("output strong").text()).toContain(seconds === 8 * 3600 ? "16:15" : "17:15");
});

test("giriş kaydı yokken plan saati ve saat türü düzenlenebilir", () => {
  const html = load(renderToStaticMarkup(<PlanTimePlanner time={{ anchor: "exit", minute: 17 * 60 }}
    seconds={8 * 3600} day={4} disabled={false} id="clock" onCommit={() => true} />));
  expect(html("input:not(:disabled)")).toHaveLength(2);
  expect(html(".work-plan-time-clear:not(:disabled)")).toHaveLength(1);
  expect(html(".work-plan-time-choice button:not(:disabled)")).toHaveLength(2);
  expect(html("output strong").text()).toContain("09:00");
});
