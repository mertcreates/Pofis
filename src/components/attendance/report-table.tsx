"use client";
import { memo, useState } from "react";
import Icon from "../ui-icon.js";
import { ui } from "@/lib/ui-text.js";
import type { DayReport } from "@/domain/attendance";
import {
  durationClock,
  durationText,
  formatClock,
  formatDate,
} from "@/domain/time";
import { stateLabel } from "./labels";
import { RawPassages } from "./records";

const DayRow = memo(function DayRow({
  day,
  target,
  working,
  today,
}: {
  day: DayReport;
  target: number | null;
  working: boolean;
  today: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = `day-passages-${day.date}`;
  const label = formatDate(day.date);
  const delta =
    (working || day.state === "recorded") &&
    day.state !== "uncertain" &&
    target !== null &&
    day.recordedSeconds !== null
      ? day.recordedSeconds - target
      : null;
  return (
    <>
      <tr
        className={`${day.date === today ? "today-row" : ""} ${day.date > today ? "future-row" : ""}`}
      >
        <th scope="row">
          <div className="report-day">
            <div>
              <span>{label}</span>
              <small>
                {formatDate(day.date, { weekday: "long" })}
                {day.date === today && <> · {ui.today}</>}
              </small>
            </div>
            {day.records.length > 0 && (
              <button
                type="button"
                className="report-day-toggle"
                aria-expanded={expanded}
                aria-controls={id}
                aria-label={ui.recordsForDate(label)}
                onClick={() => setExpanded(!expanded)}
              >
                <span>{ui.passageCount(day.records.length)}</span>
                <Icon name="chevron-down" />
              </button>
            )}
          </div>
        </th>
        <td data-label={ui.firstEntry}>{formatClock(day.firstEntry)}</td>
        <td data-label={ui.lastExit}>{formatClock(day.lastExit)}</td>
        <td className="report-duration" data-label={ui.recordedTime}>
          {day.recordedSeconds === null
            ? ui.emptyValue
            : durationClock(day.recordedSeconds)}
        </td>
        <td className="report-difference" data-label={ui.targetDifference}>
          {delta === null
            ? ui.emptyValue
            : delta === 0
              ? ui.targetEqual
              : `${durationText(Math.abs(delta))} ${delta > 0 ? "fazla" : "eksik"}`}
        </td>
        <td data-label={ui.recordStatus}>
          <span className="report-status">{stateLabel(day)}</span>
          {!working && day.records.length > 0 && (
            <small>{ui.nonWorkingDay}</small>
          )}
        </td>
      </tr>
      {day.records.length > 0 && (
        <tr className="report-detail-row" hidden={!expanded}>
          <td colSpan={6}>
            <div className="day-passages" id={id}>
              {expanded && (
                <>
                  <h3>{ui.recordsForDate(label)}</h3>
                  <RawPassages day={day} />
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
});
export const ReportTable = memo(function ReportTable({
  days,
  plan,
  today,
}: {
  days: DayReport[];
  plan: number[];
  today: string;
}) {
  return (
    <section
      className="records"
      id="entry-exit-report"
      aria-labelledby="records-title"
    >
      <div className="records-title">
        <h2 id="records-title">{ui.entryExitReport}</h2>
      </div>
      <table className="daily-report-table" aria-labelledby="records-title">
        <thead>
          <tr>
            {[
              ui.day,
              ui.firstEntry,
              ui.lastExit,
              ui.recordedTime,
              ui.targetDifference,
              ui.recordStatus,
            ].map((label) => (
              <th scope="col" key={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day, i) => (
            <DayRow
              key={day.date}
              day={day}
              today={today}
              working={plan[i] > 0}
              target={day.source.goalSeconds}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
});
