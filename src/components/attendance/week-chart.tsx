import { ui } from "@/lib/ui-text.js";
import type { DayReport } from "@/domain/attendance";
import { chartMaximum } from "@/domain/rules/progress.js";
import {
  durationClock,
  durationText,
  formatDate,
  weekLabel,
} from "@/domain/time";
import { weekday } from "@/domain/rules/calendar";
import { Tooltip } from "../tooltip";
export function WeekChart({
  days,
  today,
  start,
  current,
}: {
  days: DayReport[];
  today: string;
  start: string;
  current: boolean;
}) {
  const visible = days.filter(
    day =>
      day.source.workingDay || day.recordedSeconds !== null || day.liveSeconds !== null,
  );
  const maximum = chartMaximum(visible.map(day => day.source.total));
  const hasLive = visible.some((day) => day.liveSeconds !== null);
  return (
    <section
      className="dashboard-card chart-panel"
      aria-label={ui.weeklyViewLabel(weekLabel(start, false, today))}
    >
      <div className="panel-heading">
        <div>
          <h2>{current ? ui.thisWeekView : ui.selectedWeekView}</h2>
        </div>
        <div className="chart-period">
          <span className="small-label">{weekLabel(start, false, today)}</span>
        </div>
      </div>
      <div className={`weekly-chart ${hasLive ? "has-live" : ""}`}>
        <div className="chart-grid" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((index) => (
            <div
              className="grid-line"
              key={index}
              style={{ top: `${index * 25}%` }}
            >
              <span>
                {index === 4
                  ? "0"
                  : `${(((maximum / 3600) * (4 - index)) / 4).toLocaleString("tr-TR")} ${ui.hourShort}`}
              </span>
            </div>
          ))}
        </div>
        <div
          className="chart-bars"
          style={{
            gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))`,
          }}
        >
          {visible.map((day) => {
            const { recorded, estimated, total } = day.source;
            const live = day.liveSeconds !== null;
            const label = `${formatDate(day.date)}: ${day.recordedSeconds === null ? ui.noRecordedDuration : `${ui.recordedTime} ${durationText(recorded)}`}${live ? `, ${ui.liveTotalLabel} ${durationText(total)}` : ""}`;
            return (
              <Tooltip
                key={day.date}
                className={`chart-column ${day.date === today ? "today" : ""} ${live ? "live" : ""}`}
                label={label}
                anchorSelector=".chart-estimate"
                content={live ? <>
                  <span>{ui.recordedTime}<b>{day.recordedSeconds === null ? ui.noRecordedDuration : durationClock(recorded)}</b></span>
                  <span>{ui.liveTotalLabel}<b>{durationClock(total)}</b></span>
                </> : null}
              >
                <div className="bar-area" aria-hidden="true">
                  <div
                    className="chart-bar"
                    style={{ height: `${(recorded / maximum) * 100}%` }}
                  />
                  {live && (
                    <div
                      className="chart-estimate"
                      style={{
                        bottom: `${(recorded / maximum) * 100}%`,
                        height: `${(estimated / maximum) * 100}%`,
                      }}
                    />
                  )}
                </div>
                <strong>
                  {day.recordedSeconds === null && !live
                    ? ui.emptyValue
                    : durationClock(total)}
                </strong>
                <small>{ui.weekdays[weekday(day.date)].short}</small>
                {live && <span className="chart-live-label">{ui.live}</span>}
              </Tooltip>
            );
          })}
        </div>
      </div>
      <div className="chart-foot">
        <span>
          <i className="dot worked" />
          {ui.dailyRecordedDuration}
        </span>
        {hasLive && (
          <span>
            <i className="dot estimated" />
            {ui.liveEstimateLabel}
          </span>
        )}
      </div>
    </section>
  );
}
