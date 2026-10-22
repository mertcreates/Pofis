import { prepareReport, type Report } from "@/domain/report";
import { dateKey, weekStart } from "@/domain/rules/calendar";
import { passageDay } from "@/domain/rules/passages.js";
import { resolveStoredPlan, resolveStoredTarget, resolveZeroOpenDays, resolveUserLockedDays,
  targetExitAt, type WorkPlans } from "@/domain/rules/work-plan";
import type { NotificationGoal } from "@/domain/rules/notifications";

export function notificationGoal(report: Report | null, plans: WorkPlans | null, now: number): NotificationGoal | null {
  const today = dateKey(now);
  const week = weekStart(today);
  if (!report || !plans || report.from !== week || report.to < today ||
      !passageDay(report.passages, today, today).hasReliableOpenEntry) return null;
  // Freshness changes the dashboard's live estimate. Notifications intentionally retain the last known open entry.
  const day = prepareReport(report, resolveStoredPlan(plans, week), today, false,
    resolveStoredTarget(plans, week), resolveZeroOpenDays(plans, week), resolveUserLockedDays(plans, week))(now)
    .days.find(day => day.date === today);
  if (!day?.source.workingDay) return null;
  const at = targetExitAt(day.firstEntry, day.source.exitGoalSeconds);
  return at === null ? null : { date: today, at };
}
