import { expect, test } from "bun:test";
import { readWorkPlans, workPlanStorage } from "./work-plans";
import { readPlanInput, emptyWorkPlans, resolveStoredPlan, resolveStoredTarget, resolveLeaveDays, changeWeekPlan, changeDefaultPlan, readDayPlan, readWeekPlan, resolveWeekPlan } from "@/domain/rules/work-plan";
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
    values,
  };
}

test("sıfır süreli açık günler doğrulanır; izinle çelişki reddedilir, gereksiz işaretler temizlenir", () => {
  const week = "2026-10-12";
  for (const weekZeroOpenDays of [null, [], { [week]: null }, { [week]: [4,4] }, { [week]: [5] },
    { [week]: [-1] }, { [week]: [0.5] }, { [week]: ["4"] }, { "2026-10-13": [4] }]) {
    const raw = JSON.stringify({ ...emptyWorkPlans(), weekZeroOpenDays });
    const store = storage({ [PLAN_STORAGE_KEY]: raw });
    expect(() => readWorkPlans(store)).toThrow("açık gün");
    expect(store.getItem(PLAN_STORAGE_KEY)).toBe(raw);
  }
  const conflict = JSON.stringify({ ...emptyWorkPlans(), weekZeroOpenDays: { [week]: [4] }, weekLeaves: { [week]: [4] } });
  expect(() => readWorkPlans(storage({ [PLAN_STORAGE_KEY]: conflict }))).toThrow("açık gün");
  for (const days of [[], [4]]) {
    const store = storage({ [PLAN_STORAGE_KEY]: JSON.stringify({ ...emptyWorkPlans(), weekZeroOpenDays: { [week]: days } }) });
    expect(readWorkPlans(store)).toEqual(emptyWorkPlans());
  }
});

test("izin günü ve izin öncesi hedef yeniden okunur; karşılık bir kez düşülür ve güncel şablonu izler", () => {
  const store = storage();
  const week = "2026-10-12";
  const completed = [32400,32400,31200,null,null,null,null];
  const plans = changeWeekPlan(emptyWorkPlans(), week, readDayPlan([480,480,480,480,0,0,0])!, completed, 115200, [4]);
  savePlans(store, plans);
  const loaded = readWorkPlans(store);
  expect(loaded).toEqual(plans);
  expect(loaded.weekTargets?.[week]).toBe(144000);
  expect(resolveStoredTarget(loaded, week)).toBe(115200);
  expect(resolveLeaveDays(loaded, week)).toEqual([4]);
  const changed = changeDefaultPlan(loaded, readDayPlan([540,540,540,540,540,0,0])!, week, completed);
  savePlans(store, changed);
  expect(resolveStoredTarget(readWorkPlans(store), week)).toBe(129600);
  expect(resolveStoredPlan(readWorkPlans(store), week)[4]).toBe(0);
  savePlans(store, changeWeekPlan(readWorkPlans(store), week, null, completed));
  const reset = readWorkPlans(store);
  expect(resolveStoredTarget(reset, week)).toBe(162000);
  expect(resolveLeaveDays(reset, week)).toEqual([]);
  expect(reset.weekLeaves).toBeUndefined();
});

test("bozuk izin listeleri reddedilir ve özgün kayıt korunur; boş liste temizlenir", () => {
  const week = "2026-10-12";
  for (const weekLeaves of [null, [], { [week]: null }, { [week]: [4,4] }, { [week]: [5] },
    { [week]: [-1] }, { [week]: [0.5] }, { [week]: ["4"] }, { "2026-10-13": [4] }]) {
    const raw = JSON.stringify({ ...emptyWorkPlans(), weekLeaves });
    const store = storage({ [PLAN_STORAGE_KEY]: raw });
    expect(() => readWorkPlans(store)).toThrow("izin");
    expect(store.getItem(PLAN_STORAGE_KEY)).toBe(raw);
  }
  expect(readWorkPlans(storage({ [PLAN_STORAGE_KEY]: JSON.stringify({ ...emptyWorkPlans(), weekLeaves: { [week]: [] } }) })))
    .toEqual(emptyWorkPlans());
});

