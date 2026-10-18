"use client";
import Icon from "../ui-icon.js";
import { ui } from "@/lib/ui-text.js";
import type { DayReport } from "@/domain/attendance";
import { formatClock } from "@/domain/time";

export function RawPassages({ day }: { day: DayReport }) {
  return (
    <ol>
      {day.records.map((record) => (
        <li key={record.id}>
          <time dateTime={record.at}>{formatClock(Date.parse(record.at))}</time>
          <span>
            <Icon
              name="arrow"
              className={`record-icon ${record.direction === "entry" ? "in" : "out"}`}
            />
            {record.direction === "entry" ? ui.entry : ui.exit}
          </span>
        </li>
      ))}
    </ol>
  );
}
