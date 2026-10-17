import { secondsOf, dateKey, addDays, weekStart } from "./calendar";

/**
 * @param {import("../report").SourcePassage[]} passages
 * @returns {{date: string, firstEntry: string|null, lastExit: string|null}[]}
 */
export function recordedRowsFromPassages(passages) {
  const days = new Map();
  for (const event of passages) {
    let day = days.get(event.date);
    if (!day) {
      day = { date: event.date, firstEntry: null, lastExit: null };
      days.set(event.date, day);
    }
    if (
      event.direction === "in" &&
      (day.firstEntry === null || event.time < day.firstEntry)
    )
      day.firstEntry = event.time;
    if (
      event.direction === "out" &&
      (day.lastExit === null || event.time > day.lastExit)
    )
      day.lastExit = event.time;
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function summaryRecord(row) {
  const start = secondsOf(row?.firstEntry);
  const end = secondsOf(row?.lastExit);
  if (!row?.firstEntry && !row?.lastExit)
    return { record: "empty", seconds: null };
  if (
    start === null ||
    (row.lastExit && end === null) ||
    (end !== null && end < start)
  )
    return { record: "uncertain", seconds: null };
  if (end === null) return { record: "open", seconds: null };
  return { record: "recorded", seconds: end - start };
}

export function summarize(passages, from, to, today = dateKey(Date.now())) {
  const rows = recordedRowsFromPassages(passages);
  const data = new Map();
  for (const row of rows) {
    data.set(row.date, row);
  }
  const days = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const row = data.get(date);
    const { record, seconds } = summaryRecord(row);
    days.push({
      date,
      firstEntry: row?.firstEntry || null,
      lastExit: row?.lastExit || null,
      duration: date <= today && record === "recorded" ? seconds : null,
    });
  }
  return {
    days,
    partial: days.length > 0 && (from !== weekStart(from) || to !== addDays(weekStart(to), 6)),
  };
}
