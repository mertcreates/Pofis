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
      return day.recordIssues.length > 0
        ? day.recordIssues.filter((issue, index, issues) => issues.findIndex(other => other.kind === issue.kind) === index)
          .map(issue => {
            switch (issue.kind) {
              case "repeated-entry": return ui.recordIssues.repeatedEntry(issue.time);
              case "unmatched-exit": return ui.recordIssues.unmatchedExit(issue.time);
              case "missing-exit": return ui.recordIssues.missingExit(issue.time);
              case "invalid-record": return ui.recordIssues.invalidRecord;
            }
          }).join(" ")
        : ui.recordIssues.inconsistentSummary;
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
