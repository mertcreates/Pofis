import { isOwnReport } from "@/domain/rules/report-access";
import type { Report } from "@/domain/report";
import { isDateKey } from "@/domain/rules/calendar";
import { secondsOf } from "@/domain/rules/calendar";

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
    new Error(
      "Rapor yanıtı beklenen kişi, tarih veya kayıt yapısıyla uyuşmuyor.",
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
      !isDateKey(passage.date) ||
      passage.date < from ||
      passage.date > to ||
      typeof passage.time !== "string" ||
      secondsOf(passage.time) === null ||
      !["in", "out"].includes(String(passage.direction))
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
