import { ui } from "../../lib/ui-text.js";
import { weekday, isDateKey, weekStart, weekDates } from "./calendar";
import type { DayState } from "./record-status";

// Calendar-aligned minutes; Saturday and Sunday are always holidays.
export type WorkPlan = readonly [number, number, number, number, number, 0, 0];
export const WORKING_DAY_COUNT = 5;
export type WorkPlans = {
  defaultPlan: WorkPlan;
  weekOverrides: Record<string, WorkPlan>;
  // Gross seconds before leave; resolveStoredTarget deducts the current template allowance.
  weekTargets?: Record<string, number>;
  weekLeaves?: Record<string, readonly number[]>;
  // A computed zero duration keeps its open-day intent when materialized and saved.
  weekZeroOpenDays?: Record<string, readonly number[]>;
  weekLockedDays?: Record<string, readonly number[]>;
};
export const PLAN_LIMITS = Object.freeze({ stepMinutes: 30, maxDailyMinutes: 960 });
export const WORK_PLAN_POLICY = Object.freeze({ autoReduceSurplus: false });
export const DEFAULT_WORK_PLAN: WorkPlan = Object.freeze([480, 480, 480, 480, 480, 0, 0]);
const NO_PLAN_DAYS: readonly number[] = Object.freeze([]);

export function emptyWorkPlans(): WorkPlans {
  return { defaultPlan: DEFAULT_WORK_PLAN, weekOverrides: {} };
}

export function readDayPlan(value: unknown): WorkPlan | null {
  const plan = readWeekPlan(value);
  return plan && plan.every(Number.isInteger) ? plan : null;
}

export function readWeekPlan(value: unknown): WorkPlan | null {
  if (!Array.isArray(value) || value.length !== 7 || Array.from(value).some((minutes, day) =>
    (day >= WORKING_DAY_COUNT && minutes !== 0) ||
    typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0 || minutes > PLAN_LIMITS.maxDailyMinutes ||
    Math.abs(minutes * 60 - Math.round(minutes * 60)) > 0.000001
  )) return null;
  return [...value] as unknown as WorkPlan;
}

export function samePlan(left: WorkPlan, right: WorkPlan): boolean {
  return left.every((minutes, day) => minutes === right[day]);
}

export function readLeaveDays(value: unknown): number[] | null {
  return Array.isArray(value) && value.length <= WORKING_DAY_COUNT && new Set(value).size === value.length &&
    Array.from(value).every(day => Number.isInteger(day) && day >= 0 && day < WORKING_DAY_COUNT)
    ? [...value].sort((left, right) => left - right) : null;
}

export function resolveLeaveDays(plans: WorkPlans, week: string): readonly number[] {
  return plans.weekLeaves?.[week] ?? NO_PLAN_DAYS;
}

export function resolveZeroOpenDays(plans: WorkPlans, week: string): readonly number[] {
  return plans.weekZeroOpenDays?.[week] ?? NO_PLAN_DAYS;
}

export function resolveUserLockedDays(plans: WorkPlans, week: string): readonly number[] {
  return plans.weekLockedDays?.[week] ?? NO_PLAN_DAYS;
}

export function changeWeekLockedDays(plans: WorkPlans, week: string, days: readonly number[], plan: WorkPlan): WorkPlans {
  if (!isPlanWeek(week) || !readLeaveDays(days) || !readWeekPlan(plan) ||
    days.some(day => resolveLeaveDays(plans, week).includes(day))) throw new Error(ui.validationErrors.lockedDays);
  const weekLockedDays = { ...plans.weekLockedDays };
  if (days.length) weekLockedDays[week] = [...days].sort((a, b) => a - b);
  else delete weekLockedDays[week];
  const weekOverrides = { ...plans.weekOverrides, [week]: plan };
  if (samePlan(plan, plans.defaultPlan) && !days.length) delete weekOverrides[week];
  const weekTargets = { ...plans.weekTargets };
  const target = resolveStoredTarget(plans, week);
  const leaves = resolveLeaveDays(plans, week);
  if (!leaves.length && target === weeklyTarget(plan)) delete weekTargets[week];
  else weekTargets[week] = target + leaveSeconds(plans.defaultPlan, leaves);
  const { weekLockedDays: _, weekTargets: __, ...rest } = plans;
  return { ...rest, weekOverrides, ...(Object.keys(weekTargets).length ? { weekTargets } : {}),
    ...(Object.keys(weekLockedDays).length ? { weekLockedDays } : {}) };
}

