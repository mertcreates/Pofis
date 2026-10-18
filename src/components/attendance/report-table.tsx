"use client";
import { memo, useState } from "react";
import Icon from "../ui-icon.js";
import { ui } from "@/lib/ui-text.js";
import type { DayReport } from "@/domain/attendance";
import { weekday } from "@/domain/rules/calendar";
import {
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
  compact,
}: {
  day: DayReport;
  target: number | null;
  working: boolean;
  today: string;
  compact: boolean;
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
  const difference = delta === null
    ? ui.emptyValue
    : delta === 0
      ? ui.targetEqual
      : `${durationText(Math.abs(delta))} ${delta > 0 ? "fazla" : "eksik"}`;
  if (compact) {
    const live = day.liveSeconds !== null;
    const seconds = live ? day.source.total : day.recordedSeconds;
    return (
      <details className={`report-accordion-day${day.date === today ? " is-today" : ""}${day.date > today ? " future-row" : ""}`}>
        <summary>
          <span className="report-accordion-heading">
            <span className="report-accordion-date">{label} <small>{formatDate(day.date, { weekday: "long" })}{day.date === today && <> · {ui.today}</>}</small></span>
            <span className="report-accordion-clocks">
              <span>{ui.firstEntry}{" "}<time>{formatClock(day.firstEntry)}</time></span>
              <span>{ui.lastExit}{" "}<time>{formatClock(day.lastExit)}</time></span>
            </span>
            {day.state === "uncertain" && <span className="report-accordion-warning">{stateLabel(day)}</span>}
          </span>
          <span className="report-accordion-total"><span className="report-duration">{seconds === null ? ui.emptyValue : durationText(seconds)}</span><small>{live ? ui.live : ui.recordedTime}</small></span>
          <Icon name="chevron-down" />
        </summary>
        <div className="report-accordion-detail">
          <dl className="report-day-facts">
            <div><dt>{ui.recordedTime}</dt><dd>{day.recordedSeconds === null ? ui.emptyValue : durationText(day.recordedSeconds)}</dd></div>
            <div><dt>{ui.targetDifference}</dt><dd>{difference}</dd></div>
            <div><dt>{ui.recordStatus}</dt><dd>{stateLabel(day)}{!working && day.records.length > 0 && <small>{ui.nonWorkingDay}</small>}</dd></div>
          </dl>
          {day.records.length > 0 && <div className="day-passages"><h3>{ui.recordsForDate(label)}</h3><RawPassages day={day} /></div>}
        </div>
      </details>
    );
  }
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
            {(day.records.length > 0) && (
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
            : durationText(day.recordedSeconds)}
        </td>
        <td className="report-difference" data-label={ui.targetDifference}>
          {difference}
        </td>
        <td data-label={ui.recordStatus}>
          <span className="report-status">{stateLabel(day)}</span>
          {!working && day.records.length > 0 && (
            <small>{ui.nonWorkingDay}</small>
          )}
        </td>
      </tr>
      {(day.records.length > 0) && (
        <tr className="report-detail-row" hidden={!expanded}>
          <td colSpan={6}>
            <div className="day-passages" id={id}>
              {expanded && (
                <>
                  <h3>{ui.recordsForDate(label)}</h3>
                  {day.records.length > 0 && <RawPassages day={day} />}
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
  today,
  compact = false,
}: {
  days: DayReport[];
  today: string;
  compact?: boolean;
}) {
  return (
    <section
      className={`records${compact ? " records-compact" : ""}`}
      id="entry-exit-report"
      aria-labelledby="records-title"
    >
      <div className="records-title">
        <h2 id="records-title">{ui.entryExitReport}</h2>
      </div>
      {compact ? <div className="report-accordion">
        {days.filter(day => weekday(day.date) < 5 || day.records.length > 0 || day.recordedSeconds !== null || day.liveSeconds !== null).map(day => (
          <DayRow key={day.date} day={day} today={today} compact working={day.source.workingDay} target={day.source.dailyGoalSeconds} />
        ))}
      </div> : <table className="daily-report-table" aria-labelledby="records-title">
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
          {days.filter(day => weekday(day.date) < 5 || day.records.length > 0 || day.recordedSeconds !== null || day.liveSeconds !== null).map(day => (
            <DayRow
              key={day.date}
              day={day}
              today={today}
              compact={compact}
              working={day.source.workingDay}
              target={day.source.dailyGoalSeconds}
            />
          ))}
        </tbody>
      </table>}
    </section>
  );
});
