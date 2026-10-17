import { expect, test } from "bun:test";
import { readWorkPlans, workPlanStorage } from "./work-plans";
import { readPlanInput } from "@/domain/rules/work-plan";
import { savePlans } from "@/lib/plan-storage.js";
import { readReportResponse } from "./report-response";
import type { Report } from "@/domain/report";

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    values,
  };
}
test("demo planı ayrı saklanır; iki kapsam kendi planını yeniden okur", () => {
  const store = storage();
  const live = workPlanStorage(store, "live");
  const demo = workPlanStorage(store, "demo");
  const week = "2026-10-12";
  const livePlan = readPlanInput({ weekdays: [0, 1, 2, 3, 4], hours: 40 })!;
  const demoPlan = readPlanInput({ weekdays: [0, 1, 2, 3, 4], hours: 35 })!;
  savePlans(live, { [week]: livePlan });
  expect(readWorkPlans(demo)).toEqual({});
  savePlans(demo, { [week]: demoPlan });
  expect(readWorkPlans(live)[week].goals.hours).toBe(40);
  expect(readWorkPlans(demo)[week].goals.hours).toBe(35);
  expect(store.values.size).toBe(2);
});
test("eski tercih kayıtlarından plan içe aktarılmaz", () => {
  const original = JSON.stringify({
    defaultPlan: [480, 480, 480, 480, 420, 0, 0],
    overrides: { "2026-10-05": [240, 240, 240, 240, 240, 0, 0] },
  });
  const oldPlans = JSON.stringify({
    "2026-10-12": { hours: 8, weekdays: [0] },
  });
  const store = storage({
    "pofis:preferences:v1": original,
    "pdks.mesai-plans.v1": oldPlans,
  });
  expect(readWorkPlans(store)).toEqual({});
  expect(store.getItem("pofis:preferences:v1")).toBe(original);
  expect(store.getItem("pdks.mesai-plans.v1")).toBe(oldPlans);
});
test("rapor sözleşmesi aynı güne ait hareketleri kabul eder, kişi/tarih ve hareket yapısını doğrular", () => {
  const valid: Report = {
    person: { id: "self", name: "Fixture", title: "", unit: "" },
    from: "2026-10-12",
    to: "2026-10-18",
    fetchedAt: "2026-10-16T12:00:00Z",
    passages: [
      { date: "2026-10-16", time: "08:00:00", direction: "in" },
      { date: "2026-10-16", time: "12:00:00", direction: "out" },
    ],
  };
  expect(readReportResponse(valid, valid.from, valid.to)).toEqual(valid);
  for (const value of [
    null,
    { ...valid, person: { ...valid.person, id: "another" } },
    { ...valid, from: "2026-10-05" },
    { ...valid, passages: undefined },
    { ...valid, passages: null },
    { ...valid, passages: [{ date: "2026-10-11", time: "08:00:00", direction: "in" }] },
    { ...valid, passages: [{ date: "2026-02-30", time: "08:00:00", direction: "in" }] },
    { ...valid, passages: [{ date: "2026-10-16", time: "08:00:00", direction: "unknown" }] },
    {
      ...valid,
      passages: [{ date: "2026-10-16", time: "25:00:00", direction: "in" }],
    },
  ]) {
    expect(() => readReportResponse(value, valid.from, valid.to)).toThrow();
  }
});