export function isOpenPlanDay(plan: WorkPlan, day: number, zeroOpenDays: readonly number[] = []): boolean {
  return day >= 0 && day < WORKING_DAY_COUNT && (plan[day] > 0 || zeroOpenDays.includes(day));
}

function leaveSeconds(defaultPlan: WorkPlan, leaveDays: readonly number[]): number {
  return leaveDays.reduce((sum, day) => sum + defaultPlan[day] * 60, 0);
}

function applyLeave(plan: WorkPlan, leaveDays: readonly number[]): WorkPlan {
  return plan.map((minutes, day) => leaveDays.includes(day) ? 0 : minutes) as unknown as WorkPlan;
}

export function referenceWeekTarget(defaultPlan: WorkPlan, leaveDays: readonly number[] = []): number {
  return weeklyTarget(defaultPlan) - leaveSeconds(defaultPlan, leaveDays);
}

export function resolveStoredPlan(plans: WorkPlans, week: string): WorkPlan {
  const plan = plans.weekOverrides[week] ?? plans.defaultPlan;
  const leaves = resolveLeaveDays(plans, week);
  return leaves.length ? applyLeave(plan, leaves) : plan;
}

export function resolveStoredTarget(plans: WorkPlans, week: string): number {
  const target = plans.weekTargets?.[week];
  return target === undefined ? weeklyTarget(resolveStoredPlan(plans, week))
    : Math.max(0, target - leaveSeconds(plans.defaultPlan, resolveLeaveDays(plans, week)));
}

export function changeWeekPlan(plans: WorkPlans, week: string, plan: WorkPlan | null, completed: readonly (number | null)[] = [], targetSeconds?: number, leaveDays = resolveLeaveDays(plans, week)): WorkPlans {
  if (!isPlanWeek(week) || (plan !== null && !readWeekPlan(plan)) ||
    !readLeaveDays(leaveDays) ||
    (targetSeconds !== undefined && (!Number.isSafeInteger(targetSeconds) || targetSeconds < 0))) throw new Error(ui.validationErrors.workPlan);
  const previous = resolveStoredPlan(plans, week);
  const reset = plan === null;
  const userLocked = reset ? NO_PLAN_DAYS : resolveUserLockedDays(plans, week);
  const previousLeaves = resolveLeaveDays(plans, week);
  leaveDays = reset ? previousLeaves.filter(day => completed[day] != null) : leaveDays;
  if (previous.some((_, day) => completed[day] != null && previousLeaves.includes(day) !== leaveDays.includes(day)))
    throw new Error(ui.validationErrors.completedDay);
  leaveDays = leaveDays.filter(day => !userLocked.includes(day) || previousLeaves.includes(day));
  plan = preserveCompletedPlan(applyLeave(plan ?? plans.defaultPlan, leaveDays), previous,
    previous.map((_, day) => completed[day] != null || userLocked.includes(day) ? 0 : null));
  const weekOverrides = { ...plans.weekOverrides };
  if (samePlan(plan, plans.defaultPlan) && !userLocked.length) delete weekOverrides[week];
  else weekOverrides[week] = plan;
  const nextTarget = targetSeconds ?? (reset ? referenceWeekTarget(plans.defaultPlan, leaveDays)
    : resolveStoredTarget(plans, week) + weeklyTarget(plan) - weeklyTarget(previous));
  const weekTargets = { ...plans.weekTargets };
  if (!leaveDays.length && nextTarget === weeklyTarget(plan)) delete weekTargets[week];
  else weekTargets[week] = nextTarget + leaveSeconds(plans.defaultPlan, leaveDays);
  const weekLeaves = { ...plans.weekLeaves };
  if (leaveDays.length) weekLeaves[week] = [...leaveDays];
  else delete weekLeaves[week];
  const weekZeroOpenDays = { ...plans.weekZeroOpenDays };
  const previousZeroOpenDays = resolveZeroOpenDays(plans, week);
  const zeroOpenDays = plan.flatMap((minutes, day) => minutes === 0 && !leaveDays.includes(day) &&
    isOpenPlanDay(previous, day, previousZeroOpenDays) && (!reset || completed[day] != null || userLocked.includes(day)) ? [day] : []);
  if (zeroOpenDays.length) weekZeroOpenDays[week] = zeroOpenDays;
  else delete weekZeroOpenDays[week];
  const weekLockedDays = { ...plans.weekLockedDays };
  if (reset) delete weekLockedDays[week];
  const { weekTargets: _, weekLeaves: __, weekZeroOpenDays: ___, weekLockedDays: ____, ...rest } = plans;
  return { ...rest, weekOverrides, ...(Object.keys(weekTargets).length ? { weekTargets } : {}),
    ...(Object.keys(weekLeaves).length ? { weekLeaves } : {}),
    ...(Object.keys(weekZeroOpenDays).length ? { weekZeroOpenDays } : {}),
    ...(Object.keys(weekLockedDays).length ? { weekLockedDays } : {}) };
}

