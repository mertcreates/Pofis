import type { DayReport } from "@/domain/attendance";
import { durationSegments } from "@/domain/rules/progress.js";

export function weeklyRuler(days: DayReport[]) {
  return days.filter(day => day.source.workingDay).map(day => {
    const { dailyGoalSeconds: target, recorded, estimated } = day.source;
    const segments = durationSegments({ recorded, estimated, target });
    return { day, recorded: segments.recorded, filled: segments.filled };
  });
}
