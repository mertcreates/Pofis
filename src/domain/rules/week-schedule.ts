import { PLAN_LIMITS, referenceWeekTarget, setDayMinutes, type resolveWeekPlan, type ScheduleDraft, type WorkPlan } from "./work-plan";

export function resetScheduleDay(
  current: ScheduleDraft,
  day: number,
  initial: { plan: WorkPlan; leaveDays: readonly number[]; zeroOpenDays: readonly number[] },
  defaultPlan: WorkPlan,
): ScheduleDraft {
  const drafts = { ...current.drafts };
  const leaveChanges = { ...current.leaveChanges };
  delete drafts[day];
  delete leaveChanges[day];
  if (!current.completion) return { drafts, leaveChanges, completion: null };

  const previous = current.completion;
  const leaveDays = previous.leaveDays.filter(index => index !== day);
  const zeroOpenDays = previous.zeroOpenDays.filter(index => index !== day);
  if (initial.leaveDays.includes(day)) leaveDays.push(day);
  else if (initial.zeroOpenDays.includes(day)) zeroOpenDays.push(day);

  return { drafts, leaveChanges, completion: {
    plan: setDayMinutes(previous.plan, day, initial.plan[day]),
    targetSeconds: referenceWeekTarget(defaultPlan, leaveDays),
    leaveDays,
    zeroOpenDays,
  } };
}

/** Projects explicit trial durations; balancing requires a separate user action. */
export function previewWeekSchedule(
  resolved: ReturnType<typeof resolveWeekPlan>,
  fixed: Readonly<Partial<Record<number, number>>>,
) {
  const seconds = [...resolved.displaySeconds];
  for (const [key, value] of Object.entries(fixed)) {
    const day = Number(key);
    if (!Number.isInteger(day) || !resolved.eligible[day] || value === undefined ||
      !Number.isInteger(value) || value < 0 || value > PLAN_LIMITS.maxDailyMinutes * 60)
      throw new Error("Geçersiz haftalık saat taslağı.");
    seconds[day] = value;
  }
  const total = seconds.reduce((sum, value) => sum + value, 0);
  return { seconds, total, difference: resolved.weeklySeconds - total };
}