export function changeDefaultPlan(plans: WorkPlans, defaultPlan: WorkPlan, week?: string, completed: readonly (number | null)[] = []): WorkPlans {
  if (!readDayPlan(defaultPlan)) throw new Error(ui.validationErrors.defaultPlan);
  const weekOverrides = { ...plans.weekOverrides };
  const weekTargets = { ...plans.weekTargets };
  const weekZeroOpenDays = { ...plans.weekZeroOpenDays };
  if (week) {
    const leaves = resolveLeaveDays(plans, week);
    const previous = resolveStoredPlan(plans, week);
    const zeroOpenDays = resolveZeroOpenDays(plans, week);
    const userLocked = resolveUserLockedDays(plans, week);
    const customRemainingDays = previous.some((minutes, day) => completed[day] == null && !userLocked.includes(day) && !leaves.includes(day) &&
      (minutes !== plans.defaultPlan[day] || zeroOpenDays.includes(day)));
    const previousTarget = resolveStoredTarget(plans, week);
    const customTarget = previousTarget !== referenceWeekTarget(plans.defaultPlan, leaves);
    if (!customRemainingDays && !customTarget) {
      weekOverrides[week] = preserveCompletedPlan(applyLeave(defaultPlan, leaves), previous,
        previous.map((_, day) => completed[day] != null || userLocked.includes(day) ? 0 : null));
      const nextTarget = referenceWeekTarget(defaultPlan, leaves);
      if (!leaves.length && nextTarget === weeklyTarget(weekOverrides[week])) delete weekTargets[week];
      else weekTargets[week] = weeklyTarget(defaultPlan);
    } else {
      weekOverrides[week] = previous;
      const grossTarget = plans.weekTargets?.[week] ?? previousTarget + leaveSeconds(plans.defaultPlan, leaves);
      const nextTarget = Math.max(0, grossTarget - leaveSeconds(defaultPlan, leaves));
      if (!leaves.length && nextTarget === weeklyTarget(previous)) delete weekTargets[week];
      else weekTargets[week] = grossTarget;
    }
  }
  for (const [key, days] of Object.entries(weekZeroOpenDays)) {
    const plan = weekOverrides[key] ?? defaultPlan;
    const remaining = days.filter(day => plan[day] === 0);
    if (remaining.length) weekZeroOpenDays[key] = remaining;
    else delete weekZeroOpenDays[key];
  }
  return {
    defaultPlan,
    weekOverrides: Object.fromEntries(Object.entries(weekOverrides)
      .filter(([key, plan]) => resolveUserLockedDays(plans, key).length || !samePlan(plan, defaultPlan))),
    ...(Object.keys(weekTargets).length ? { weekTargets } : {}),
    ...(plans.weekLeaves ? { weekLeaves: plans.weekLeaves } : {}),
    ...(plans.weekLockedDays ? { weekLockedDays: plans.weekLockedDays } : {}),
    ...(Object.keys(weekZeroOpenDays).length ? { weekZeroOpenDays } : {}),
  };
}

