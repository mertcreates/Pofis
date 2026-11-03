import { expect, test } from "bun:test";
import { initializeScenarioPlans } from "./work-plans";
import { createScenarioRuntime } from "@/desktop/scenario-runtime";

test("senaryo planı revizyon başına bir kez kurulur; ikinci pencere kullanıcı düzenlemesini ezmez", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const runtime = createScenarioRuntime({ realNow: () => Date.parse("2026-10-24T10:00:00+03:00") });
  initializeScenarioPlans(storage, runtime.snapshot());
  storage.setItem("pofis:work-plans:v1", "user edit");
  initializeScenarioPlans(storage, runtime.snapshot());
  expect(storage.getItem("pofis:work-plans:v1")).toBe("user edit");
  runtime.select("leave");
  initializeScenarioPlans(storage, runtime.snapshot());
  expect(JSON.parse(storage.getItem("pofis:work-plans:v1")!).weekLeaves).toEqual({ "2026-10-19": [2] });
  expect(storage.getItem("demo:pofis:work-plans:v1")).toBeNull();
});
import { subscribeWorkPlans, workPlanStorage } from "./work-plans";
import type { WorkPlans } from "@/domain/rules/work-plan";
import { emptyWorkPlans, resolveStoredPlan, resolveStoredTarget, resolveLeaveDays, resolveWeekTimes, changeWeekTime, changeWeekPlan, changeDefaultPlan, readDayPlan, readWeekPlan, resolveWeekPlan } from "@/domain/rules/work-plan";
import { loadPlans, savePlans, readStoredPlans, PLAN_STORAGE_KEY } from "@/lib/plan-storage.js";

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

test("diğer pencerenin planını kapsamına göre okur; bozuk kaydı korur ve düzeltildiğinde toparlanır", () => {
  const store = storage();
  const listeners = new Set<(event: StorageEvent) => void>();
  const events = {
    addEventListener: (_: string, listener: (event: StorageEvent) => void) => { listeners.add(listener); },
    removeEventListener: (_: string, listener: (event: StorageEvent) => void) => { listeners.delete(listener); },
  } as unknown as Pick<Window, "addEventListener" | "removeEventListener">;
  const live: WorkPlans[] = [], demo: WorkPlans[] = [], errors: unknown[] = [];
  const stopLive = subscribeWorkPlans("live", value => live.push(value), error => errors.push(error), { storage: store, events });
  const stopDemo = subscribeWorkPlans("demo", value => demo.push(value), error => errors.push(error), { storage: store, events });
  const changed = { ...emptyWorkPlans(), defaultPlan: readDayPlan([420,420,420,420,420,0,0])! };
  const emit = (key: string | null, storageArea: unknown = store) => {
    for (const listener of listeners) listener({ key, storageArea } as StorageEvent);
  };
  savePlans(store, changed); emit(PLAN_STORAGE_KEY);
  expect(live.at(-1)?.defaultPlan).toEqual([420,420,420,420,420,0,0]);
  expect(demo).toHaveLength(1);
  savePlans(workPlanStorage(store, "demo"), changed); emit(`demo:${PLAN_STORAGE_KEY}`);
  expect(demo.at(-1)).toEqual(changed);
  expect(live).toHaveLength(2);
  emit("unrelated"); emit(PLAN_STORAGE_KEY, {});
  expect(live).toHaveLength(2);
  store.setItem(PLAN_STORAGE_KEY, "{broken"); emit(PLAN_STORAGE_KEY);
  expect(errors).toHaveLength(1);
  expect(store.getItem(PLAN_STORAGE_KEY)).toBe("{broken");
  savePlans(store, changed); emit(PLAN_STORAGE_KEY);
  expect(live).toHaveLength(3);
  store.values.clear(); emit(null);
  expect(live.at(-1)).toEqual(emptyWorkPlans());
  expect(demo.at(-1)).toEqual(emptyWorkPlans());
  stopLive(); stopDemo();
  expect(listeners.size).toBe(0);
});

