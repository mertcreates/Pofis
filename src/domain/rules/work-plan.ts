import type { DayReport } from "../attendance";
import { weekday, isDateKey } from "./calendar";
export type WorkPlan = {
  readonly goals: {
    readonly days: number;
    readonly hours: number;
    readonly weekdays: readonly number[];
  };
};
export const PLAN_LIMITS = Object.freeze({
  minHours: 0.25,
  maxDailyHours: 24,
  minDays: 1,
  maxDays: 7,
});
export const DEFAULT_WORK_PLAN: WorkPlan = Object.freeze({
  goals: Object.freeze({
    days: 5,
    hours: 40,
    weekdays: Object.freeze([0, 1, 2, 3, 4]),
  }),
});
export function planTargets(plan: WorkPlan) {
  const weeklySeconds = plan.goals.hours * 3600;
  const dayCount = plan.goals.weekdays.length;
  const dailyHours = plan.goals.hours / dayCount;
  return {
    weeklySeconds,
    dailySeconds: Math.ceil(weeklySeconds / dayCount),
    dailyHours,
    dayCount,
  };
}

export function planMinutes(plan: WorkPlan): number[] {
  const { dailyHours } = planTargets(plan);
  return Array.from({ length: 7 }, (_, day) =>
    plan.goals.weekdays.includes(day) ? dailyHours * 60 : 0,
  );
}

export function readPlanInput(draft: {
  weekdays?: unknown;
  hours?: unknown;
  dailyHours?: unknown;
}): WorkPlan | null {
  const weekdays = draft.weekdays;
  const daily =
    draft.dailyHours === undefined ? null : Number(draft.dailyHours);
  const hours =
    daily === null
      ? Number(draft.hours)
      : daily * (Array.isArray(weekdays) ? weekdays.length : 0);
  if (
    !Array.isArray(weekdays) ||
    weekdays.length < PLAN_LIMITS.minDays ||
    weekdays.length > PLAN_LIMITS.maxDays ||
    new Set(weekdays).size !== weekdays.length ||
    weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
    !Number.isFinite(hours) ||
    hours < PLAN_LIMITS.minHours ||
    hours > weekdays.length * PLAN_LIMITS.maxDailyHours ||
    (daily !== null &&
      (!Number.isFinite(daily) ||
        daily < PLAN_LIMITS.minHours ||
        daily > PLAN_LIMITS.maxDailyHours))
  )
    return null;
  return {
    goals: {
      days: weekdays.length,
      hours: Number(hours.toFixed(10)),
      weekdays: [...weekdays].sort((a, b) => a - b),
    },
  };
}

export function remainingSelectedDays(
  weekdays: readonly number[],
  week: string,
  today: string,
) {
  if (today < week) return weekdays.length;
  const offset = Math.floor(
    (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${week}T12:00:00Z`)) /
      86400000,
  );
  return weekdays.filter((day) => day >= offset).length;
}

export function hasPlanBlockingRecords(
  days: readonly { date: string; status: string }[],
  weekdays: readonly number[],
  through: string,
) {
  const selected = new Set(weekdays);
  return days.some((day) => {
    if (day.date > through) return false;
    if (day.status === "incomplete") return true;
    return (
      selected.has(weekday(day.date)) &&
      ["missing", "weekend"].includes(day.status)
    );
  });
}

export function planDailyTarget(
  week: { seconds: number; todaySeconds: number },
  remainingDays: number,
  weeklyTarget = planTargets(DEFAULT_WORK_PLAN).weeklySeconds,
  dailyTarget = planTargets(DEFAULT_WORK_PLAN).dailySeconds,
) {
  if (remainingDays > 1) return dailyTarget;
  const beforeToday = week.seconds - week.todaySeconds;
  return Math.ceil(Math.max(0, weeklyTarget - beforeToday));
}

export function isPlanWeek(value: unknown): value is string {
  return isDateKey(value) && weekday(value) === 0;
}
export function targetExitAt(
  firstEntry: number | null,
  targetSeconds: number | null,
): number | null {
  return firstEntry !== null && targetSeconds !== null
    ? firstEntry + targetSeconds * 1000
    : null;
}

export function resolveWeekPlan(
  summary: {
    days: readonly { date: string; status: string }[];
    weeks: {
      start: string;
      seconds: number;
      todaySeconds: number;
      partial: boolean;
    }[];
  },
  plan: WorkPlan,
  today: string,
) {
  const { weeklySeconds, dailySeconds } = planTargets(plan);
  const week = summary.weeks[0];
  const blocked = hasPlanBlockingRecords(
    summary.days,
    plan.goals.weekdays,
    today,
  );
  const remaining = remainingSelectedDays(
    plan.goals.weekdays,
    week.start,
    today,
  );
  const exitGoal =
    !week.partial && !blocked && remaining > 0
      ? planDailyTarget(week, remaining, weeklySeconds, dailySeconds)
      : null;
  return { weeklySeconds, dailySeconds, blocked, exitGoal };
}

export function weeklyTarget(plan: readonly number[]): number {
  return plan.reduce((sum, minutes) => sum + minutes, 0) * 60;
}

export function effectiveTarget(
  index: number,
  plan: readonly number[],
  days: readonly DayReport[],
  today: string,
) {
  const day = days[index];
  return {
    seconds:
      day && day.date <= today ? day.source.goalSeconds : plan[index] * 60,
    adjusted: false,
  };
}
