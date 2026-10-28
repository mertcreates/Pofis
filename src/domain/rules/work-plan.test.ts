import { expect, test } from "bun:test";
import {
  DEFAULT_WORK_PLAN, readDayPlan, resolveWeekPlan as resolvePlan, weeklyTarget, completeWeekPlan, resolveStoredTarget,
  emptyWorkPlans, changeDefaultPlan, changeWeekPlan, resolveStoredPlan, setDayMinutes,
  completedDaySeconds, editRequiredMinutes,
} from "./work-plan";
import type { DayState } from "./record-status";
import type { WorkPlan } from "./work-plan";

// Geri dönüş sözleşmesi: mevcut dağıtım senaryoları azaltma açıkken doğrulanır.
function resolveWeekPlan(...args: Parameters<typeof resolvePlan>) {
  return resolvePlan(args[0], args[1], args[2], args[3], args[4], args[5], true);
}

test("Sıfırla 9×5 şablonunun 45 saatini esas alır; kilitli eski planlar ve gerçekleşenler korunur", () => {
  const week = "2026-10-12";
  const source = days([9,9,8,null,null,null,null]);
  source[2].recordedSeconds = 8 * 3600 + 40 * 60;
  const completed = completedDaySeconds(source, week, "2026-10-15");
  const template = readDayPlan([540,540,540,540,540,0,0])!;
  const previous = changeWeekPlan({ defaultPlan: template, weekOverrides: {} }, week,
    readDayPlan([480,480,480,540,540,0,0])!, [], 42 * 3600);
  const before = resolveWeekPlan(source, resolveStoredPlan(previous, week), "2026-10-15", false, resolveStoredTarget(previous, week));
  expect(before.displaySeconds.slice(3,5)).toEqual([9 * 3600, 6 * 3600 + 20 * 60]);
  const reset = changeWeekPlan(previous, week, null, completed);
  expect(resolveStoredTarget(reset, week)).toBe(45 * 3600);
  expect(resolveStoredPlan(reset, week)).toEqual([480,480,480,540,540,0,0]);
  const after = resolveWeekPlan(source, resolveStoredPlan(reset, week), "2026-10-15", false, resolveStoredTarget(reset, week));
  expect(after.displaySeconds.slice(0,3)).toEqual(before.displaySeconds.slice(0,3));
  expect(after.displaySeconds.slice(3,5)).toEqual([9 * 3600, 9 * 3600 + 20 * 60]);
  expect(after.projectedWeeklySeconds).toBe(45 * 3600);
  expect(after.unallocatedSeconds).toBe(0);
  expect(reset.defaultPlan).toEqual(template);
  expect(changeWeekPlan(reset, week, null, completed)).toEqual(reset);
});

test("özel plan yokken varsayılan değişikliği açık günleri ve haftalık hedefi birlikte günceller", () => {
  const week = "2026-10-12";
  const source = days([9,9,8,null,null,null,null]);
  source[2].recordedSeconds = 8 * 3600 + 40 * 60 + 17;
  const completed = completedDaySeconds(source, week, "2026-10-15");
  const initial = emptyWorkPlans();
  const template = readDayPlan([540,540,540,540,540,0,0])!;
  const changed = changeDefaultPlan(initial, template, week, completed);
  expect(resolveStoredPlan(changed, week)).toEqual([480,480,480,540,540,0,0]);
  expect(resolveStoredTarget(changed, week)).toBe(45 * 3600);
  const result = resolveWeekPlan(source, resolveStoredPlan(changed, week), "2026-10-15", false, resolveStoredTarget(changed, week));
  expect(result.displaySeconds).toEqual([32400,32400,31217,32400,33583,0,0]);
  expect(result.projectedWeeklySeconds).toBe(45 * 3600);
  expect(result.unallocatedSeconds).toBe(0);
  expect(result.completed).toEqual(completed);
  expect(changeWeekPlan(changed, week, null, completed)).toEqual(changed);
  expect(initial).toEqual(emptyWorkPlans());
});

test("otomatik kilit koruması sonraki şablonu da izler; eski şablona dönüş fazladan kayıt bırakmaz", () => {
  const week = "2026-10-12";
  const completed = [32400,32400,31200,null,null,null,null];
  const nine = readDayPlan([540,540,540,540,540,0,0])!;
  const ten = readDayPlan([600,600,600,600,600,0,0])!;
  const first = changeDefaultPlan(emptyWorkPlans(), nine, week, completed);
  const second = changeDefaultPlan(first, ten, week, completed);
  expect(resolveStoredPlan(second, week)).toEqual([480,480,480,600,600,0,0]);
  expect(resolveStoredTarget(second, week)).toBe(50 * 3600);
  expect(changeDefaultPlan(second, ten, week, completed)).toEqual(second);
  expect(changeDefaultPlan(second, DEFAULT_WORK_PLAN, week, completed)).toEqual(emptyWorkPlans());
});

test.each([
  { name: "kilit yok", completed: [], template: [540,540,540,540,540,0,0], expected: [540,540,540,540,540,0,0], target: 45 },
  { name: "yalnız kilitli günün şablonu değişti", completed: [28800], template: [540,480,480,480,480,0,0], expected: [480,480,480,480,480,0,0], target: 41 },
  { name: "sıfır süreli tamamlanan gün", completed: [0], template: [540,540,540,540,540,0,0], expected: [480,540,540,540,540,0,0], target: 45 },
  { name: "yeni şablon Cuma'yı kapatıyor", completed: [32400,32400,31200], template: [540,540,540,540,0,0,0], expected: [480,480,480,540,0,0,0], target: 36 },
])("şablon mirası: $name", ({ completed, template, expected, target }) => {
  const week = "2026-10-12";
  const changed = changeDefaultPlan(emptyWorkPlans(), readDayPlan(template)!, week, completed);
  expect(resolveStoredPlan(changed, week)).toEqual(expected);
  expect(resolveStoredTarget(changed, week)).toBe(target * 3600);
});