test("kilit koruması yeniden yüklemeden sonra da şablonu izler; diğer özel haftalar korunur", () => {
  const store = storage();
  const week = "2026-10-12";
  const otherWeek = "2026-10-19";
  const completed = [32400,32400,31200,null,null,null,null];
  const source = completed.map((recordedSeconds, day) => ({
    date: `2026-10-${12 + day}`, state: recordedSeconds === null ? "awaiting-entry" as const : "recorded" as const, recordedSeconds,
  }));
  const custom = readDayPlan([480,480,480,240,480,0,0])!;
  const initial = changeWeekPlan(emptyWorkPlans(), otherWeek, custom, [], 37 * 3600);
  savePlans(store, changeDefaultPlan(initial, readDayPlan([540,540,540,540,540,0,0])!, week, completed));
  const loaded = readWorkPlans(store);
  expect(resolveStoredTarget(loaded, week)).toBe(162000);
  expect(resolveWeekPlan(source, resolveStoredPlan(loaded, week), "2026-10-15", false, resolveStoredTarget(loaded, week)).displaySeconds)
    .toEqual([32400,32400,31200,32400,33600,0,0]);
  savePlans(store, changeDefaultPlan(loaded, readDayPlan([600,600,600,600,600,0,0])!, week, completed));
  const reloaded = readWorkPlans(store);
  expect(resolveStoredTarget(reloaded, week)).toBe(180000);
  expect(resolveStoredPlan(reloaded, week)).toEqual([480,480,480,600,600,0,0]);
  expect(resolveStoredPlan(reloaded, otherWeek)).toEqual(custom);
  expect(resolveStoredTarget(reloaded, otherWeek)).toBe(133200);
  expect(resolveStoredPlan(reloaded, "2026-10-05")).toEqual([600,600,600,600,600,0,0]);
  expect(resolveStoredTarget(reloaded, "2026-10-05")).toBe(180000);
});

test("saniyeli kalan plan ve bağımsız hafta hedefi yeniden yüklenir; elle düzenleme ve sıfırlama tutarlıdır", () => {
  const store = storage();
  const week = "2026-10-12";
  const next = readWeekPlan([480,480,390,53383 / 60,0,0,0])!;
  savePlans(store, changeWeekPlan(emptyWorkPlans(), week, next, [], 144000));
  const loaded = readWorkPlans(store);
  expect(resolveStoredTarget(loaded, week)).toBe(144000);
  expect(Math.round(resolveStoredPlan(loaded, week)[3] * 60)).toBe(53383);
  const edited = readWeekPlan([480,480,390,(53383 - 1800) / 60,0,0,0])!;
  expect(resolveStoredTarget(changeWeekPlan(loaded, week, edited), week)).toBe(142200);
  const reset = changeWeekPlan(loaded, week, null, [28800,28800,33000,null,null,null,null]);
  expect(resolveStoredTarget(reset, week)).toBe(144000);
  expect(reset.weekTargets).toEqual({ [week]: 144000 });
  savePlans(store, reset);
  expect(resolveStoredTarget(readWorkPlans(store), week)).toBe(144000);
  expect(resolveStoredPlan(readWorkPlans(store), week)).toEqual([480,480,390,480,480,0,0]);
  const template = changeDefaultPlan(loaded, readDayPlan([420,420,420,420,420,0,0])!, week, [28800,28800,33000,null,null,null,null]);
  expect(resolveStoredTarget(template, week)).toBe(144000);
  for (const weekTargets of [[], null, { [week]: -1 }, { [week]: 0.5 }, { "2026-10-13": 144000 }]) {
    expect(() => readWorkPlans(storage({ [PLAN_STORAGE_KEY]: JSON.stringify({ ...emptyWorkPlans(), weekTargets }) }))).toThrow();
  }
  expect(() => readWorkPlans(storage({ [PLAN_STORAGE_KEY]: JSON.stringify({ defaultPlan: next, weekOverrides: {} }) }))).toThrow();
});
test("demo planı ayrı saklanır; iki kapsam kendi planını yeniden okur", () => {
  const store = storage();
  const live = workPlanStorage(store, "live");
  const demo = workPlanStorage(store, "demo");
  const week = "2026-10-12";
  const livePlan = readPlanInput({ weekdays: [0, 1, 2, 3, 4], hours: 40 })!;
  const demoPlan = readPlanInput({ weekdays: [0, 1, 2, 3, 4], hours: 35 })!;
  savePlans(live, changeWeekPlan(emptyWorkPlans(), week, livePlan));
  expect(readWorkPlans(demo)).toEqual(emptyWorkPlans());
  savePlans(demo, changeWeekPlan(emptyWorkPlans(), week, demoPlan));
  expect(resolveStoredPlan(readWorkPlans(live), week)).toEqual([480, 480, 480, 480, 480, 0, 0]);
  expect(resolveStoredPlan(readWorkPlans(demo), week)).toEqual([420, 420, 420, 420, 420, 0, 0]);
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
  expect(readWorkPlans(store)).toEqual(emptyWorkPlans());
  expect(store.getItem("pofis:preferences:v1")).toBe(original);
  expect(store.getItem("pdks.mesai-plans.v1")).toBe(oldPlans);
});

