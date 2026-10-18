"use client";

import type { CSSProperties } from "react";
import { targetExitAt } from "@/domain/rules/work-plan";
import { ui } from "@/lib/ui-text.js";
import type { DayReport } from "@/domain/attendance";
import { durationText, formatClock, formatDate } from "@/domain/time";
import { DurationTrack } from "../primitives";
import { stateLabel } from "./labels";
import "./day-flow.css";

export function DayFlow({ day, target }: { day: DayReport; target: number | null }) {
  const { recorded, estimated, total } = day.source;
  const live = day.liveSeconds !== null;
  const hasRecorded = day.recordedSeconds !== null;
  const hasDuration = hasRecorded || live;
  const targetAt = targetExitAt(day.firstEntry, target);
  const endAt = day.firstEntry === null ? day.lastExit : Math.max(
    day.firstEntry + total * 1000,
    day.lastExit ?? day.firstEntry,
    targetAt ?? day.firstEntry,
  );
  const extent = day.firstEntry !== null && endAt !== null
    ? Math.max(1, (endAt - day.firstEntry) / 1000) : 1;
  const targetAtEnd = targetAt !== null && targetAt === endAt;
  const pastTarget = !live && hasRecorded && target !== null && recorded > target;
  const summary = `${hasRecorded ? `${ui.recordedTime} ${durationText(recorded)}` : ui.noRecordedDuration}; ${ui.liveEstimateLabel} ${durationText(estimated)}; ${ui.targetLabel} ${target === null ? ui.notCalculated : durationText(target)}`;

  return (
    <section className="dashboard-card progress-panel day-flow-rail">
      <div className="panel-heading">
        <div className="rail-heading-text">
          <h2>{ui.dayFlow}</h2>
          {!live && day.state !== "outside" && <span className="rail-status" role="status">
            <i aria-hidden="true" />{stateLabel(day)}
          </span>}
        </div>
        <time className="rail-date" dateTime={day.date}>
          {formatDate(day.date, { day: "numeric", month: "long", weekday: "long" })}
        </time>
      </div>
      <div className="rail-chart" role="img" aria-label={summary}>
        <div className="rail-track" style={{
          "--rail-position": `${total / extent * 100}cqw`,
          "--rail-target-position": `${(target ?? 0) / extent * 100}cqw`,
        } as CSSProperties}>
          <DurationTrack recorded={recorded} estimated={estimated} total={extent} />
          {hasDuration && (
            <>
              <span className="rail-marker-label"><span>{live ? ui.now : pastTarget ? ui.exit : ui.lastRecord}</span></span>
              <span className="rail-end-marker" aria-hidden="true" />
            </>
          )}
          {targetAt !== null && <span className="rail-target-line" aria-hidden="true" />}
        </div>
        <div className="rail-axis">
          <span>{formatClock(day.firstEntry)}</span>
          <span>{!targetAtEnd && formatClock(endAt)}</span>
        </div>
        {targetAt !== null && (
          <div className="rail-target-row" style={{ "--rail-target-position": `${(target ?? 0) / extent * 100}cqw` } as CSSProperties}>
            <div className="rail-target-label"><span>{ui.targetLabel}</span><time>{formatClock(targetAt)}</time></div>
          </div>
        )}
      </div>
      <div className="rail-legend">
        <span><i aria-hidden="true" />{ui.recordedTime}</span>
        {live && <span title={ui.liveEstimateDescription}><i aria-hidden="true" />{ui.liveEstimateLabel}</span>}
      </div>
    </section>
  );
}