test.each([
  { name: "16 saat kapasitesi", template: [960,960,960,960,960,0,0], remaining: [57600,57600], target: 288000, balance: 76800 },
  { name: "gerçekleşen yeni toplamı aşmış", template: [240,240,240,240,240,0,0], remaining: [0,0], target: 72000, balance: -24000 },
  { name: "bütün günler kapalı", template: [0,0,0,0,0,0,0], remaining: [0,0], target: 0, balance: -96000 },
  { name: "Cuma kapalı; devir Perşembeye", template: [540,540,540,540,0,0,0], remaining: [33600,0], target: 129600, balance: 0 },
])("şablon değişiminde sınırlar: $name", ({ template, remaining, target, balance }) => {
  const week = "2026-10-12";
  const source = days([9,9,8,null,null,null,null]);
  source[2].recordedSeconds = 31200;
  const changed = changeDefaultPlan(emptyWorkPlans(), readDayPlan(template)!, week,
    completedDaySeconds(source, week, "2026-10-15"));
  const result = resolveWeekPlan(source, resolveStoredPlan(changed, week), "2026-10-15", false, resolveStoredTarget(changed, week));
  expect(result.weeklySeconds).toBe(target);
  expect(result.displaySeconds.slice(0,3)).toEqual([32400,32400,31200]);
  expect(result.displaySeconds.slice(3,5)).toEqual([...remaining]);
  expect(result.unallocatedSeconds).toBe(balance);
  expect(result.projectedWeeklySeconds + result.unallocatedSeconds).toBe(target);
});

test("tüm günler tamamlandıysa yeni şablon hedefi alınır; gerçekleşenler yeniden dağıtılmaz", () => {
  const week = "2026-10-12";
  const source = days([8,8,8,8,8,null,null]);
  const changed = changeDefaultPlan(emptyWorkPlans(), readDayPlan([540,540,540,540,540,0,0])!, week,
    completedDaySeconds(source, week, "2026-10-17"));
  const result = resolveWeekPlan(source, resolveStoredPlan(changed, week), "2026-10-17", false, resolveStoredTarget(changed, week));
  expect(result.weeklySeconds).toBe(162000);
  expect(result.displaySeconds).toEqual([28800,28800,28800,28800,28800,0,0]);
  expect(result.eligible).toEqual(Array(7).fill(false));
  expect(result.unallocatedSeconds).toBe(18000);
});

test.each([
  { minutes: [480,480,480,240,480,0,0], target: 129600 },
  { minutes: [480,480,480,480,0,0,0], target: 115200 },
  { minutes: [480,480,480,450,510,0,0], target: 144000 },
])("özel kalan gün dağılımı yeni şablondan korunur: $minutes", ({ minutes, target }) => {
  const week = "2026-10-12";
  const plan = readDayPlan(minutes)!;
  const initial = changeWeekPlan(emptyWorkPlans(), week, plan);
  const changed = changeDefaultPlan(initial, readDayPlan([540,540,540,540,540,0,0])!, week, [28800,28800,28800]);
  expect(resolveStoredPlan(changed, week)).toEqual(plan);
  expect(resolveStoredTarget(changed, week)).toBe(target);
});

test("yalnız bağımsız haftalık hedef varsa özel hafta planı ve hedefi korunur", () => {
  const week = "2026-10-12";
  const initial = changeWeekPlan(emptyWorkPlans(), week, DEFAULT_WORK_PLAN, [], 39 * 3600);
  expect(initial.weekOverrides).toEqual({});
  const template = readDayPlan([540,540,540,540,540,0,0])!;
  const changed = changeDefaultPlan(initial, template, week, [28800,28800,28800]);
  expect(resolveStoredPlan(changed, week)).toEqual(DEFAULT_WORK_PLAN);
  expect(resolveStoredTarget(changed, week)).toBe(39 * 3600);
  expect(changed.defaultPlan).toEqual(template);
  expect(changeWeekPlan(changed, week, null, [28800,28800,28800]).weekTargets?.[week]).toBe(45 * 3600);
});

test("tamamla uygun günleri seçilen yönteme göre dağıtır", () => {
  const plan = readDayPlan([480,480,240,480,480,0,0])!;
  const resolved = resolveWeekPlan(days([8,8,null,null,null,null,null]), plan, "2026-10-14");
  expect(completeWeekPlan(plan, DEFAULT_WORK_PLAN, resolved, "equal"))
    .toEqual([480,480,330,570,540,0,0]);
  expect(completeWeekPlan(plan, DEFAULT_WORK_PLAN, resolved, "last"))
    .toEqual([480,480,240,480,720,0,0]);
  expect(plan).toEqual([480,480,240,480,480,0,0]);
});

