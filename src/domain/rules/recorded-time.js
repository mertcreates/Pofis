import { secondsOf, dateKey, addDays, weekStart, weekday } from "./calendar";

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
    let status = "missing";
    let duration = null;
    if (date > today) status = "future";
    else if (record === "recorded") {
      status = date === today ? "ongoing" : "complete";
      duration = seconds;
    } else if (date === today && ["open", "empty"].includes(record))
      status = "ongoing";
    else if (record !== "empty") status = "incomplete";
    else if (weekday(date) >= 5) status = "weekend";
    days.push({
      date,
      firstEntry: row?.firstEntry || null,
      lastExit: row?.lastExit || null,
      status,
      duration,
    });
  }
  const weeks = new Map();
  for (const day of days) {
    const start = weekStart(day.date);
    if (!weeks.has(start))
      weeks.set(start, {
        start,
        seconds: 0,
        todaySeconds: 0,
        missing: 0,
        ongoing: false,
        partial: from > start || to < addDays(start, 6),
      });
    const week = weeks.get(start);
    if (day.duration !== null) week.seconds += day.duration;
    if (day.date === today && day.duration !== null)
      week.todaySeconds += day.duration;
    if (["missing", "incomplete"].includes(day.status)) week.missing++;
    if (day.status === "ongoing") week.ongoing = true;
  }
  return {
    days,
    weeks: [...weeks.values()],
  };
}
