import { isDateKey } from "./calendar";
export const REPORT_ACCESS = Object.freeze({ person: "self", maxDays: 93 });
export function isOwnReport(person: unknown): boolean {
  return person === REPORT_ACCESS.person;
}
export function reportRangeIssue(
  from: unknown,
  to: unknown,
): "invalid" | "too-long" | null {
  if (!isDateKey(from) || !isDateKey(to) || from > to) return "invalid";
  const inclusiveDays = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  return inclusiveDays > REPORT_ACCESS.maxDays ? "too-long" : null;
}
