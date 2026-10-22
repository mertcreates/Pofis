import type { DayReport } from "@/domain/attendance";
import { durationSegments } from "@/domain/rules/progress.js";
import { weekday } from "@/domain/rules/calendar";

export function weeklyRuler(days: DayReport[], leaveDays: readonly number[] = []) {
  return days.filter(day => day.source.workingDay || leaveDays.includes(weekday(day.date))).map(day => {
    const { dailyGoalSeconds: target, recorded, estimated } = day.source;
    const segments = durationSegments({ recorded, estimated, target });
    return { day, onLeave: leaveDays.includes(weekday(day.date)), recorded: segments.recorded, filled: segments.filled };
  });
}
