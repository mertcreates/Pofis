import { ui } from "@/lib/ui-text.js";
import type { DayReport } from "@/domain/attendance";
export function stateLabel(day: DayReport) {
  switch (day.state) {
    case "future":
      return ui.future;
    case "non-working":
      return ui.nonWorkingDay;
    case "awaiting-entry":
      return ui.awaitingEntry;
    case "missing":
      return ui.noRecord;
    case "uncertain":
      return ui.incompleteRecord;
    case "ongoing":
      return ui.mesaiOngoing;
    case "open":
      return ui.lastEntryStatus;
    case "outside":
      return ui.lastExitStatus;
    case "recorded":
      return ui.recordedDay;
  }
}
export function passageSummary(day: DayReport) {
  const closedIntervals = day.intervals.filter(
    (interval) => interval.entry !== null && interval.exit !== null,
  );
  return ui.passageOverview(day.records.length, closedIntervals.length);
}
