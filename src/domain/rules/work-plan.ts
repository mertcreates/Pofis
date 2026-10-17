import { weekday, isDateKey, weekStart, weekDates } from "./calendar";
import type { DayState } from "./record-status";

// Calendar-aligned minutes; Saturday and Sunday are always holidays.
export type WorkPlan = readonly [number, number, number, number, number, 0, 0];
export const WORKING_DAY_COUNT = 5;
export type WorkPlans = { defaultPlan: WorkPlan; weekOverrides: Record<string, WorkPlan>; weekTargets?: Record<string, number> };
export const PLAN_LIMITS = Object.freeze({ stepMinutes: 30, maxDailyMinutes: 960 });
export const DEFAULT_WORK_PLAN: WorkPlan = Object.freeze([480, 480, 480, 480, 480, 0, 0]);

export function emptyWorkPlans(): WorkPlans {
  return { defaultPlan: DEFAULT_WORK_PLAN, weekOverrides: {} };
}

export function readDayPlan(value: unknown): WorkPlan | null {
  const plan = readWeekPlan(value);
  return plan && plan.every(minutes => Number.isInteger(minutes) && minutes % PLAN_LIMITS.stepMinutes === 0) ? plan : null;
}

export function readWeekPlan(value: unknown): WorkPlan | null {
  if (!Array.isArray(value) || value.length !== 7 || Array.from(value).some((minutes, day) =>
    (day >= WORKING_DAY_COUNT && minutes !== 0) ||
    typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0 || minutes > PLAN_LIMITS.maxDailyMinutes ||
    Math.abs(minutes * 60 - Math.round(minutes * 60)) > 0.000001
  )) return null;
  return [...value] as unknown as WorkPlan;
}

// Previous equal-hours input, used only to read the current v1 storage format.
export function readPlanInput(draft: { weekdays?: unknown; hours?: unknown; dailyHours?: unknown }): WorkPlan | null {
  const weekdays = draft.weekdays;
  if (!Array.isArray(weekdays) || weekdays.length === 0 || weekdays.length > 7 ||
    new Set(weekdays).size !== weekdays.length ||
    weekdays.some(day => !Number.isInteger(day) || day < 0 || day >= WORKING_DAY_COUNT)) return null;
  const hours = draft.dailyHours === undefined ? Number(draft.hours) / weekdays.length : Number(draft.dailyHours);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return readDayPlan(Array.from({ length: 7 }, (_, day) => weekdays.includes(day) ? hours * 60 : 0));
}

export function samePlan(left: WorkPlan, right: WorkPlan): boolean {
  return left.every((minutes, day) => minutes === right[day]);
}

export function resolveStoredPlan(plans: WorkPlans, week: string): WorkPlan {
  return plans.weekOverrides[week] ?? plans.defaultPlan;
}

export function resolveStoredTarget(plans: WorkPlans, week: string): number {
  return plans.weekTargets?.[week] ?? weeklyTarget(resolveStoredPlan(plans, week));
}

export function changeWeekPlan(plans: WorkPlans, week: string, plan: WorkPlan | null, completed: readonly (number | null)[] = [], targetSeconds?: number): WorkPlans {
  if (!isPlanWeek(week) || (plan !== null && !readWeekPlan(plan)) ||
    (targetSeconds !== undefined && (!Number.isSafeInteger(targetSeconds) || targetSeconds < 0))) throw new Error("Geçersiz mesai planı");
  const previous = resolveStoredPlan(plans, week);
  const reset = plan === null;
  plan = preserveCompletedPlan(plan ?? plans.defaultPlan, previous, completed);
  const weekOverrides = { ...plans.weekOverrides };
  if (samePlan(plan, plans.defaultPlan)) delete weekOverrides[week];
  else weekOverrides[week] = plan;
  const nextTarget = targetSeconds ?? (reset ? weeklyTarget(plan)
    : resolveStoredTarget(plans, week) + weeklyTarget(plan) - weeklyTarget(previous));
  const weekTargets = { ...plans.weekTargets };
  if (nextTarget === weeklyTarget(plan)) delete weekTargets[week];
  else weekTargets[week] = nextTarget;
  const { weekTargets: _, ...rest } = plans;
  return { ...rest, weekOverrides, ...(Object.keys(weekTargets).length ? { weekTargets } : {}) };
}