test("plan depolamasına erişilemezse abonelik hata bildirir ve yazmaz", () => {
  const errors: unknown[] = [];
  let received = false;
  const stop = subscribeWorkPlans("live", () => { received = true; }, error => errors.push(error), {
    storage: { getItem() { throw new Error("access denied"); }, setItem() { throw new Error("must not write"); } },
    events: { addEventListener() {}, removeEventListener() {} },
  });
  expect(received).toBe(false);
  expect(errors).toHaveLength(1);
  stop();
});

test("plan saatleri gün, hafta ve demo kapsamları arasında ayrılır; şablon ve süre düzenlemesi seçimi korur", () => {
  const week = "2026-10-12", other = "2026-10-19";
  const store = storage();
  let plans = changeWeekTime(emptyWorkPlans(), week, 3, { anchor: "entry", minute: 540 });
  plans = changeWeekTime(plans, week, 4, { anchor: "exit", minute: 1080 });
  plans = changeWeekTime(plans, other, 3, { anchor: "entry", minute: 480 });
  savePlans(workPlanStorage(store, "demo"), plans);
  expect(loadPlans(workPlanStorage(store, "live"))).toEqual(emptyWorkPlans());
  const loaded = loadPlans(workPlanStorage(store, "demo"));
  expect(resolveWeekTimes(loaded, week)).toEqual({ 3: { anchor: "entry", minute: 540 }, 4: { anchor: "exit", minute: 1080 } });
  expect(resolveWeekTimes(loaded, other)).toEqual({ 3: { anchor: "entry", minute: 480 } });
  expect(resolveWeekTimes(loaded, "2026-10-05")).toEqual({});
  const edited = changeWeekPlan(loaded, week, [480,480,480,420,480,0,0]);
  const updated = changeDefaultPlan(edited, [540,540,540,540,540,0,0], week);
  savePlans(workPlanStorage(store, "demo"), updated);
  expect(resolveWeekTimes(loadPlans(workPlanStorage(store, "demo")), week)).toEqual(resolveWeekTimes(loaded, week));
  const reset = changeWeekPlan(updated, week, null, [null,null,null,28800]);
  expect(resolveWeekTimes(reset, week)).toEqual({ 3: { anchor: "entry", minute: 540 } });
  expect(resolveWeekTimes(reset, other)).toEqual(resolveWeekTimes(loaded, other));
  expect(changeWeekTime(changeWeekTime(emptyWorkPlans(), week, 4, { anchor: "entry", minute: 0 }), week, 4, null)).toEqual(emptyWorkPlans());
});

test("geçersiz plan saatleri reddedilir ve özgün depolama korunur", () => {
  const week = "2026-10-12";
  for (const weekTimes of [null, [], { [week]: null }, { [week]: [] }, { [week]: { 5: { anchor: "entry", minute: 540 } } },
    ...[-1, 1440, 0.5, "540", null].map(minute => ({ [week]: { 0: { anchor: "entry", minute } } })),
    { [week]: { 0: { anchor: "other", minute: 540 } } }, { "2026-10-13": { 0: { anchor: "entry", minute: 540 } } }]) {
    const raw = JSON.stringify({ ...emptyWorkPlans(), weekTimes });
    const store = storage({ [PLAN_STORAGE_KEY]: raw });
    expect(() => loadPlans(store)).toThrow("plan saatleri");
    expect(store.getItem(PLAN_STORAGE_KEY)).toBe(raw);
  }
  expect(() => changeWeekTime(emptyWorkPlans(), week, 5, null)).toThrow();
  expect(() => changeWeekTime(emptyWorkPlans(), "2026-10-13", 0, { anchor: "entry", minute: 0 })).toThrow();
});

