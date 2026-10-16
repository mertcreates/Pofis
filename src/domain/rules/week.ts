import { type DayReport } from "../attendance";

export function summarizeWeek(days: readonly DayReport[], today: string) {
  let recorded = 0;
  let incomplete = false;
  let recordedDays = 0;
  let estimatedSeconds = 0;
  for (const day of days) {
    if (day.date > today) continue;
    estimatedSeconds += day.source.estimated;
    if (day.state === "uncertain" || day.state === "missing") incomplete = true;
    if (day.firstEntry !== null || day.lastExit !== null) recordedDays++;
    if (day.recordedSeconds !== null) {
      recorded += day.recordedSeconds;
    }
  }
  return {
    recordedSeconds: recorded,
    liveExtraSeconds: estimatedSeconds,
    totalSeconds: recorded + estimatedSeconds,
    incomplete,
    recordedDays,
    estimatedSeconds,
  };
}
