import { isOwnReport } from "@/domain/rules/report-access";
import type { Report } from "@/domain/report";
import { isDateKey, sourceTimestamp } from "@/domain/rules/calendar";
import { ApiError } from "@/lib/api-client.js";
import { ui } from "@/lib/ui-text.js";

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Treat even a successful HTTP response as untrusted at the client boundary.
export function readReportResponse(
  value: unknown,
  from: string,
  to: string,
): Report {
  const invalid = () =>
    new ApiError(
      ui.apiErrors.responseUnreadable, 200, "INVALID_RESPONSE", {
        apiPath: "/api/report", apiMethod: "GET",
        diagnostic: ui.sourceErrors.reportContractMismatch,
      },
    );
  if (
    !object(value) ||
    value.from !== from ||
    value.to !== to ||
    !object(value.person) ||
    !isOwnReport(value.person.id) ||
    typeof value.person.name !== "string" ||
    !value.person.name.trim() ||
    typeof value.person.unit !== "string" ||
    typeof value.person.title !== "string" ||
    typeof value.fetchedAt !== "string" ||
    !Number.isFinite(Date.parse(value.fetchedAt)) ||
    !Array.isArray(value.passages)
  )
    throw invalid();
  for (const passage of value.passages) {
    if (
      !object(passage) ||
      typeof passage.date !== "string" ||
      passage.date < from ||
      passage.date > to ||
      typeof passage.time !== "string" ||
      sourceTimestamp(passage.date, passage.time) === null ||
      (passage.direction !== "in" && passage.direction !== "out")
    )
      throw invalid();
  }
  if (
    value.pofiNotes !== undefined &&
    (!Array.isArray(value.pofiNotes) ||
      value.pofiNotes.some(
        (note) =>
          !object(note) ||
          typeof note.date !== "string" ||
          !isDateKey(note.date) ||
          typeof note.id !== "string" ||
          !Array.isArray(note.parts) ||
          note.parts.some((part) => typeof part !== "string"),
      ))
  )
    throw invalid();
  return value as Report;
}