test("sıfır süreli açık günler doğrulanır; izinle çelişki reddedilir, gereksiz işaretler temizlenir", () => {
  const week = "2026-10-12";
  for (const weekZeroOpenDays of [null, [], { [week]: null }, { [week]: [4,4] }, { [week]: [5] },
    { [week]: [-1] }, { [week]: [0.5] }, { [week]: ["4"] }, { "2026-10-13": [4] }]) {
    const raw = JSON.stringify({ ...emptyWorkPlans(), weekZeroOpenDays });
    const store = storage({ [PLAN_STORAGE_KEY]: raw });
    expect(() => loadPlans(store)).toThrow("açık gün");
    expect(store.getItem(PLAN_STORAGE_KEY)).toBe(raw);
  }
  const conflict = JSON.stringify({ ...emptyWorkPlans(), weekZeroOpenDays: { [week]: [4] }, weekLeaves: { [week]: [4] } });
  expect(() => loadPlans(storage({ [PLAN_STORAGE_KEY]: conflict }))).toThrow("açık gün");
  for (const days of [[], [4]]) {
    const store = storage({ [PLAN_STORAGE_KEY]: JSON.stringify({ ...emptyWorkPlans(), weekZeroOpenDays: { [week]: days } }) });
    expect(loadPlans(store)).toEqual(emptyWorkPlans());
  }
});

test("v1 planı haftalık izin, açık gün ve kilitleri birlikte doğrulayıp normalize eder", () => {
  const week = "2026-10-12", lockedWeek = "2026-10-19", ordinaryWeek = "2026-10-26";
  const defaultPlan = readDayPlan([480, 480, 480, 480, 480, 0, 0])!;
  const specialPlan = readDayPlan([480, 480, 0, 480, 0, 0, 0])!;
  const input = {
    defaultPlan,
    weekOverrides: { [week]: specialPlan, [lockedWeek]: defaultPlan, [ordinaryWeek]: defaultPlan },
    weekTargets: { [week]: 144000 },
    weekLeaves: { [week]: [2] },
    weekZeroOpenDays: { [week]: [4, 3] },
    weekLockedDays: { [week]: [1], [lockedWeek]: [4] },
    weekTimes: { [week]: { 0: { anchor: "entry", minute: 540 } } },
    unused: "ignored",
  };
  expect(readStoredPlans(JSON.stringify(input))).toEqual({
    defaultPlan,
    weekOverrides: { [week]: specialPlan, [lockedWeek]: defaultPlan },
    weekTargets: { [week]: 144000 },
    weekLeaves: { [week]: [2] },
    weekZeroOpenDays: { [week]: [4] },
    weekLockedDays: { [week]: [1], [lockedWeek]: [4] },
    weekTimes: { [week]: { 0: { anchor: "entry", minute: 540 } } },
  });
});

test("çelişen v1 günleri ve plansız kilit reddedilir; özgün kayıt değiştirilmez", () => {
  const week = "2026-10-12";
  const override = { [week]: [480, 480, 480, 480, 0, 0, 0] };
  const cases = [
    { input: { weekOverrides: override, weekLeaves: { [week]: [4] }, weekZeroOpenDays: { [week]: [4] } }, error: "açık gün" },
    { input: { weekOverrides: override, weekLeaves: { [week]: [4] }, weekLockedDays: { [week]: [4] } }, error: "kilitli gün" },
    { input: { weekLockedDays: { [week]: [4] } }, error: "kilitli gün" },
  ];
  for (const { input, error } of cases) {
    const raw = JSON.stringify({ ...emptyWorkPlans(), ...input });
    const store = storage({ [PLAN_STORAGE_KEY]: raw });
    expect(() => loadPlans(store)).toThrow(error);
    expect(store.getItem(PLAN_STORAGE_KEY)).toBe(raw);
  }
});