test.each(["equal", "last"] as const)("tek açık Cuma %s ile 8 saatten 9:59'a tamamlanır; yeniden hesapta 40 saat kalır", mode => {
  const source = days([7.5,7.5,7.5,7.5 + 1/60,null,null,null]);
  const target = 38 * 3600 + 60;
  const resolved = resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-10-16", false, target);
  expect(resolved.displaySeconds[4]).toBe(8 * 3600);
  const next = completeWeekPlan(DEFAULT_WORK_PLAN, DEFAULT_WORK_PLAN, resolved, mode)!;
  expect(next.slice(0,4)).toEqual([480,480,480,480]);
  expect(Math.round(next[4] * 60)).toBe(9 * 3600 + 59 * 60);
  const after = resolveWeekPlan(source, next, "2026-10-16", false, 144000);
  expect(after.projectedWeeklySeconds).toBe(144000);
  expect(after.displaySeconds[4]).toBe(9 * 3600 + 59 * 60);
});

test("Tamamla eski baz yerine gereken kapasiteyi kullanır: Perşembe 5:20 → 14:50", () => {
  const plan = readDayPlan([480,480,390,480,0,0,0])!;
  const source = days([8,8,9 + 1/6,null,null,null,null]);
  const resolved = resolveWeekPlan(source, plan, "2026-10-15");
  expect(resolved.displaySeconds[3]).toBe(5 * 3600 + 20 * 60);
  const next = completeWeekPlan(plan, DEFAULT_WORK_PLAN, resolved, "last")!;
  expect(next).toEqual([480,480,390,890,0,0,0]);
  const saved = changeWeekPlan({ ...emptyWorkPlans(), weekOverrides: { "2026-10-12": plan } }, "2026-10-12", next, resolved.completed, 144000);
  expect(resolveStoredTarget(saved, "2026-10-12")).toBe(144000);
  for (let i = 0; i < 2; i++) {
    const after = resolveWeekPlan(source, resolveStoredPlan(saved, "2026-10-12"), "2026-10-15", false, resolveStoredTarget(saved, "2026-10-12"));
    expect(after.targets[3]).toBe(53400);
    expect(after.projectedWeeklySeconds).toBe(144000);
    expect(after.unallocatedSeconds).toBe(0);
  }
  expect(completeWeekPlan(plan, DEFAULT_WORK_PLAN, resolved, "equal")).toEqual(next);
});

test("Tamamla saniyeli gerekeni saklar; kapasite yetmezse kısmi kayıt üretmez", () => {
  const plan = readDayPlan([480,480,390,480,0,0,0])!;
  const source = days([8,8,9 + 1/6,null,null,null,null]);
  source[0].recordedSeconds! += 17;
  const resolved = resolveWeekPlan(source, plan, "2026-10-15");
  const next = completeWeekPlan(plan, DEFAULT_WORK_PLAN, resolved, "last")!;
  expect(Math.round(next[3] * 60)).toBe(53383);
  const after = resolveWeekPlan(source, next, "2026-10-15", false, 144000);
  expect(after.projectedWeeklySeconds).toBe(144000);
  expect(after.targets[3]).toBe(53383);
  source[2].recordedSeconds = 0;
  expect(completeWeekPlan(plan, DEFAULT_WORK_PLAN, resolveWeekPlan(source, plan, "2026-10-15"), "last")).toBeNull();
});

test("tamamla fazlayı uygun günlerden seçilen yönteme göre azaltır", () => {
  const surplus = readDayPlan([480,480,720,480,480,0,0])!;
  const resolved = resolveWeekPlan(days([8,8,null,null,null,null,null]), surplus, "2026-10-14");
  expect(completeWeekPlan(surplus, DEFAULT_WORK_PLAN, resolved, "equal"))
    .toEqual([480,480,630,390,420,0,0]);
  expect(completeWeekPlan(surplus, DEFAULT_WORK_PLAN, resolved, "last"))
    .toEqual([480,480,720,480,240,0,0]);
});

test("41:09:17 hedefi son güne dağıtımla azaltılırken fazla Cuma'dan düşer", () => {
  const source = days([8,8,8,null,null,null,null]);
  source[0].recordedSeconds = 8 * 3600 + 3 * 60 + 31;
  source[1].recordedSeconds = 8 * 3600 + 42 * 60 + 29;
  source[2].recordedSeconds = 8 * 3600 + 23 * 60 + 17;
  const targetSeconds = 41 * 3600 + 9 * 60 + 17;
  const resolved = resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-10-15", false, targetSeconds);
  expect(resolved.displaySeconds.slice(3,5)).toEqual([28800,28800]);
  const next = completeWeekPlan(DEFAULT_WORK_PLAN, DEFAULT_WORK_PLAN, resolved, "last")!;
  expect(next[3]).toBe(480);
  expect(Math.round(next[4] * 60)).toBe(6 * 3600 + 50 * 60 + 43);
  const after = resolveWeekPlan(source, next, "2026-10-15", false, 144000);
  expect(after.projectedWeeklySeconds).toBe(144000);
  expect(after.displaySeconds.slice(0,3)).toEqual(resolved.displaySeconds.slice(0,3));
});

test("azaltma Cuma sıfıra indiğinde Perşembeye geçer; kapalı günleri ve kilitleri atlar", () => {
  const plan = readDayPlan([480,480,480,480,60,0,0])!;
  const source = days([12,12,10,null,null,null,null]);
  const resolved = resolveWeekPlan(source, plan, "2026-10-15", false, 45 * 3600);
  const next = completeWeekPlan(plan, DEFAULT_WORK_PLAN, resolved, "last")!;
  expect(next).toEqual([480,480,480,360,0,0,0]);
  expect(resolveWeekPlan(source, next, "2026-10-15", false, 144000).projectedWeeklySeconds).toBe(144000);
  const closed = readDayPlan([480,480,480,600,0,0,0])!;
  const closedResolved = resolveWeekPlan(source, closed, "2026-10-15", false, 44 * 3600);
  expect(completeWeekPlan(closed, DEFAULT_WORK_PLAN, closedResolved, "last"))
    .toEqual([480,480,480,360,0,0,0]);
});

