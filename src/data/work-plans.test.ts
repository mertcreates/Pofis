import { expect, test } from "bun:test";
import { readWorkPlans, workPlanStorage } from "./work-plans";
import { readPlanInput } from "@/domain/rules/work-plan";
import { savePlans, PLAN_STORAGE_KEY } from "@/lib/plan-storage.js";
import { readReportResponse } from "./report-response";
import type { Report } from "@/domain/report";

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
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
  expect(readWorkPlans(demo, week)).toEqual({});
  savePlans(demo, { [week]: demoPlan });
  expect(readWorkPlans(live, week)[week].goals.hours).toBe(40);
  expect(readWorkPlans(demo, week)[week].goals.hours).toBe(35);
  expect(store.values.size).toBe(2);
});
test("önizleme planını toplam ve seçili günleri koruyarak içe alır, özgün kaydı silmez", () => {
  const original = JSON.stringify({
    defaultPlan: [480, 480, 480, 480, 420, 0, 0],
    overrides: { "2026-10-05": [240, 240, 240, 240, 240, 0, 0] },
  });
  const store = storage({ "pofis:preferences:v1": original });
  const plans = readWorkPlans(store, "2026-10-12");
  expect(plans["2026-10-12"].goals).toEqual({
    days: 5,
    hours: 39,
    weekdays: [0, 1, 2, 3, 4],
  });
  expect(plans["2026-10-05"].goals.hours).toBe(20);
  savePlans(store, plans);
  expect(readWorkPlans(store, "2026-10-19")).toEqual(plans);
  expect(store.getItem("pofis:preferences:v1")).toBe(original);
});
test("arşiv planı önceliklidir; bozuk kayıtları eler ve legacy anahtarı kayıtta taşır", () => {
  const store = storage({
    "pdks.mesai-plans.v1": JSON.stringify({
      "2026-10-12": { hours: 8, weekdays: [0] },
      "2026-02-30": { hours: 8, weekdays: [0] },
    }),
  });
  const plans = readWorkPlans(store, "2026-10-12");
  expect(Object.keys(plans)).toEqual(["2026-10-12"]);
  savePlans(store, plans);
  expect(store.getItem("pdks.mesai-plans.v1")).toBeNull();
  expect(store.getItem(PLAN_STORAGE_KEY)).not.toBeNull();
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