test("izin günü ve izin öncesi hedef yeniden okunur; karşılık bir kez düşülür ve güncel şablonu izler", () => {
  const store = storage();
  const week = "2026-10-12";
  const completed = [32400,32400,31200,null,null,null,null];
  const plans = changeWeekPlan(emptyWorkPlans(), week, readDayPlan([480,480,480,480,0,0,0])!, completed, 115200, [4]);
  savePlans(store, plans);
  const loaded = loadPlans(store);
  expect(loaded).toEqual(plans);
  expect(loaded.weekTargets?.[week]).toBe(144000);
  expect(resolveStoredTarget(loaded, week)).toBe(115200);
  expect(resolveLeaveDays(loaded, week)).toEqual([4]);
  const changed = changeDefaultPlan(loaded, readDayPlan([540,540,540,540,540,0,0])!, week, completed);
  savePlans(store, changed);
  expect(resolveStoredTarget(loadPlans(store), week)).toBe(129600);
  expect(resolveStoredPlan(loadPlans(store), week)[4]).toBe(0);
  savePlans(store, changeWeekPlan(loadPlans(store), week, null, completed));
  const reset = loadPlans(store);
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
    expect(() => loadPlans(store)).toThrow("izin");
    expect(store.getItem(PLAN_STORAGE_KEY)).toBe(raw);
  }
  expect(loadPlans(storage({ [PLAN_STORAGE_KEY]: JSON.stringify({ ...emptyWorkPlans(), weekLeaves: { [week]: [] } }) })))
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
  const loaded = loadPlans(store);
  expect(resolveStoredTarget(loaded, week)).toBe(162000);
  expect(resolveWeekPlan(source, resolveStoredPlan(loaded, week), "2026-10-15", false, resolveStoredTarget(loaded, week)).displaySeconds)
    .toEqual([32400,32400,31200,32400,33600,0,0]);
  savePlans(store, changeDefaultPlan(loaded, readDayPlan([600,600,600,600,600,0,0])!, week, completed));
  const reloaded = loadPlans(store);
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
  const loaded = loadPlans(store);
  expect(resolveStoredTarget(loaded, week)).toBe(144000);
  expect(Math.round(resolveStoredPlan(loaded, week)[3] * 60)).toBe(53383);
  const edited = readWeekPlan([480,480,390,(53383 - 1800) / 60,0,0,0])!;
  expect(resolveStoredTarget(changeWeekPlan(loaded, week, edited), week)).toBe(142200);
  const reset = changeWeekPlan(loaded, week, null, [28800,28800,33000,null,null,null,null]);
  expect(resolveStoredTarget(reset, week)).toBe(144000);
  expect(reset.weekTargets).toEqual({ [week]: 144000 });
  savePlans(store, reset);
  expect(resolveStoredTarget(loadPlans(store), week)).toBe(144000);
  expect(resolveStoredPlan(loadPlans(store), week)).toEqual([480,480,390,480,480,0,0]);
  const template = changeDefaultPlan(loaded, readDayPlan([420,420,420,420,420,0,0])!, week, [28800,28800,33000,null,null,null,null]);
  expect(resolveStoredTarget(template, week)).toBe(144000);
  for (const weekTargets of [[], null, { [week]: -1 }, { [week]: 0.5 }, { "2026-10-13": 144000 }]) {
    expect(() => loadPlans(storage({ [PLAN_STORAGE_KEY]: JSON.stringify({ ...emptyWorkPlans(), weekTargets }) }))).toThrow();
  }
  expect(() => loadPlans(storage({ [PLAN_STORAGE_KEY]: JSON.stringify({ defaultPlan: next, weekOverrides: {} }) }))).toThrow();
});
test("demo planı ayrı saklanır; iki kapsam kendi planını yeniden okur", () => {
  const store = storage();
  const live = workPlanStorage(store, "live");
  const demo = workPlanStorage(store, "demo");
  const week = "2026-10-12";
  const livePlan = readDayPlan([480, 480, 480, 480, 480, 0, 0])!;
  const demoPlan = readDayPlan([420, 420, 420, 420, 420, 0, 0])!;
  savePlans(live, changeWeekPlan(emptyWorkPlans(), week, livePlan));
  expect(loadPlans(demo)).toEqual(emptyWorkPlans());
  savePlans(demo, changeWeekPlan(emptyWorkPlans(), week, demoPlan));
  expect(resolveStoredPlan(loadPlans(live), week)).toEqual([480, 480, 480, 480, 480, 0, 0]);
  expect(resolveStoredPlan(loadPlans(demo), week)).toEqual([420, 420, 420, 420, 420, 0, 0]);
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
  const previous = JSON.stringify({ ...emptyWorkPlans(), defaultPlan: [420, 420, 420, 420, 420, 0, 0] });
  const store = storage({
    "pofis:preferences:v1": original,
    "pdks.mesai-plans.v1": oldPlans,
    "pofis:work-plans:v2": previous,
  });
  expect(loadPlans(store)).toEqual(emptyWorkPlans());
  expect(store.getItem("pofis:preferences:v1")).toBe(original);
  expect(store.getItem("pdks.mesai-plans.v1")).toBe(oldPlans);
  expect(store.getItem("pofis:work-plans:v2")).toBe(previous);
});