test("gereken süre doğrudan düzenlenir: 4:50 → 5:00 haftalık hedefe yalnız 10 dakika ekler", () => {
  const plan = readDayPlan([480,480,480,480,450,0,0])!;
  const source = days([9,9,8,null,null,null,null]);
  source[2].recordedSeconds = 31200;
  const resolved = resolveWeekPlan(source, plan, "2026-10-15");
  expect(resolved.displaySeconds[4]).toBe(17400);
  const next = editRequiredMinutes(plan, resolved, [{ day: 4, minutes: 300 }]);
  expect(next.targetSeconds).toBe(40 * 3600 - 20 * 60);
  expect(next.plan).toEqual([480,480,480,480,300,0,0]);
  const saved = changeWeekPlan({ ...emptyWorkPlans(), weekOverrides: { "2026-10-12": plan } }, "2026-10-12", next.plan, resolved.completed, next.targetSeconds);
  const after = resolveWeekPlan(source, resolveStoredPlan(saved, "2026-10-12"), "2026-10-15", false, resolveStoredTarget(saved, "2026-10-12"));
  expect(after.displaySeconds).toEqual([32400,32400,31200,28800,18000,0,0]);
  expect(after.projectedWeeklySeconds).toBe(next.targetSeconds);
  const again = editRequiredMinutes(next.plan, after, [{ day: 4, minutes: 300 }]);
  expect(again).toEqual(next);
  const thursdayCompleted = source.map((day, index) => index === 3 ? { ...day, state: "recorded" as const, recordedSeconds: 9 * 3600 } : day);
  expect(resolveWeekPlan(thursdayCompleted, next.plan, "2026-10-16", false, next.targetSeconds).displaySeconds[4]).toBe(4 * 3600);
});

test("gereken süre toplu uygulanır; kilitler korunur, devir ikinci kez düşülmez", () => {
  const source = days([9,9,8,null,null,null,null]);
  source[2].recordedSeconds = 31200;
  const resolved = resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-10-15");
  const next = editRequiredMinutes(DEFAULT_WORK_PLAN, resolved, [{ day: 3, minutes: 300 }, { day: 4, minutes: 300 }]);
  const after = resolveWeekPlan(source, next.plan, "2026-10-15", false, next.targetSeconds);
  expect(after.displaySeconds.slice(3, 5)).toEqual([18000,18000]);
  expect(next.targetSeconds).toBe(36 * 3600 + 40 * 60);
  expect(() => editRequiredMinutes(DEFAULT_WORK_PLAN, resolved, [{ day: 0, minutes: 300 }])).toThrow("Tamamlanan");
  expect(() => editRequiredMinutes(DEFAULT_WORK_PLAN, resolved, [{ day: 4, minutes: 961 }])).toThrow();
  const closed = editRequiredMinutes(DEFAULT_WORK_PLAN, resolved, [{ day: 4, minutes: 0 }]);
  const closedResolved = resolveWeekPlan(source, closed.plan, "2026-10-15", false, closed.targetSeconds);
  expect(closedResolved.displaySeconds[4]).toBe(0);
  expect(closedResolved.displaySeconds[3]).toBe(5 * 3600 + 20 * 60);
  const reopened = editRequiredMinutes(closed.plan, closedResolved, [{ day: 4, minutes: 240 }], DEFAULT_WORK_PLAN, closed.leaveDays);
  expect(resolveWeekPlan(source, reopened.plan, "2026-10-15", false, reopened.targetSeconds).displaySeconds[4]).toBe(4 * 3600);
});

function days(hours: readonly (number | null)[] = [8, 8, 8, 8, null, null, null]) {
  return hours.map((hours, day) => ({
    date: `2026-10-${12 + day}`,
    state: (hours === null ? day < 4 ? "missing" : "awaiting-entry" : "recorded") as DayState,
    recordedSeconds: hours === null ? null : hours * 3600,
  }));
}

test("ara günler sabit kalır; +30 ve +15 dakika yalnız Cuma hedefini 7 sa 15 dk yapar", () => {
  const source = days([8.5, 8.25, 8, 8, null, null, null]);
  const result = resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-10-16");
  expect(result.targets).toEqual([28800, 28800, 28800, 28800, 26100, 0, 0]);
  expect(result.exitGoal).toBe(26100);
  expect(DEFAULT_WORK_PLAN).toEqual([480, 480, 480, 480, 480, 0, 0]);
  for (const [date, index] of [["2026-10-14", 2], ["2026-10-15", 3]] as const) {
    expect(resolveWeekPlan(source, DEFAULT_WORK_PLAN, date).exitGoal).toBe(28800);
    expect(result.targets[index]).toBe(28800);
  }
});

test("Cuma kapalıysa hedef 32 saat, dengeleme Perşembe; sonraki kayıtlar Perşembeyi değiştirmez", () => {
  const plan = readDayPlan([480, 480, 480, 480, 0, 0, 0])!;
  const result = resolveWeekPlan(days([8.5, 8.25, 8, null, 10, null, null]), plan, "2026-10-15");
  expect(result.weeklySeconds).toBe(115200);
  expect(result.eligible).toEqual([false, false, false, true, false, false, false]);
  expect(result.exitGoal).toBe(26100);
  expect(result.displaySeconds).toEqual([30600, 29700, 28800, 26100, 0, 0, 0]);
});

