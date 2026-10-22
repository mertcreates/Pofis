import { formatClock, formatDate } from "@/domain/time";
import { dateKey } from "@/domain/rules/calendar";
import { ui } from "@/lib/ui-text.js";
import { EXTRA_TIME_STEP_MINUTES } from "./navigation";

export function DemoDayPicker({
  dates,
  selected,
  now,
  capturedAt,
  extraMinutes,
  maxExtraMinutes,
  onExtraMinutesChange,
  onSelect,
}: {
  dates: string[];
  selected: string;
  now: number;
  capturedAt: number;
  extraMinutes: number;
  maxExtraMinutes: number;
  onExtraMinutesChange: (minutes: number) => void;
  onSelect: (date: string) => void;
}) {
  const capturedDate = dateKey(capturedAt);
  const extraTimeLabel = formatExtraTime(extraMinutes);
  return (
    <div className="demo-day-navigation">
      <div className="demo-days" role="group" aria-label={ui.demo.dayPicker}>
        {dates.map((date) => (
          <button
            key={date}
            type="button"
            aria-pressed={selected === date}
            aria-label={formatDate(date, {
              day: "numeric",
              month: "long",
              weekday: "long",
            })}
            onClick={() => onSelect(date)}
          >
            <span>{formatDate(date, { weekday: "short" })}</span>
            <strong>
              {formatDate(date, { day: "numeric", month: "short" })}
            </strong>
          </button>
        ))}
      </div>
      <div className="demo-day-context">
        <p aria-live="polite" aria-atomic="true">
          {ui.demo.previewDate(formatDate(selected))}
          <span>
            {extraMinutes > 0
              ? ui.demo.simulatedTime(formatClock(now, false))
              : selected === capturedDate
              ? ui.demo.captureTime(formatClock(now, false))
              : ui.demo.dayEnd}
          </span>
        </p>
      </div>
      <div className="demo-extra-time">
        <div className="demo-extra-time-heading">
          <label htmlFor="demo-extra-time">{ui.demo.extraTime}</label>
          <output htmlFor="demo-extra-time">{extraTimeLabel}</output>
        </div>
        <input
          id="demo-extra-time"
          type="range"
          min={0}
          max={Math.max(maxExtraMinutes, EXTRA_TIME_STEP_MINUTES)}
          step={EXTRA_TIME_STEP_MINUTES}
          value={extraMinutes}
          aria-valuetext={extraTimeLabel}
          disabled={maxExtraMinutes === 0}
          onChange={(event) =>
            onExtraMinutesChange(Number(event.currentTarget.value))
          }
        />
      </div>
    </div>
  );
}

function formatExtraTime(minutes: number) {
  if (minutes === 0) return ui.demo.extraTimeOff;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} dk`;
  if (remainder === 0) return `${hours} saat`;
  return `${hours} sa ${remainder} dk`;
}
