import { ui } from "@/lib/ui-text.js";
import type { DayReport } from "@/domain/attendance";
function recordIssueLabel(day: DayReport) {
  return day.recordIssues.filter((issue, index, issues) => issues.findIndex(other => other.kind === issue.kind) === index)
    .map(issue => {
      switch (issue.kind) {
        case "repeated-entry": return ui.recordIssues.repeatedEntry(issue.time);
        case "repeated-exit": return ui.recordIssues.repeatedExit(issue.time);
        case "unmatched-exit": return ui.recordIssues.unmatchedExit(issue.time);
        case "missing-exit": return ui.recordIssues.missingExit(issue.time);
        case "invalid-record": return ui.recordIssues.invalidRecord;
      }
    }).join(" ");
}
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
      return recordIssueLabel(day) || ui.recordIssues.inconsistentSummary;
    case "ongoing":
      return [ui.mesaiOngoing, recordIssueLabel(day)].filter(Boolean).join(" ");
    case "open":
      return [ui.lastEntryStatus, recordIssueLabel(day)].filter(Boolean).join(" ");
    case "outside":
      return [ui.lastExitStatus, recordIssueLabel(day)].filter(Boolean).join(" ");
    case "recorded":
      return [ui.recordedDay, recordIssueLabel(day)].filter(Boolean).join(" ");
  }
}
