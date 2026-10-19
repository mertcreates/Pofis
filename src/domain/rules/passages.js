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
    const repeated = event.direction === events[index - 1].direction;
    const reversed =
      times[index] !== null &&
      times[index - 1] !== null &&
      times[index] < times[index - 1];
    if (repeated || reversed) {
      unmatched.add(index - 1);
      unmatched.add(index);
    }
  }
  const rows = [];
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    const next = events[index + 1];
    if (!unmatched.has(index) && event.direction === "in") {
      if (next?.direction === "out" && !unmatched.has(index + 1)) {
        rows.push({ type: "interval", entry: event, exit: next });
        index++;
        continue;
      }
      if (!next && date === today && !unmatched.has(index - 1)) {
        rows.push({ type: "open", entry: event });
        continue;
      }
    }
    rows.push({ type: "unmatched", event });
  }
  return rows;
}

export function passageDay(passages, date, today) {
  const events = passages
    .filter((event) => event.date === date)
    .toSorted((a, b) => a.time.localeCompare(b.time));
  const intervals = [];
  let entry = null;
  let ambiguousEntry = false;
  let uncertain = false;
  /** @type {{kind: "invalid-record" | "repeated-entry" | "unmatched-exit" | "missing-exit", time: string | null}[]} */
  const issues = [];
  for (const event of events) {
    const time = secondsOf(event.time);
    if (time === null || !["in", "out"].includes(event.direction)) {
      uncertain = true;
      issues.push({ kind: "invalid-record", time: time === null ? null : event.time });
      continue;
    }
    if (event.direction === "in") {
      if (entry !== null || ambiguousEntry) {
        uncertain = true;
        issues.push({ kind: "repeated-entry", time: event.time });
        ambiguousEntry = true;
        entry = null;
      } else entry = time;
    } else if (ambiguousEntry) {
      ambiguousEntry = false;
    } else if (entry === null) {
      uncertain = true;
      issues.push({ kind: "unmatched-exit", time: event.time });
    } else {
      intervals.push({ start: entry, end: time });
      entry = null;
    }
  }
  if (entry !== null && date !== today) {
    uncertain = true;
    issues.push({ kind: "missing-exit", time: events.findLast(event => event.direction === "in")?.time ?? null });
  }
  return { events, intervals, openEntry: entry, uncertain, issues };
}