export function setDayMinutes(plan: WorkPlan, day: number, minutes: number): WorkPlan {
  if (!Number.isInteger(day) || day < 0 || day >= WORKING_DAY_COUNT) throw new Error(ui.validationErrors.planDay);
  const next = readWeekPlan(plan.map((value, index) => index === day ? minutes : value));
  if (!next) throw new Error(ui.validationErrors.dayDuration(PLAN_LIMITS.maxDailyMinutes / 60));
  return next;
}

export function weeklyTarget(plan: readonly number[]): number {
  return plan.reduce((sum, minutes) => sum + Math.round(minutes * 60), 0);
}

function preserveCompletedPlan(plan: WorkPlan, previous: WorkPlan, completed: readonly (number | null)[]): WorkPlan {
  return plan.map((minutes, day) => completed[day] != null ? previous[day] : minutes) as unknown as WorkPlan;
}

export function isPlanWeek(value: unknown): value is string {
  return isDateKey(value) && weekday(value) === 0;
}

export function targetExitAt(firstEntry: number | null, targetSeconds: number | null): number | null {
  return firstEntry !== null && targetSeconds !== null ? firstEntry + targetSeconds * 1000 : null;
}

export type PlanDay = { date: string; state: DayState; recordedSeconds: number | null; records?: readonly unknown[] };

export function lockedDays(days: readonly PlanDay[], week: string, today: string): boolean[] {
  const locked = Array(7).fill(false) as boolean[];
  for (const day of days) {
    if (weekStart(day.date) === week && day.date < today && (day.records?.length || day.recordedSeconds !== null))
      locked[weekday(day.date)] = true;
  }
  return locked;
}

// Plan persistence checks only nullability. Zero marks a locked day with unknown duration;
// arithmetic always uses completedDaySeconds instead.
export function planProtectionMarkers(days: readonly PlanDay[], week: string, today: string): (number | null)[] {
  const completed = completedDaySeconds(days, week, today);
  const locked = lockedDays(days, week, today);
  return completed.map((seconds, day) => locked[day] ? seconds ?? 0 : null);
}

export function completedDaySeconds(days: readonly PlanDay[], week: string, today: string): (number | null)[] {
  const completed: (number | null)[] = Array(7).fill(null);
  for (const day of days) {
    if (weekStart(day.date) === week && day.date < today && day.recordedSeconds !== null &&
      (day.state === "recorded" || day.state === "uncertain"))
      completed[weekday(day.date)] = day.recordedSeconds;
  }
  return completed;
}

export function planAdjustmentDays(days: readonly PlanDay[], plan: WorkPlan, week: string, today: string, zeroOpenDays: readonly number[] = [], userLockedDays: readonly number[] = []): boolean[] {
  const locked = lockedDays(days, week, today);
  return weekDates(week).map((date, index) => date >= today && isOpenPlanDay(plan, index, zeroOpenDays) && !locked[index] && !userLockedDays.includes(index) &&
    days.find(day => day.date === date)?.state !== "uncertain");
}

