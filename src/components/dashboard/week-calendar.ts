import { addDays, weekStart } from "@/domain/rules/calendar";

// Starting on day one prevents short months from overflowing.
export function shiftMonth(month: string, offset: number): string {
  const date = new Date(month.slice(0, 7) + "-01T12:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 10);
}

export function monthWeeks(month: string): string[] {
  const lastDay = addDays(shiftMonth(month, 1), -1);
  const weeks: string[] = [];
  for (
    let start = weekStart(month);
    start <= lastDay;
    start = addDays(start, 7)
  )
    weeks.push(start);
  return weeks;
}
