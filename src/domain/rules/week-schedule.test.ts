import { expect, test } from "bun:test";
import { previewWeekSchedule } from "./week-schedule";
import { completeWeekPlan, DEFAULT_WORK_PLAN, resolveWeekPlan, type PlanDay } from "./work-plan";

const days: PlanDay[] = Array.from({ length: 7 }, (_, day) => ({
  date: `2026-11-${9 + day < 10 ? "0" : ""}${9 + day}`,
  state: day < 2 ? "recorded" : "future",
  recordedSeconds: day < 2 ? 8 * 3600 : null,
}));
const resolved = resolveWeekPlan(days, DEFAULT_WORK_PLAN, "2026-11-11");

test("bugün yedi saat seçilirse diğer günler otomatik değişmez; bir saat eksik görünür", () => {
  const before = JSON.stringify(resolved);
  const result = previewWeekSchedule(resolved, { 2: 7 * 3600 });
  expect(result.seconds).toEqual([28800, 28800, 25200, 28800, 28800, 0, 0]);
  expect(result.total).toBe(39 * 3600);
  expect(result.difference).toBe(3600);
  expect(JSON.stringify(resolved)).toBe(before);
});
test("tamamlama açıkça seçilince ortak sahip eşit veya son gün dağıtımını yapar", () => {
  const result = previewWeekSchedule(resolved, { 2: 25200 });
  const context = { ...resolved, displaySeconds: result.seconds, projectedWeeklySeconds: result.total,
    eligible: resolved.eligible.map((value, day) => value && day !== 2) };
  expect(completeWeekPlan(DEFAULT_WORK_PLAN, DEFAULT_WORK_PLAN, context, "equal")?.slice(2,5)).toEqual([420,510,510]);
  expect(completeWeekPlan(DEFAULT_WORK_PLAN, DEFAULT_WORK_PLAN, context, "last")?.slice(2,5)).toEqual([420,480,540]);
});
test("manuel çözümde izin veya plan değişikliği son güne aktarılmaz; varsayılan akış otomatik kalır", () => {
  const source = days.map((day, index) => index === 0 ? { ...day, recordedSeconds: 21600 } : day);
  const manual = resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-11-11", false, 144000, [], false, [], "manual");
  expect(manual.displaySeconds[4]).toBe(28800);
  expect(manual.unallocatedSeconds).toBe(7200);
  expect(resolveWeekPlan(source, DEFAULT_WORK_PLAN, "2026-11-11").displaySeconds[4]).toBe(36000);
});
test("izin ve kullanıcı kilidi korunur, net hedef kullanılır", () => {
  const source = resolveWeekPlan(days, [480,480,480,480,0,0,0], "2026-11-11", false, 115200, [], false, [3]);
  const result = previewWeekSchedule(source, { 2: 28800 });
  expect(result.seconds).toEqual([28800,28800,28800,28800,0,0,0]);
  expect(result.difference).toBe(0);
});
test("kapasite ve fazla planlanan süre görünür kalır", () => {
  expect(previewWeekSchedule(resolved, { 2: 57600, 3: 57600, 4: 57600 }).difference).toBe(-86400);
  expect(previewWeekSchedule(resolved, { 2: 0, 3: 0 }).difference).toBe(57600);
});
test("tamamlanan güne, kapasite dışına ve geçersiz indekse taslak uygulanamaz", () => {
  for (const fixed of [{ 0: 0 }, { 2: 57601 }, { 2: -1 }, { 9: 0 }, { 2: NaN }])
    expect(() => previewWeekSchedule(resolved, fixed)).toThrow();
});

test("taslak yokken mevcut dağılım aynen korunur", () => {
  expect(previewWeekSchedule(resolved, {}).seconds).toEqual(resolved.displaySeconds);
});
test("fazla süre kalan günlerden otomatik düşülmez", () => {
  const result = previewWeekSchedule(resolved, { 2: 32400 });
  expect(result.seconds.slice(2, 5)).toEqual([32400, 28800, 28800]);
  expect(result.difference).toBe(-3600);
});
