import { expect, test } from "bun:test";
import { createScenarioRuntime, desktopScenarios } from "./scenario-runtime";
import { scenarioTime } from "./scenario-contract";
import { prepareReport } from "@/domain/report";
import { dateKey, weekStart, addDays } from "@/domain/rules/calendar";
import { resolveStoredPlan, resolveStoredTarget } from "@/domain/rules/work-plan";
import { readReportResponse } from "@/data/report-response";
import { notificationGoal } from "./notification-report";

const real = Date.parse("2026-10-24T10:00:00+03:00");
test("sanal saat tüm tüketicilerde aynı ilerler, sistem saatini değiştirmez ve gün sonunda durur", () => {
  let elapsed = 0;
  const runtime = createScenarioRuntime({ realNow: () => real + elapsed });
  const seed = runtime.snapshot();
  expect(dateKey(runtime.now())).toBe("2026-10-21");
  expect(runtime.now()).toBe(Date.parse("2026-10-21T14:30:00+03:00"));
  elapsed = 37123;
  expect(runtime.now()).toBe(seed.clock.at + elapsed);
  expect(scenarioTime(seed.clock, real + elapsed)).toBe(runtime.now());
  elapsed = -1000;
  expect(runtime.now()).toBe(seed.clock.at);
  elapsed = 86400000;
  expect(runtime.now()).toBe(Date.parse("2026-10-21T23:59:59+03:00"));
});

test("senaryolar gerçek rapor/plan/hedef hesaplarına girer; hafta sonu ve izin hedef üretmez", () => {
  const runtime = createScenarioRuntime({ realNow: () => real });
  for (const { id } of desktopScenarios) {
    runtime.select(id);
    const seed = runtime.snapshot();
    const week = weekStart(dateKey(runtime.now()));
    const report = readReportResponse(runtime.report(week, addDays(week, 6)), week, addDays(week, 6));
    const day = prepareReport(report, resolveStoredPlan(seed.plans, week), dateKey(runtime.now()), false,
      resolveStoredTarget(seed.plans, week))(runtime.now()).days.find(value => value.date === dateKey(runtime.now()))!;
    const goal = notificationGoal(report, seed.plans, runtime.now());
    if (["leave", "weekend"].includes(id)) {
      expect(day.source.workingDay).toBe(false); expect(goal).toBeNull();
    } else if (id === "no-entry") {
      expect(day.records).toHaveLength(0); expect(goal).toBeNull();
    } else if (id === "uncertain") {
      expect(day.recordIssues.length).toBeGreaterThan(0); expect(goal).toBeNull();
    } else if (id === "completed") {
      expect(day.recordedSeconds).toBe(8 * 3600); expect(day.liveSeconds).toBeNull(); expect(goal).toBeNull();
    } else {
      expect(goal?.at).toBe(Date.parse("2026-10-21T17:00:00+03:00"));
      expect(day.source.total).toBe(id === "near-goal" ? 28740 : id === "overtime" ? 30600 : 19800);
      expect(goal!.at - runtime.now()).toBe(id === "near-goal" ? 60000 : id === "overtime" ? -1800000 : 9000000);
    }
  }
});

test("durum değişikliği girdileri korur; yeni senaryo saati, planı ve koşulları sıfırlar", () => {
  const runtime = createScenarioRuntime({ realNow: () => real });
  const before = runtime.snapshot();
  runtime.setCondition("offline", true);
  expect(runtime.snapshot().revision).toBe(before.revision);
  expect(runtime.snapshot().version).toBe(before.version + 1);
  const exposed = runtime.snapshot(); exposed.plans.defaultPlan = [0,0,0,0,0,0,0]; exposed.conditions.expired = true;
  expect(runtime.snapshot().plans.defaultPlan[0]).toBe(480);
  expect(runtime.snapshot().conditions.expired).toBe(false);
  runtime.select("leave");
  expect(runtime.snapshot().revision).not.toBe(before.revision);
  expect(runtime.snapshot().conditions).toEqual({ offline: false, expired: false, slow: false });
  expect(runtime.snapshot().plans.weekLeaves).toEqual({ "2026-10-19": [2] });
});
