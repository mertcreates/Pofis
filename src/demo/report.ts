import snapshot from "./passages.json";
import { addDays, dateKey, weekStart } from "@/domain/rules/calendar";
import { readReportResponse } from "@/data/report-response";
import { pofiNotesForWeek } from "@/server/pofi-notes.js";

// Keep the captured clock with the data so scenarios remain stable over time.
export function demoData() {
  const now = Date.parse(snapshot.capturedAt);
  const today = dateKey(now);
  const firstWeek = weekStart(snapshot.from);
  const reports = [];
  for (
    let from = firstWeek;
    from <= weekStart(today);
    from = addDays(from, 7)
  ) {
    const to = addDays(from, 6);
    const pofiNotes = pofiNotesForWeek(to < today ? to : today, "pofis-demo");
    reports.push(
      readReportResponse(
        {
          person: { id: "self", name: "Örnek kullanıcı", unit: "", title: "" },
          from,
          to,
          fetchedAt: snapshot.capturedAt,
          passages: snapshot.passages.filter(
            (event) => event.date >= from && event.date <= to,
          ),
          pofiNotes,
        },
        from,
        to,
      ),
    );
  }
  return { now, firstWeek, reports };
}