export function resolveWeekPlan(days: readonly PlanDay[], plan: WorkPlan, today: string, partial = false, targetSeconds = weeklyTarget(plan), zeroOpenDays: readonly number[] = [], autoReduceSurplus: boolean = WORK_PLAN_POLICY.autoReduceSurplus, userLockedDays: readonly number[] = []) {
  const week = weekStart(days[0]?.date ?? today);
  const completed = completedDaySeconds(days, week, today);
  const locked = lockedDays(days, week, today);
  const workingDays = plan.map((_, day) => isOpenPlanDay(plan, day, zeroOpenDays));
  const eligible = planAdjustmentDays(days, plan, week, today, zeroOpenDays, userLockedDays);
  const openDays = plan.flatMap((_, day) => eligible[day] ? [day] : []);
  const required = plan.map(minutes => Math.round(minutes * 60));
  let unallocatedSeconds = completed.reduce<number>((sum, seconds, index) =>
    seconds === null ? sum : sum + Math.round(plan[index] * 60) - seconds, targetSeconds - weeklyTarget(plan));
  if (!partial && (unallocatedSeconds > 0 || autoReduceSurplus)) {
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
  const exitGoal = !partial && todayIndex !== -1 && workingDays[weekday(today)] && days[todayIndex].state !== "uncertain"
    ? dailySeconds : null;
  const displaySeconds = plan.map((minutes, index) => {
    if (completed[index] !== null) return completed[index]!;
    const dayIndex = days.findIndex(day => weekStart(day.date) === week && weekday(day.date) === index);
    return dayIndex === -1 ? Math.round(minutes * 60) : targets[dayIndex];
  });
  const projectedWeeklySeconds = displaySeconds.reduce((sum, seconds) => sum + seconds, 0);
  return { targets, workingDays, completed, locked, eligible, displaySeconds, unallocatedSeconds, projectedWeeklySeconds, weeklySeconds: targetSeconds, blocked, exitGoal };
}

export function editRequiredMinutes(plan: WorkPlan, resolved: ReturnType<typeof resolveWeekPlan>, updates: readonly { day: number; minutes: number }[], defaultPlan = DEFAULT_WORK_PLAN, leaveDays: readonly number[] = []) {
  for (const { day, minutes } of updates) {
    setDayMinutes(plan, day, minutes);
    if (resolved.locked[day]) throw new Error(ui.validationErrors.completedDay);
  }
  if (updates.every(({ day, minutes }) => minutes === 0 ? leaveDays.includes(day)
    : !leaveDays.includes(day) && Math.round(minutes * 60) === resolved.displaySeconds[day])) {
    return { plan, targetSeconds: resolved.weeklySeconds, leaveDays: [...leaveDays] };
  }
  let next = readWeekPlan(plan.map((minutes, day) => day < WORKING_DAY_COUNT && !resolved.locked[day]
    ? resolved.displaySeconds[day] / 60 : minutes))!;
  let targetSeconds = resolved.weeklySeconds;
  const leaves = new Set(leaveDays);
  for (const { day, minutes } of updates) {
    const previous = next[day];
    next = setDayMinutes(next, day, minutes);
    if (minutes === 0 && !leaves.has(day)) {
      leaves.add(day);
      targetSeconds -= defaultPlan[day] * 60;
    } else if (minutes > 0 && leaves.delete(day)) {
      targetSeconds += Math.round(minutes * 60);
    } else if (minutes > 0) {
      targetSeconds += Math.round(minutes * 60) - Math.round(previous * 60);
    }
  }
  return { plan: next, targetSeconds: Math.max(0, targetSeconds), leaveDays: [...leaves].sort((left, right) => left - right) };
}

export function completeWeekPlan(plan: WorkPlan, defaultPlan: WorkPlan, resolved: ReturnType<typeof resolveWeekPlan>, selectedDay: number | null = null, leaveDays: readonly number[] = [], mode: "equal" | "last" | "legacy" = "legacy"): WorkPlan | null {
  const next = [...resolved.displaySeconds];
  let difference = referenceWeekTarget(defaultPlan, leaveDays) - resolved.projectedWeeklySeconds;
  const reducing = difference < 0;
  const eligible = plan.flatMap((_, day) => resolved.eligible[day] && !leaveDays.includes(day) ? [day] : []);
  const otherDays = eligible.filter(day => day !== selectedDay);
  let recipients = mode === "last" || (mode === "legacy" && reducing) ? [...eligible].reverse()
    : mode === "equal" ? eligible : otherDays.length > 0 ? otherDays : eligible;
  while (difference !== 0) {
    let changed = false;
    for (const day of recipients) {
      const capacity = difference > 0 ? PLAN_LIMITS.maxDailyMinutes * 60 - next[day] : next[day];
      const step = difference > 0
        ? Math.min(difference, mode === "last" ? capacity : PLAN_LIMITS.stepMinutes * 60, capacity)
        : -Math.min(-difference, mode === "equal" ? PLAN_LIMITS.stepMinutes * 60 : capacity, capacity);
      if (step === 0) continue;
      next[day] += step;
      difference -= step;
      changed = true;
      if (difference === 0) break;
    }
    if (!changed) {
      if (mode === "legacy" && selectedDay !== null && eligible.includes(selectedDay) && !recipients.includes(selectedDay)) {
        recipients = [selectedDay];
      } else return null;
    }
  }
  return readWeekPlan(plan.map((minutes, day) => resolved.locked[day] ? minutes : next[day] / 60));
}
