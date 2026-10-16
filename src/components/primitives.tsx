"use client";

import type { CSSProperties } from "react";
export { default as Modal } from "./archive-modal";
import { durationClock, durationParts, durationText } from "@/domain/time";
import { percentage } from "@/domain/rules/progress.js";

export function Duration({ seconds }: { seconds: number | null }) {
  if (seconds === null) return <span className="empty-value">–</span>;
  const p = durationParts(seconds);
  return (
    <time
      className="duration"
      title={durationClock(seconds)}
      aria-label={durationText(seconds)}
    >
      {p.hours} <small>sa</small> {String(p.minutes).padStart(2, "0")}{" "}
      <small>dk</small>
      {p.seconds > 0 && (
        <span className="duration-seconds">
          {" "}
          {String(p.seconds).padStart(2, "0")} sn
        </span>
      )}
    </time>
  );
}

export function DurationTrack({
  recorded,
  estimated = 0,
  total,
  target = null,
  vertical = false,
  className = "",
  style,
}: {
  recorded: number;
  estimated?: number;
  total: number;
  target?: number | null;
  vertical?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const recordedPercent =
    total > 0 ? Math.max(0, Math.min(100, (recorded / total) * 100)) : 0;
  const estimatedPercent =
    total > 0
      ? Math.max(0, Math.min(100 - recordedPercent, (estimated / total) * 100))
      : 0;
  const dimension = vertical ? "height" : "width";
  const targetPercent =
    target !== null && target > 0 && total > 0
      ? Math.min(100, (target / total) * 100)
      : null;
  return (
    <span
      aria-hidden="true"
      className={`duration-track ${vertical ? "duration-track-vertical" : ""} ${className}`}
      style={style}
    >
      <span
        className="duration-track-recorded"
        style={{ [dimension]: `${recordedPercent}%` }}
      />
      <span
        className="duration-track-estimated"
        style={{ [dimension]: `${estimatedPercent}%` }}
      />
      {targetPercent !== null && (
        <span
          className="duration-track-target"
          style={{ [vertical ? "bottom" : "left"]: `${targetPercent}%` }}
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
  recorded: number;
  estimated?: number;
  target: number;
  label: string;
}) {
  const seconds = recorded + estimated;
  const value = percentage(seconds, target);
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, value ?? 0)}
      aria-valuetext={`Kayda dayalı ${durationText(recorded)}; anlık tahmin ${durationText(estimated)}; ${target > 0 ? `hedef ${durationText(target)}; %${value}` : "hedef yok"}`}
    >
      <DurationTrack
        recorded={recorded}
        estimated={estimated}
        total={Math.max(target, seconds)}
        target={target}
      />
    </div>
  );
}