test.each(["missing", "uncertain"] as const)("geçmiş %s gün bilinen süre sınırına göre hesaplanır", state => {
  const source = days([8.5, 0, 8, 8, null, null, null]);
  source[1].state = state;
  source[1].recordedSeconds = state === "missing" ? null : 7200;
  const result = resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-10-16");
  expect(result.exitGoal).toBe(state === "missing" ? 27000 : 48600);
  expect(result.blocked).toBe(true);
});

test("geçerli eksi süre son güne eklenir; sıfır süreli tamamlanmış kayıt da geçerlidir", () => {
  expect(resolveWeekPlan(days([7, 8, 8, 8, null, null, null]), DEFAULT_WORK_PLAN, "2026-10-16").exitGoal).toBe(32400);
  expect(resolveWeekPlan(days([0, 0, 0, 0, null, null, null]), DEFAULT_WORK_PLAN, "2026-10-16").exitGoal).toBe(57600);
});

test("tamamlanmış gün farkı özgün haftalık plandan gelir; hafta sonu hedefi sıfırdır", () => {
  const plan = readDayPlan([480, 0, 480, 480, 480, 0, 0])!;
  expect(resolveWeekPlan(days([8, 1, 8, 8, null, null, null]), plan, "2026-10-16").exitGoal).toBe(25200);
  const source = days([8, null, null, null, null, 2, null]);
  const weekend = resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-10-18");
  expect(weekend.exitGoal).toBeNull();
  expect(weekend.targets.slice(5)).toEqual([0, 0]);
  expect(weekend.projectedWeeklySeconds).toBe(42 * 3600);
  expect(weekend.weeklySeconds).toBe(40 * 3600);
  expect(weekend.unallocatedSeconds).toBe(-2 * 3600);
});

test("tek kalan güne devir uygulanır; tamamlanan günün özgün hedefi korunur", () => {
  const source = days([10, 10, 10, 10, null, null, null]);
  expect(resolveWeekPlan(source, readDayPlan([0, 0, 0, 0, 480, 0, 0])!, "2026-10-16").exitGoal).toBe(0);
  const result = resolveWeekPlan(source, readDayPlan([0, 0, 0, 0, 0, 0, 0])!, "2026-10-16");
  expect(result.eligible).toEqual(Array(7).fill(false));
  expect(result.exitGoal).toBeNull();
  expect(result.weeklySeconds).toBe(0);
  expect(result.targets).toEqual([0, 0, 0, 0, 0, 0, 0]);
  expect(result.unallocatedSeconds).toBe(-144000);
  expect(resolveWeekPlan([], readDayPlan([0, 0, 0, 0, 0, 0, 0])!, "2026-10-16").weeklySeconds).toBe(0);
});

