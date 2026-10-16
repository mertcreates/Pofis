import { isDateKey, weekStart, weekDates, weekday } from "./calendar";
export function isNotebookDate(
  date: string,
  specialDates: readonly string[],
): boolean {
  return (
    isDateKey(date) &&
    (weekday(date) < 5 || specialDates.includes(date.slice(5)))
  );
}
export function pofiNotebookDates(
  today: string,
  specialDates: readonly string[],
): string[] {
  return weekDates(weekStart(today)).filter((date) =>
    isNotebookDate(date, specialDates),
  );
}
export function defaultNotebookDate(
  today: string,
  dates: readonly string[],
): string {
  return dates.includes(today)
    ? today
    : dates.filter((date) => weekday(date) < 5).at(-1)!;
}
