"use client";

import { durationClock, durationParts, durationText } from "@/domain/time";
import { percentage } from "@/domain/rules/progress.js";
import { ui } from "@/lib/ui-text.js";

export function Duration({ seconds }: { seconds: number | null }) {
  if (seconds === null) return <span className="empty-value">{ui.time.empty}</span>;
  const p = durationParts(seconds);
  return (
    <time
      className="duration"
      title={durationClock(seconds)}
      aria-label={durationText(seconds)}
    >
      {p.hours > 0 && <>{p.hours} <small>{ui.units.hour}</small></>}
      {p.minutes > 0 && <>{p.hours > 0 && " "}{p.minutes} <small>{ui.units.minute}</small></>}
      {p.seconds > 0 && (
        <span className="duration-seconds">
          {(p.hours > 0 || p.minutes > 0) && " "}
          {p.seconds} {ui.units.second}
        </span>
      )}
      {p.hours === 0 && p.minutes === 0 && p.seconds === 0 && <>0 <small>{ui.units.second}</small></>}
    </time>
  );
}

export function DurationTrack({
  recorded,
  estimated = 0,
  total,
  target = null,
}: {
  recorded: number;
  estimated?: number;
  total: number;
  target?: number | null;
}) {
  const recordedPercent =
    total > 0 ? Math.max(0, Math.min(100, (recorded / total) * 100)) : 0;
  const estimatedPercent =
    total > 0
      ? Math.max(0, Math.min(100 - recordedPercent, (estimated / total) * 100))
      : 0;
  const targetPercent =
    target !== null && target > 0 && total > 0
      ? Math.min(100, (target / total) * 100)
      : null;
  return (
    <span
      aria-hidden="true"
      className="duration-track"
    >
      <span
        className="duration-track-recorded"
        style={{ width: `${recordedPercent}%` }}
      />
      <span
        className="duration-track-estimated"
        style={{ width: `${estimatedPercent}%` }}
      />
      {targetPercent !== null && (
        <span
          className="duration-track-target"
          style={{ left: `${targetPercent}%` }}
        />
      )}
    </span>
  );
}

export function Progress({
  recorded,
  estimated = 0,
  target,
  label,
}: {
  recorded: number | null;
  estimated?: number;
  target: number;
  label: string;
}) {
  const seconds = (recorded ?? 0) + estimated;
  const value = percentage(seconds, target);
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, value ?? 0)}
      aria-valuetext={`${recorded === null ? ui.noRecordedDuration : `${ui.recordedTime} ${durationText(recorded)}`}; ${ui.liveEstimateLabel} ${durationText(estimated)}; ${ui.targetLabel} ${durationText(target)}${value === null ? "" : `; %${value}`}`}
    >
      <DurationTrack
        recorded={recorded ?? 0}
        estimated={estimated}
        total={Math.max(target, seconds)}
        target={target}
      />
    </div>
  );
}