test("devir yalnız aynı haftanın geçmiş tamamlanmış kayıtlarından gelir", () => {
  const source = days([8.5, 8.25, 8, 8, null, null, null]);
  source.push({ date: "2026-10-09", state: "recorded", recordedSeconds: 86400 });
  expect(resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-10-14").targets[4]).toBe(26100);
  source[1].state = "open";
  expect(resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-10-16").exitGoal).toBe(27000);
});

test("bugünkü belirsizlik ve kısmi rapor çıkış hedefini engeller; gelecekteki kayıt devre girmez", () => {
  const source = days([8.5, 12, 8, 8, null, null, null]);
  expect(resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-10-12").targets[4]).toBe(28800);
  source[4].state = "uncertain";
  expect(resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-10-16").exitGoal).toBeNull();
  const partial = resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-10-16", true);
  expect(partial.targets[4]).toBe(28800);
  expect(partial.exitGoal).toBeNull();
});

test("özel hafta tam eşitlikte kaldırılır; yalnız toplam eşitliği kaldırmaz; sıfırlama mirasa döner", () => {
  const custom = readDayPlan([450, 510, 480, 480, 480, 0, 0])!;
  const state = changeWeekPlan(emptyWorkPlans(), "2026-10-12", custom);
  expect(state.weekOverrides["2026-10-12"]).toEqual(custom);
  expect(changeWeekPlan(state, "2026-10-12", DEFAULT_WORK_PLAN).weekOverrides).toEqual({});
  expect(changeWeekPlan(state, "2026-10-12", null).weekOverrides).toEqual({});
  expect(state.weekOverrides["2026-10-12"]).toEqual(custom);
});

test("varsayılan değişince geçmiş miras da değişir; diğer özel haftalar korunur; eşit özel hafta temizlenir", () => {
  const custom = readDayPlan([450, 510, 480, 480, 480, 0, 0])!;
  const initial = changeWeekPlan(emptyWorkPlans(), "2026-10-12", custom);
  const changed = changeDefaultPlan(initial, readDayPlan([420, 420, 420, 420, 420, 0, 0])!);
  expect(resolveStoredPlan(changed, "2026-10-05")).toEqual([420, 420, 420, 420, 420, 0, 0]);
  expect(resolveStoredPlan(changed, "2026-10-12")).toEqual(custom);
  expect(changeDefaultPlan(initial, custom).weekOverrides).toEqual({});
});

function completeWithoutRecords(plan: WorkPlan, defaultPlan: WorkPlan, mode: "equal" | "last") {
  const source = days([null,null,null,null,null,null,null]).map(day => ({ ...day, state: "awaiting-entry" as const }));
  return completeWeekPlan(plan, defaultPlan, resolveWeekPlan(source, plan, "2026-10-12"), mode);
}

test("eşit dağıtımda yarım saatlik fark önce Pazartesiye gider", () => {
  const plan = readDayPlan([480, 480, 450, 480, 480, 0, 0])!;
  expect(completeWithoutRecords(plan, DEFAULT_WORK_PLAN, "equal")).toEqual([510, 480, 450, 480, 480, 0, 0]);
  expect(plan).toEqual([480, 480, 450, 480, 480, 0, 0]);
});

test("tamamla eksik toplamı turlarla ekler, fazla toplamı son günden azaltır; kapalı günleri açmaz", () => {
  const shorter = readDayPlan([480, 480, 480, 480, 0, 0, 0])!;
  const result = completeWithoutRecords(shorter, DEFAULT_WORK_PLAN, "equal")!;
  expect(result).toEqual([600, 600, 600, 600, 0, 0, 0]);
  expect(weeklyTarget(result)).toBe(144000);
  expect(completeWithoutRecords(readDayPlan([600, 600, 480, 480, 480, 0, 0])!, DEFAULT_WORK_PLAN, "last"))
    .toEqual([600, 600, 480, 480, 240, 0, 0]);
});

test("tek açık gün varsa ona dağıtır; kapasite yetmezse kısmi sonuç kaydetmez", () => {
  const one = readDayPlan([480, 0, 0, 0, 0, 0, 0])!;
  const target = readDayPlan([600, 0, 0, 0, 0, 0, 0])!;
  for (const mode of ["equal", "last"] as const) {
    expect(completeWithoutRecords(one, target, mode)).toEqual(target);
    expect(completeWithoutRecords(one, DEFAULT_WORK_PLAN, mode)).toBeNull();
    expect(completeWithoutRecords(readDayPlan([0, 0, 0, 0, 0, 0, 0])!, DEFAULT_WORK_PLAN, mode)).toBeNull();
    expect(completeWithoutRecords(readDayPlan([960, 450, 0, 0, 0, 0, 0])!, DEFAULT_WORK_PLAN, mode)).toBeNull();
  }
});

test("girdi yedi gün, tam dakika ve 0–16 saat aralığıyla doğrulanır", () => {
  for (const input of [[], [480], Array(7), [NaN, 0, 0, 0, 0, 0, 0], [Infinity, 0, 0, 0, 0, 0, 0],
    [15.5, 0, 0, 0, 0, 0, 0], [-30, 0, 0, 0, 0, 0, 0], [990, 0, 0, 0, 0, 0, 0], ["480", 0, 0, 0, 0, 0, 0]]) {
    expect(readDayPlan(input)).toBeNull();
  }
  expect(readDayPlan([960, 0, 0, 0, 0, 0, 0])).toEqual([960, 0, 0, 0, 0, 0, 0]);
  expect(readDayPlan([493, 0, 0, 0, 0, 0, 0])).toEqual([493, 0, 0, 0, 0, 0, 0]);
  expect(weeklyTarget(readDayPlan([0, 0, 0, 0, 0, 0, 0])!)).toBe(0);
  expect(setDayMinutes(DEFAULT_WORK_PLAN, 4, 0)).toEqual([480, 480, 480, 480, 0, 0, 0]);
  expect(() => setDayMinutes(DEFAULT_WORK_PLAN, 7, 480)).toThrow();
  expect(() => setDayMinutes(DEFAULT_WORK_PLAN, 5, 480)).toThrow();
  expect(() => setDayMinutes(DEFAULT_WORK_PLAN, 6, 480)).toThrow();
  expect(readDayPlan([480,480,480,480,480,30,0])).toBeNull();
  expect(readDayPlan([480,480,480,480,480,0,30])).toBeNull();
  expect(() => setDayMinutes(DEFAULT_WORK_PLAN, 4, 970)).toThrow();
  expect(() => changeWeekPlan(emptyWorkPlans(), "2026-10-13", DEFAULT_WORK_PLAN)).toThrow();
});

test("kilitli kayıtlar saniyeleriyle görünür, fark özgün plandan gelir ve haftalık hedef iki kez artmaz", () => {
  const source = days([8.5, 8.25, 8, 8, null, null, null]);
  source[0].recordedSeconds! += 17;
  const custom = readDayPlan([240, 0, 960, 240, 480, 0, 0])!;
  const result = resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-10-16");
  expect(resolveWeekPlan(source, custom, "2026-10-16").targets).toEqual([14400, 0, 57600, 14400, 0, 0, 0]);
  expect(custom).toEqual([240, 0, 960, 240, 480, 0, 0]);
  expect(result.targets).toEqual([28800, 28800, 28800, 28800, 26083, 0, 0]);
  expect(result.completed).toEqual([30617, 29700, 28800, 28800, null, null, null]);
  expect(result.displaySeconds).toEqual([30617, 29700, 28800, 28800, 26083, 0, 0]);
  expect(result.displaySeconds.reduce((sum, seconds) => sum + seconds, 0)).toBe(144000);
  expect(result.weeklySeconds).toBe(144000);
  expect(result.projectedWeeklySeconds).toBe(144000);
  const edited = resolveWeekPlan(source, setDayMinutes(DEFAULT_WORK_PLAN, 4, 510), "2026-10-16");
  expect(edited.projectedWeeklySeconds).toBe(145800);
  expect(edited.displaySeconds[4]).toBe(27883);
});

test("bugünkü çıkış ve gelecek kayıtlar kilitlenmez; geçmiş belirsiz süre ve sıfır kayıt kilitlenir", () => {
  const source = days([0, 9, 9, 9, 9, 9, null]);
  source[1].state = "uncertain";
  source[2].state = "open";
  source[4].state = "outside";
  source.push({ date: "2026-10-09", state: "recorded", recordedSeconds: 32400 });
  expect(completedDaySeconds(source, "2026-10-12", "2026-10-16"))
    .toEqual([0, 32400, null, 32400, null, null, null]);
});

test("toplu kaydet, tamamla ve sıfırla tamamlanan günleri hedef veya kayıt deposuna dönüştürmez", () => {
  const completed = [30617, 29700, 28800, 28800, null, null, null];
  const proposed = readDayPlan([240, 240, 240, 240, 450, 0, 0])!;
  const saved = changeWeekPlan(emptyWorkPlans(), "2026-10-12", proposed, completed);
  const plan = saved.weekOverrides["2026-10-12"];
  expect(plan).toEqual([480, 480, 480, 480, 450, 0, 0]);
  const source = days(completed.map(seconds => seconds === null ? null : seconds / 3600));
  const resolved = resolveWeekPlan(source, plan, "2026-10-16");
  const next = completeWeekPlan(plan, DEFAULT_WORK_PLAN, resolved, "last")!;
  expect(next.slice(0, 4)).toEqual([480, 480, 480, 480]);
  expect(Math.round(next[4] * 60)).toBe(26083);
  const completedPlan = changeWeekPlan(saved, "2026-10-12", next, completed, 144000);
  expect(changeWeekPlan(completedPlan, "2026-10-12", null, completed).weekOverrides).toEqual({});
  expect(changeWeekPlan(completedPlan, "2026-10-12", DEFAULT_WORK_PLAN, completed).weekOverrides).toEqual({});
});

test("yeni varsayılan geçmişe uygulanır, kilitli gerçekleşen süre değişmez, snapshot tutulmaz", () => {
  const source = days([9, 8, 8, 8, 8, null, null]);
  const before = resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-10-23");
  const shorter = readDayPlan([420, 420, 420, 420, 420, 0, 0])!;
  const after = resolveWeekPlan(source, shorter, "2026-10-23", false);
  expect(before.displaySeconds).toEqual(after.displaySeconds);
  expect(before.targets.slice(0, 5)).toEqual(Array(5).fill(28800));
  expect(after.targets.slice(0, 5)).toEqual(Array(5).fill(25200));
  expect(after.weeklySeconds).toBe(126000);
  expect(after.projectedWeeklySeconds).toBe(147600);
  expect(after.eligible).toEqual(Array(7).fill(false));
  expect(Object.keys(changeDefaultPlan(emptyWorkPlans(), shorter))).toEqual(["defaultPlan", "weekOverrides"]);
});

test.each([6, 5.5, 6.5])("hafta ilerlerken özel 6 saatlik plan korunur; gerçekleşen %s saat", actual => {
  const plan = readDayPlan([360, 600, 480, 480, 480, 0, 0])!;
  const state = changeWeekPlan(emptyWorkPlans(), "2026-10-12", plan);
  const monday = resolveWeekPlan(days([actual, null, null, null, null, null, null]), plan, "2026-10-12");
  const tuesday = resolveWeekPlan(days([actual, null, null, null, null, null, null]), resolveStoredPlan(state, "2026-10-12"), "2026-10-13");
  expect(monday.completed[0]).toBeNull();
  expect(monday.targets).toEqual([21600, 36000, 28800, 28800, 28800, 0, 0]);
  expect(plan).toEqual([360, 600, 480, 480, 480, 0, 0]);
  expect(tuesday.targets[1]).toBe(36000);
  expect(tuesday.targets[4]).toBe((14 - actual) * 3600);
  expect(tuesday.weeklySeconds).toBe(144000);
  expect(tuesday.projectedWeeklySeconds).toBe(144000);
  expect(tuesday.unallocatedSeconds).toBe(0);
});

test("kapasite dolunca Cuma → Perşembe → Çarşamba; kalan açık geçmişe yüklenmez", () => {
  const plan = readDayPlan([480, 480, 480, 960, 930, 0, 0])!;
  const source = days([0, 0, null, null, null, null, null]);
  const result = resolveWeekPlan(source, plan, "2026-10-14");
  expect(result.targets).toEqual([28800, 28800, 57600, 57600, 57600, 0, 0]);
  expect(result.unallocatedSeconds).toBe(27000);
  expect(result.projectedWeeklySeconds).toBe(172800);
  expect(result.weeklySeconds).toBe(199800);
  source[3].state = "uncertain";
  const uncertain = resolveWeekPlan(source, plan, "2026-10-14");
  expect(uncertain.eligible).toEqual([false, false, true, false, true, false, false]);
  expect(uncertain.targets[3]).toBe(57600);
  expect(uncertain.unallocatedSeconds).toBe(27000);
});

test("fazla süre son günün alt sınırını aşınca önceki güne aktarılır", () => {
  const result = resolveWeekPlan(days([16, 16, null, null, null, null, null]), DEFAULT_WORK_PLAN, "2026-10-14");
  expect(result.targets).toEqual([28800, 28800, 28800, 0, 0, 0, 0]);
  expect(result.projectedWeeklySeconds).toBe(144000);
  expect(result.unallocatedSeconds).toBe(0);
});

test("kapalı veya belirsiz son gün atlanır; son planlı gün Cuma olmak zorunda değildir", () => {
  const source = days([5.5, null, null, null, null, null, null]);
  const plan = readDayPlan([360, 600, 480, 480, 480, 0, 0])!;
  source[4].state = "uncertain";
  const thursday = resolveWeekPlan(source, plan, "2026-10-13");
  expect(thursday.eligible).toEqual([false, true, true, true, false, false, false]);
  expect(thursday.targets[3]).toBe(30600);
  source[3].state = "uncertain";
  const wednesday = resolveWeekPlan(source, plan, "2026-10-13");
  expect(wednesday.eligible).toEqual([false, true, true, false, false, false, false]);
  expect(wednesday.targets[2]).toBe(30600);
  const thursdayPlan = readDayPlan([360, 600, 480, 480, 0, 0, 0])!;
  const shortened = resolveWeekPlan(days([5.5, null, null, null, null, null, null]), thursdayPlan, "2026-10-13");
  expect(shortened.targets[3]).toBe(30600);
  expect(shortened.targets.slice(4)).toEqual([0,0,0]);
});

test("bütün mesai günleri tamamlandığında hedef sabittir; bakiye görünür, geçmiş yeniden dengelenmez", () => {
  const plan = readDayPlan([360, 600, 480, 480, 480, 0, 0])!;
  const result = resolveWeekPlan(days([5.5, 10, 8, 8, 8, null, null]), plan, "2026-10-17");
  expect(result.eligible).toEqual(Array(7).fill(false));
  expect(result.targets).toEqual([21600, 36000, 28800, 28800, 28800, 0, 0]);
  expect(result.weeklySeconds).toBe(144000);
  expect(result.projectedWeeklySeconds).toBe(142200);
  expect(result.unallocatedSeconds).toBe(1800);
});

test("tamamla geçmiş kayıtsız günü atlar ve uygun günlerin kapasitesini kullanır", () => {
  const plan = readDayPlan([480, 480, 480, 480, 450, 0, 0])!;
  const resolved = resolveWeekPlan(days([null, 8, 8, null, null, null, null]), plan, "2026-10-15");
  expect(resolved.eligible).toEqual([false, false, false, true, true, false, false]);
  expect(completeWeekPlan(plan, DEFAULT_WORK_PLAN, resolved, "equal")).toEqual([480, 480, 480, 510, 450, 0, 0]);
  const capacity = readDayPlan([960, 450, 0, 0, 0, 0, 0])!;
  const target = readDayPlan([960, 480, 0, 0, 0, 0, 0])!;
  const capacityResolved = resolveWeekPlan(days([null,null,null,null,null,null,null]), capacity, "2026-10-13");
  expect(completeWeekPlan(capacity, target, capacityResolved, "equal")).toEqual(target);
});

test("elle düzenleme özgün planı değiştirir; otomatik sonuç tekrar kalıcı plana yazılmaz", () => {
  const source = days([5.5, null, null, null, null, null, null]);
  const plan = readDayPlan([360, 600, 480, 480, 480, 0, 0])!;
  const edited = setDayMinutes(plan, 3, 510);
  const state = changeWeekPlan(emptyWorkPlans(), "2026-10-12", plan);
  const saved = changeWeekPlan(state, "2026-10-12", edited, completedDaySeconds(source, "2026-10-12", "2026-10-13"));
  const stored = resolveStoredPlan(saved, "2026-10-12");
  expect(stored).toEqual([360, 600, 480, 510, 480, 0, 0]);
  const resolved = resolveWeekPlan(source, stored, "2026-10-13");
  expect(resolved.targets[3]).toBe(30600);
  expect(resolved.targets[4]).toBe(30600);
  expect(resolved.weeklySeconds).toBe(145800);
  expect(stored).toEqual(edited);
});

test("kaydetme, sıfırlama ve şablon değişikliği tamamlanan özel planı korur", () => {
  const plan = readDayPlan([360, 600, 480, 480, 480, 0, 0])!;
  const initial = changeWeekPlan(emptyWorkPlans(), "2026-10-12", plan);
  const completed = [19800, null, null, null, null, null, null];
  expect(resolveStoredPlan(changeWeekPlan(initial, "2026-10-12", DEFAULT_WORK_PLAN, completed), "2026-10-12")[0]).toBe(360);
  expect(resolveStoredPlan(changeWeekPlan(initial, "2026-10-12", null, completed), "2026-10-12")).toEqual([360,480,480,480,480,0,0]);
  const shorter = readDayPlan([420,420,420,420,420,0,0])!;
  expect(resolveStoredPlan(changeDefaultPlan(initial, shorter, "2026-10-12", completed), "2026-10-12")).toEqual(plan);
  expect(resolveStoredPlan(changeDefaultPlan(emptyWorkPlans(), shorter, "2026-10-12", completed), "2026-10-12")).toEqual([480,420,420,420,420,0,0]);
});

test("bugünkü outside ve ongoing kesin sonuç sayılmaz; saniyeler dağıtımda korunur", () => {
  const plan = readDayPlan([360,600,480,480,480,0,0])!;
  const source = days([5.5, 12, null, null, null, null, null]);
  source[0].recordedSeconds! += 17;
  for (const state of ["outside", "ongoing"] as const) {
    source[1].state = state;
    const result = resolveWeekPlan(source, plan, "2026-10-13");
    expect(result.completed[1]).toBeNull();
    expect(result.targets[1]).toBe(36000);
    expect(result.targets[4]).toBe(30583);
    expect(result.projectedWeeklySeconds).toBe(144000);
  }
});
