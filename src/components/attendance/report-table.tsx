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
  onLeave,
}: {
  day: DayReport;
  target: number | null;
  working: boolean;
  today: string;
  compact: boolean;
  onLeave: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const id = `day-passages-${day.date}`;
  const label = formatDate(day.date);
  if (day.date > today) {
    const content = <div className="report-future-day">
      <span className="report-accordion-date">{label} <small>{formatDate(day.date, { weekday: "long" })}</small></span>
      <span className="report-status">{onLeave ? ui.planner.onLeave : ui.reportFutureDay}</span>
    </div>;
    return compact
      ? <div className="report-accordion-day future-row">{content}</div>
      : <tr className="future-row"><th colSpan={6} className="report-future-cell">{content}</th></tr>;
  }
  const hasDetails = day.records.length > 0 || day.state === "uncertain" || day.recordIssues.length > 0;
  const detailLabel = day.records.length > 0 ? ui.recordsForDate(label) : ui.recordStatus;
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
      <details className={`report-accordion-day${day.date === today ? " is-today" : ""}`}
        onToggle={event => { if (event.currentTarget.open) setDetailsLoaded(true); }}>
        <summary>
          <span className="report-accordion-heading">
            <span className="report-accordion-date">{label} <small>{formatDate(day.date, { weekday: "long" })}{day.date === today && <> · {ui.today}</>}</small></span>
            <span className="report-accordion-clocks">
              <span>{ui.firstEntry}{" "}<time>{formatClock(day.firstEntry)}</time></span>
              <span>{ui.lastExit}{" "}<time>{formatClock(day.lastExit)}</time></span>
            </span>
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
          {detailsLoaded && day.records.length > 0 && <div className="day-passages"><h3>{ui.recordsForDate(label)}</h3><RawPassages day={day} /></div>}
        </div>
      </details>
    );
  }
  return (
    <>
      <tr
        className={day.date === today ? "today-row" : ""}
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
            {hasDetails && (
              <button
                type="button"
                className="report-day-toggle"
                aria-expanded={expanded}
                aria-controls={id}
                aria-label={detailLabel}
                onClick={() => setExpanded(!expanded)}
              >
                <span>{day.records.length > 0 ? ui.passageCount(day.records.length) : ui.recordStatus}</span>
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
          <span className="report-status">{stateLabel(day, false)}</span>
          {!working && day.records.length > 0 && (
            <small>{ui.nonWorkingDay}</small>
          )}
        </td>
      </tr>
      {hasDetails && (
        <tr className="report-detail-row" hidden={!expanded}>
          <td colSpan={6}>
            <div className="day-passages" id={id}>
              {expanded && (
                <>
                  <h3>{detailLabel}</h3>
                  {(day.state === "uncertain" || day.recordIssues.length > 0) && <p className="report-detail-status">{stateLabel(day)}</p>}
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
  leaveDays,
}: {
  days: DayReport[];
  today: string;
  compact?: boolean;
  leaveDays: readonly number[];
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
          <DayRow key={day.date} day={day} today={today} compact onLeave={leaveDays.includes(weekday(day.date))} working={day.source.workingDay} target={day.source.dailyGoalSeconds} />
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
              onLeave={leaveDays.includes(weekday(day.date))}
              working={day.source.workingDay}
              target={day.source.dailyGoalSeconds}
            />
          ))}
        </tbody>
      </table>}
    </section>
  );
});
