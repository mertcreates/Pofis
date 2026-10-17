"use client";
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { targetExitAt } from "@/domain/rules/work-plan";
import { ui } from "@/lib/ui-text.js";
import type { DayReport } from "@/domain/attendance";
import { durationText, formatClock, formatDate } from "@/domain/time";
import { DurationTrack } from "../primitives";
import Icon from "../ui-icon.js";
import { stateLabel } from "./labels";

function positionMarkers(container: HTMLDivElement) {
  const track = container.querySelector<HTMLElement>(".timeline-bar")!;
  const markers = [...container.querySelectorAll<HTMLElement>(".time-marker")];
  if (!markers.length) {
    container.style.removeProperty("padding-top");
    return;
  }
  const bounds = track.getBoundingClientRect();
  const labels = markers.map((marker) => {
    const element = marker.querySelector("span")!;
    const { width, height } = element.getBoundingClientRect();
    const offset = marker.getBoundingClientRect().left - bounds.left;
    const left = Math.max(
      0,
      Math.min(offset - width / 2, bounds.width - width),
    );
    return { element, offset, left, right: left + width, height };
  });
  const [current, previous] = labels;
  const rise =
    previous &&
    current.left < previous.right + 6 &&
    previous.left < current.right + 6
      ? previous.height + 6
      : 0;

  // Finish all geometry reads before changing layout styles.
  for (const label of labels)
    label.element.style.left = `${label.left - label.offset}px`;
  markers[0].style.setProperty("--marker-rise", `${rise}px`);
  container.style.paddingTop = `${20 + Math.max(...labels.map((label) => label.height)) + rise}px`;
}

export function DayFlow({
  day,
  target,
}: {
  day: DayReport;
  target: number | null;
}) {
  const { recorded, estimated, total } = day.source;
  const targetAt = targetExitAt(day.firstEntry, target);
  const hasTarget =
    targetAt !== null && day.firstEntry !== null && targetAt > day.firstEntry;
  const endAt =
    day.firstEntry === null
      ? day.lastExit
      : Math.max(
          day.firstEntry + total * 1000,
          day.lastExit ?? day.firstEntry,
          hasTarget ? targetAt : day.firstEntry,
        );
  const extent =
    day.firstEntry !== null && endAt !== null
      ? Math.max(1, (endAt - day.firstEntry) / 1000)
      : 1;
  const targetPosition =
    hasTarget && target !== null ? (100 * target) / extent : null;
  const targetAtEnd = hasTarget && targetAt === endAt;
  const timeline = useRef<HTMLDivElement>(null);
  const hasRecorded = day.recordedSeconds !== null;
  const live = day.liveSeconds !== null;
  useLayoutEffect(() => {
    const container = timeline.current;
    if (!container || (!live && !hasRecorded)) return;
    const observer = new ResizeObserver(() => positionMarkers(container));
    observer.observe(container.querySelector(".timeline-bar")!);
    for (const label of container.querySelectorAll(".time-marker span"))
      observer.observe(label);
    return () => observer.disconnect();
  }, [live, hasRecorded]);
  useLayoutEffect(() => {
    if (timeline.current) positionMarkers(timeline.current);
  }, [recorded, total, live, hasRecorded, extent]);
  return (
    <section className="dashboard-card progress-panel">
      <div className="panel-heading">
        <div>
          <h2>{ui.dayFlow}</h2>
          <p className="panel-subtitle">
            {formatDate(day.date, {
              day: "numeric",
              month: "long",
              weekday: "long",
            })}
          </p>
        </div>
        <span className="flow-status" role="status">
          {stateLabel(day)}
        </span>
      </div>
      <div className="timeline" ref={timeline}>
        <div
          className="timeline-bar"
          role="img"
          aria-label={`${hasRecorded ? `${ui.recordedTime} ${durationText(recorded)}` : ui.noRecordedDuration}; ${ui.liveEstimateLabel} ${durationText(estimated)}; ${ui.targetLabel} ${target === null ? ui.notCalculated : durationText(target)}`}
        >
          <DurationTrack
            recorded={recorded}
            estimated={estimated}
            total={extent}
          />
          {live && (
            <div
              className="time-marker"
              style={{ left: `${(total / extent) * 100}%` }}
            >
              <span>{ui.now}</span>
            </div>
          )}
          {hasRecorded && (
            <div
              className="time-marker"
              style={{ left: `${(recorded / extent) * 100}%` }}
            >
              <span>{ui.lastRecord}</span>
            </div>
          )}
          {hasTarget && (
            <div
              className="timeline-target-marker"
              style={{ left: `${targetPosition}%` }}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="timeline-axis">
          <span>{formatClock(day.firstEntry)}</span>
          <span>{formatClock(endAt)}</span>
        </div>
        {hasTarget && (
          <div className="timeline-target-axis">
            <span
              className={`timeline-target-label ${targetAtEnd ? "at-end" : ""}`}
              style={
                { "--target-position": `${targetPosition}%` } as CSSProperties
              }
              aria-label={`${ui.targetExit} ${formatClock(targetAt)}`}
            >
              {ui.targetLabel}
              {!targetAtEnd && <time>{formatClock(targetAt)}</time>}
            </span>
          </div>
        )}
      </div>
      <div className="timeline-legend">
        <span>
          <i className="dot worked" />
          {ui.recordedTime}
        </span>
        {live && (
          <span>
            <i className="dot estimated" />
            {ui.liveEstimateLabel}
          </span>
        )}
      </div>
      <dl className="time-details">
        <div>
          <Icon name="clock" />
          <div>
            <dt>{ui.firstEntry}</dt>
            <dd>{formatClock(day.firstEntry)}</dd>
          </div>
        </div>
        <div>
          <Icon name="file" />
          <div>
            <dt>{ui.lastExitRecord}</dt>
            <dd>
              {day.lastExit === null && live
                ? ui.noExitYet
                : formatClock(day.lastExit)}
            </dd>
          </div>
        </div>
      </dl>
    </section>
  );
}
