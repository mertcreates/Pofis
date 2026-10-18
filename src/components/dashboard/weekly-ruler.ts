import type { DayReport } from "@/domain/attendance";

export function weeklyRuler(days: DayReport[]) {
  return days.filter(day => day.source.workingDay).map(day => {
    const { dailyGoalSeconds: target, recorded, total } = day.source;
    // Match DurationTrack's scale: over-target days stay inside their own bar.
    const extent = Math.max(target, total);
    const fraction = (seconds: number) => extent > 0 ? Math.max(0, Math.min(1, seconds / extent)) : 0;
    return { day, recorded: fraction(recorded), filled: fraction(total) };
  });
}