export function changeDefaultPlan(plans: WorkPlans, defaultPlan: WorkPlan, week?: string, completed: readonly (number | null)[] = []): WorkPlans {
  if (!readDayPlan(defaultPlan)) throw new Error("Geçersiz varsayılan plan");
  const weekOverrides = { ...plans.weekOverrides };
  const weekTargets = { ...plans.weekTargets };
  if (week) {
    const previous = resolveStoredPlan(plans, week);
    const customRemainingDays = previous.some((minutes, day) => completed[day] == null && minutes !== plans.defaultPlan[day]);
    if (!customRemainingDays) {
      weekOverrides[week] = preserveCompletedPlan(defaultPlan, previous, completed);
      if (weekTargets[week] !== undefined)
        weekTargets[week] += weeklyTarget(weekOverrides[week]) - weeklyTarget(previous);
    }
  }
  return {
    defaultPlan,
    weekOverrides: Object.fromEntries(Object.entries(weekOverrides)
      .filter(([, plan]) => !samePlan(plan, defaultPlan))),
    ...(Object.keys(weekTargets).length ? { weekTargets } : {}),
  };
}

export function setDayMinutes(plan: WorkPlan, day: number, minutes: number): WorkPlan {
  if (!Number.isInteger(day) || day < 0 || day >= WORKING_DAY_COUNT) throw new Error("Geçersiz plan günü");
  const next = readWeekPlan(plan.map((value, index) => index === day ? minutes : value));
  if (!next) throw new Error("Günlük süre 0–16 saat arasında, yarım saat adımlarla seçilmeli");
  return next;
}

export function weeklyTarget(plan: readonly number[]): number {
  return plan.reduce((sum, minutes) => sum + Math.round(minutes * 60), 0);
}

export function planMinutes(plan: WorkPlan): number[] { return [...plan]; }

function preserveCompletedPlan(plan: WorkPlan, previous: WorkPlan, completed: readonly (number | null)[]): WorkPlan {
  return plan.map((minutes, day) => completed[day] != null ? previous[day] : minutes) as unknown as WorkPlan;
}

export function isPlanWeek(value: unknown): value is string {
  return isDateKey(value) && weekday(value) === 0;
}

export function targetExitAt(firstEntry: number | null, targetSeconds: number | null): number | null {
  return firstEntry !== null && targetSeconds !== null ? firstEntry + targetSeconds * 1000 : null;
}

export type PlanDay = { date: string; state: DayState; recordedSeconds: number | null };

export function completedDaySeconds(days: readonly PlanDay[], week: string, today: string): (number | null)[] {
  const completed: (number | null)[] = Array(7).fill(null);
  for (const day of days) {
    if (weekStart(day.date) === week && day.date < today && day.state === "recorded" && day.recordedSeconds !== null)
      completed[weekday(day.date)] = day.recordedSeconds;
  }
  return completed;
}

export function planAdjustmentDays(days: readonly PlanDay[], plan: WorkPlan, week: string, today: string): boolean[] {
  const completed = completedDaySeconds(days, week, today);
  return weekDates(week).map((date, index) => date >= today && plan[index] > 0 && completed[index] === null &&
    days.find(day => day.date === date)?.state !== "uncertain");
}

