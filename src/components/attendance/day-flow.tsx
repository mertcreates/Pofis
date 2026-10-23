"use client";

import type { CSSProperties } from "react";
import { targetExitAt } from "@/domain/rules/work-plan";
import { dateKey } from "@/domain/rules/calendar";
import { ui } from "@/lib/ui-text.js";
import type { DayReport } from "@/domain/attendance";
import { durationText, formatClock, formatDate, formatDateLabel } from "@/domain/time";
import { Duration, DurationTrack } from "../primitives";
import { stateLabel } from "./labels";
import "./day-flow.css";

function FlowTime({ at, date }: { at: number; date: string }) {
  const otherDay = dateKey(at) !== date ? formatDateLabel(dateKey(at), date) : null;
  const label = `${formatClock(at)}${otherDay ? ` · ${otherDay}` : ""}`;
  const seconds = formatClock(at).slice(-2);
  return <time dateTime={new Date(at).toISOString()} title={label} aria-label={label}>
    {formatClock(at, false)}
    {seconds !== "00" && <small className="rail-clock-seconds">:{seconds}</small>}
    {otherDay && <small className="rail-other-day">{otherDay}</small>}
  </time>;
}

export function DayFlow({ day, target, onOpenRecords }: { day: DayReport; target: number | null; onOpenRecords: () => void }) {
  const { recorded, estimated, total } = day.source;
  const live = day.liveSeconds !== null;
  const hasRecorded = day.recordedSeconds !== null;
  const hasDuration = hasRecorded || live;
  const hasBlockingRecordIssue = day.recordIssues.some(
    ({ kind }) => kind === "invalid-record" || kind === "missing-exit",
  );
  const isUncertain = day.state === "uncertain";
  const showRecordWarning = isUncertain && (!hasDuration || hasBlockingRecordIssue);
  const status = isUncertain
    ? showRecordWarning ? ui.incompleteRecord : null
    : !hasDuration || (!live && day.state !== "outside")
      ? stateLabel(day, false)
      : null;
  const targetAt = targetExitAt(day.firstEntry, target);
  const showMetrics = hasDuration || targetAt !== null;
  const delta = targetAt !== null && target !== null && hasDuration ? total - target : null;
  const markerAt = live && day.firstEntry !== null ? day.firstEntry + total * 1000 : day.lastExit;
  const endAt = day.firstEntry === null ? day.lastExit : Math.max(
    day.firstEntry + total * 1000,
    day.lastExit ?? day.firstEntry,
    targetAt ?? day.firstEntry,
  );
  const extent = day.firstEntry !== null && endAt !== null
    ? Math.max(1, (endAt - day.firstEntry) / 1000) : 1;
  const targetPosition = (target ?? 0) / extent;
  const summary = `${hasRecorded ? `${ui.recordedTime} ${durationText(recorded)}` : ui.noRecordedDuration}; ${ui.liveEstimateLabel} ${durationText(estimated)}; ${ui.targetLabel} ${target === null ? ui.notCalculated : durationText(target)}`;

  return <section className="dashboard-card progress-panel day-flow-rail">
    <div className="panel-heading">
      <h2>{ui.dayFlow}</h2>
      <time className="rail-date" dateTime={day.date}>
        {formatDate(day.date, { day: "numeric", month: "long", weekday: "long" })}
      </time>
    </div>
    {status && <div className={`rail-status${showRecordWarning ? " has-record-issue" : ""}${!showMetrics ? " rail-empty" : ""}`}>
      <span role="status">{status}</span>
      {showRecordWarning && <button type="button" className="rail-records-link" onClick={onOpenRecords}>{ui.openRecords}</button>}
    </div>}
    {showMetrics && <dl className="rail-elapsed">
        <div className="rail-work">
          <dt>{ui.todayWork}</dt>
          <dd><Duration seconds={hasDuration ? total : null} /></dd>
        </div>
        {delta !== null && <div className="rail-target-delta">
          <dt>{delta === 0 ? ui.targetEqual : delta > 0 ? ui.targetOver : ui.targetRemaining}</dt>
          <dd hidden={delta === 0}>{delta !== 0 && <Duration seconds={Math.abs(delta)} />}</dd>
        </div>}
        {!hasDuration && targetAt !== null && <div className="rail-exit-goal">
          <dt>{ui.targetExit}</dt>
          <dd>
            <FlowTime at={targetAt} date={day.date} />
          </dd>
        </div>}
      </dl>}
    {hasDuration && <>
      <div className="rail-chart" style={{
          "--rail-position": `${total / extent * 100}cqw`,
          "--rail-target-position": `${targetPosition * 100}cqw`,
        } as CSSProperties}>
        <div className="rail-marker-label">
          <span>{live ? ui.now : ui.lastExit}</span>
          {markerAt !== null && <FlowTime at={markerAt} date={day.date} />}
        </div>
        <div className="rail-track" role="img" aria-label={summary}>
          <DurationTrack recorded={recorded} estimated={estimated} total={extent} />
          {targetAt !== null && <span className="rail-target-line" aria-hidden="true" />}
          <span className="rail-end-marker" aria-hidden="true" />
        </div>
        <dl className={`rail-axis${targetAt !== null && targetPosition < 0.5 ? " rail-axis-target-left" : ""}`}>
          {day.firstEntry !== null && <div className="rail-first-entry">
            <dt>{ui.firstEntry}</dt>
            <dd><FlowTime at={day.firstEntry} date={day.date} /></dd>
          </div>}
          {targetAt !== null && <div className="rail-target-label">
            <dt>{ui.targetExit}</dt>
            <dd><FlowTime at={targetAt} date={day.date} /></dd>
          </div>}
        </dl>
      </div>
      <div className="rail-legend">
        {hasRecorded && <span><i aria-hidden="true" />{ui.recordedShort}</span>}
        {live && estimated > 0 && <span title={ui.liveEstimateDescription}><i className="rail-estimated-dot" aria-hidden="true" />{ui.estimatedShort}</span>}
      </div>
    </>}
  </section>;
}