test("v1 haftaları saatlerini koruyarak okunur; ilk yazıda v2 kaydedilir ve özgün kayıt korunur", () => {
  const raw = JSON.stringify({ "2026-10-12": { weekdays: [0, 1, 2, 3, 4], hours: 35 } });
  const store = storage({ "pofis:work-plans:v1": raw });
  const migrated = readWorkPlans(store);
  expect(resolveStoredPlan(migrated, "2026-10-12")).toEqual([420, 420, 420, 420, 420, 0, 0]);
  expect(store.values.size).toBe(1);
  savePlans(store, migrated);
  expect(readWorkPlans(store)).toEqual(migrated);
  expect(store.getItem("pofis:work-plans:v1")).toBe(raw);
  expect(store.getItem(PLAN_STORAGE_KEY)).not.toBeNull();
});

test("yeni sınırlarla uyumsuz eski plan sessizce yuvarlanmaz veya silinmez", () => {
  for (const hours of [0.25, 24, 8.1]) {
    const raw = JSON.stringify({ "2026-10-12": { weekdays: [0], hours } });
    const store = storage({ "pofis:work-plans:v1": raw });
    expect(() => readWorkPlans(store)).toThrow("Eski kayıt korunuyor");
    expect(store.getItem("pofis:work-plans:v1")).toBe(raw);
    expect(store.getItem(PLAN_STORAGE_KEY)).toBeNull();
  }
});

test("varsayılan ve özel dağılım yeniden okunur; geçmiş hafta mirası ve sıfırlama korunur", () => {
  const store = storage();
  const defaultPlan = readDayPlan([480, 480, 480, 480, 0, 0, 0])!;
  let plans = changeDefaultPlan(emptyWorkPlans(), defaultPlan);
  plans = changeWeekPlan(plans, "2026-10-12", readDayPlan([450, 480, 510, 480, 0, 0, 0])!);
  savePlans(store, plans);
  expect(resolveStoredPlan(readWorkPlans(store), "2026-10-05")).toEqual(defaultPlan);
  expect(readWorkPlans(store).weekOverrides["2026-10-12"]).toEqual([450, 480, 510, 480, 0, 0, 0]);
  savePlans(store, changeWeekPlan(readWorkPlans(store), "2026-10-12", null));
  expect(readWorkPlans(store).weekOverrides).toEqual({});
});

test("geçersiz v2 veri hata verir; bozuk kaydı varsayılan başarı gibi sunmaz", () => {
  for (const raw of ["{", "null", JSON.stringify({ defaultPlan: [480], weekOverrides: {} }),
    JSON.stringify({ ...emptyWorkPlans(), weekOverrides: { "2026-10-13": [480, 480, 480, 480, 480, 0, 0] } })]) {
    const store = storage({ [PLAN_STORAGE_KEY]: raw });
    expect(() => readWorkPlans(store)).toThrow();
    expect(store.getItem(PLAN_STORAGE_KEY)).toBe(raw);
  }
});

test("yazma hatası önceki depolama içeriğini korur", () => {
  const store = storage();
  savePlans(store, emptyWorkPlans());
  const before = store.getItem(PLAN_STORAGE_KEY);
  expect(() => savePlans({ setItem() { throw new Error("quota"); } },
    changeDefaultPlan(emptyWorkPlans(), readDayPlan([420, 420, 420, 420, 420, 0, 0])!))).toThrow("quota");
  expect(store.getItem(PLAN_STORAGE_KEY)).toBe(before);
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