export function resolveWeekPlan(days: readonly PlanDay[], plan: WorkPlan, today: string, partial = false, targetSeconds = weeklyTarget(plan)) {
  const week = weekStart(days[0]?.date ?? today);
  const completed = completedDaySeconds(days, week, today);
  const eligible = planAdjustmentDays(days, plan, week, today);
  const openDays = plan.flatMap((_, day) => eligible[day] ? [day] : []);
  const lastWorkingDay = openDays.at(-1) ?? null;
  const required = plan.map(minutes => Math.round(minutes * 60));
  let unallocatedSeconds = completed.reduce<number>((sum, seconds, index) =>
    seconds === null ? sum : sum + Math.round(plan[index] * 60) - seconds, targetSeconds - weeklyTarget(plan));
  if (!partial) {
    for (const index of [...openDays].reverse()) {
      const next = Math.max(0, Math.min(PLAN_LIMITS.maxDailyMinutes * 60, required[index] + unallocatedSeconds));
      unallocatedSeconds -= next - required[index];
      required[index] = next;
    }
  }
  const targets = days.map(day => required[weekday(day.date)]);
  const todayIndex = days.findIndex(day => day.date === today);
  const dailySeconds = todayIndex === -1 ? 0 : targets[todayIndex];
  const blocked = days.some(day => day.date <= today && (day.state === "uncertain" || day.state === "missing"));
  const exitGoal = !partial && todayIndex !== -1 && plan[weekday(today)] > 0 && days[todayIndex].state !== "uncertain"
    ? dailySeconds : null;
  const displaySeconds = plan.map((minutes, index) => {
    if (completed[index] !== null) return completed[index]!;
    const dayIndex = days.findIndex(day => weekStart(day.date) === week && weekday(day.date) === index);
    return dayIndex === -1 ? Math.round(minutes * 60) : targets[dayIndex];
  });
  const projectedWeeklySeconds = displaySeconds.reduce((sum, seconds) => sum + seconds, 0);
  return { targets, plan, completed, eligible, displaySeconds, unallocatedSeconds, projectedWeeklySeconds, lastWorkingDay, weeklySeconds: targetSeconds, dailySeconds, blocked, exitGoal };
}

export function editRequiredMinutes(plan: WorkPlan, resolved: ReturnType<typeof resolveWeekPlan>, updates: readonly { day: number; minutes: number }[]) {
  let next = readWeekPlan(plan.map((minutes, day) => day < WORKING_DAY_COUNT && resolved.completed[day] === null
    ? resolved.displaySeconds[day] / 60 : minutes))!;
  let targetSeconds = resolved.weeklySeconds;
  for (const { day, minutes } of updates) {
    if (resolved.completed[day] != null) throw new Error("Tamamlanan gün değiştirilemez");
    const previous = next[day];
    next = setDayMinutes(next, day, minutes);
    targetSeconds += Math.round(minutes * 60) - Math.round(previous * 60);
  }
  return { plan: next, targetSeconds };
}

export function completeWeekPlan(plan: WorkPlan, defaultPlan: WorkPlan, resolved: ReturnType<typeof resolveWeekPlan>, selectedDay: number | null = null): WorkPlan | null {
  const next = [...resolved.displaySeconds];
  let difference = weeklyTarget(defaultPlan) - resolved.projectedWeeklySeconds;
  const reducing = difference < 0;
  const eligible = plan.flatMap((_, day) => resolved.eligible[day] ? [day] : []);
  const otherDays = eligible.filter(day => day !== selectedDay);
  const recipients = otherDays.length > 0 ? otherDays : eligible;
  if (reducing) recipients.reverse();
  while (difference !== 0) {
    let changed = false;
    for (const day of recipients) {
      const capacity = difference > 0 ? PLAN_LIMITS.maxDailyMinutes * 60 - next[day] : next[day];
      const step = difference > 0
        ? Math.min(difference, PLAN_LIMITS.stepMinutes * 60, capacity)
        : -Math.min(-difference, capacity);
      if (step === 0) continue;
      next[day] += step;
      difference -= step;
      changed = true;
      if (difference === 0) break;
    }
    if (!changed) return null;
  }
  return readWeekPlan(plan.map((minutes, day) => resolved.completed[day] !== null ? minutes : next[day] / 60));
}