test("güncel plan tek v1 anahtarına yazılır ve aynı şemayla yeniden okunur", () => {
  expect(PLAN_STORAGE_KEY).toBe("pofis:work-plans:v1");
  const store = storage();
  const plans = changeDefaultPlan(emptyWorkPlans(), readDayPlan([420, 420, 420, 420, 420, 0, 0])!);
  savePlans(store, plans);
  expect([...store.values.keys()]).toEqual(["pofis:work-plans:v1"]);
  expect(JSON.parse(store.getItem(PLAN_STORAGE_KEY)!)).toEqual(plans);
  expect(loadPlans(store)).toEqual(plans);
});

test("varsayılan ve özel dağılım yeniden okunur; geçmiş hafta mirası ve sıfırlama korunur", () => {
  const store = storage();
  const defaultPlan = readDayPlan([480, 480, 480, 480, 0, 0, 0])!;
  let plans = changeDefaultPlan(emptyWorkPlans(), defaultPlan);
  plans = changeWeekPlan(plans, "2026-10-12", readDayPlan([450, 480, 510, 480, 0, 0, 0])!);
  savePlans(store, plans);
  expect(resolveStoredPlan(loadPlans(store), "2026-10-05")).toEqual(defaultPlan);
  expect(loadPlans(store).weekOverrides["2026-10-12"]).toEqual([450, 480, 510, 480, 0, 0, 0]);
  savePlans(store, changeWeekPlan(loadPlans(store), "2026-10-12", null));
  expect(loadPlans(store).weekOverrides).toEqual({});
});

test("geçersiz güncel şema hata verir; bozuk kaydı varsayılan başarı gibi sunmaz", () => {
  for (const raw of ["{", "null", JSON.stringify({ "2026-10-12": { weekdays: [0], hours: 8 } }),
    JSON.stringify({ defaultPlan: [480], weekOverrides: {} }),
    JSON.stringify({ ...emptyWorkPlans(), weekOverrides: { "2026-10-13": [480, 480, 480, 480, 480, 0, 0] } })]) {
    const store = storage({ [PLAN_STORAGE_KEY]: raw });
    expect(() => loadPlans(store)).toThrow();
    expect(store.getItem(PLAN_STORAGE_KEY)).toBe(raw);
  }
});

test("yazma hatası önceki depolama içeriğini korur", () => {
  const store = storage();
  const previous = emptyWorkPlans();
  savePlans(store, previous);
  const before = store.getItem(PLAN_STORAGE_KEY);
  store.setItem = () => { throw new Error("quota"); };
  expect(() => savePlans(store,
    changeDefaultPlan(emptyWorkPlans(), readDayPlan([420, 420, 420, 420, 420, 0, 0])!))).toThrow("quota");
  expect(store.getItem(PLAN_STORAGE_KEY)).toBe(before);
  expect(loadPlans(store)).toEqual(previous);
});
