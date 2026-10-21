import { secondsOf } from "./calendar";
export function passageRecordRows(passages, date, today) {
  const events = passages.filter((event) => event.date === date);
  const times = events.map((event) => secondsOf(event.time));
  const unmatched = new Set();
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    if (times[index] === null || !["in", "out"].includes(event.direction))
      unmatched.add(index);
    if (index === 0) continue;
    const reversed =
      times[index] !== null &&
      times[index - 1] !== null &&
      times[index] < times[index - 1];
    if (reversed) {
      unmatched.add(index - 1);
      unmatched.add(index);
    }
  }
  const rows = [];
  let pending = null;
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    if (unmatched.has(index)) {
      if (pending) rows.push({ type: "unmatched", event: pending });
      rows.push({ type: "unmatched", event });
      pending = null;
    } else if (event.direction === "in") {
      if (pending) rows.push({ type: "unmatched", event: pending });
      pending = event;
    } else if (pending) {
      rows.push({ type: "interval", entry: pending, exit: event });
      pending = null;
    } else {
      rows.push({ type: "unmatched", event });
    }
  }
  if (pending) rows.push(date === today ? { type: "open", entry: pending } : { type: "unmatched", event: pending });
  return rows;
}

export function passageDay(passages, date, today) {
  const events = passages
    .filter((event) => event.date === date)
    .toSorted((a, b) => a.time.localeCompare(b.time));
  const intervals = [];
  let entry = null;
  let previousDirection = null;
  let uncertain = false;
  /** @type {{kind: "invalid-record" | "repeated-entry" | "repeated-exit" | "unmatched-exit" | "missing-exit", time: string | null}[]} */
  const issues = [];
  for (const event of events) {
    const time = secondsOf(event.time);
    if (time === null || !["in", "out"].includes(event.direction)) {
      uncertain = true;
      issues.push({ kind: "invalid-record", time: time === null ? null : event.time });
      previousDirection = null;
      continue;
    }
    if (event.direction === "in") {
      if (entry !== null)
        issues.push({ kind: "repeated-entry", time: event.time });
      entry = time;
    } else if (entry === null) {
      if (previousDirection === "out") issues.push({ kind: "repeated-exit", time: event.time });
      else {
        uncertain = true;
        issues.push({ kind: "unmatched-exit", time: event.time });
      }
    } else {
      intervals.push({ start: entry, end: time });
      entry = null;
    }
    previousDirection = event.direction;
  }
  if (entry !== null && date !== today) {
    uncertain = true;
    issues.push({ kind: "missing-exit", time: events.findLast(event => event.direction === "in")?.time ?? null });
  }
  const hasReliableOpenEntry = entry !== null && !issues.some(issue => issue.kind === "invalid-record");
  return { events, intervals, openEntry: entry, hasReliableOpenEntry, uncertain, issues };
}
