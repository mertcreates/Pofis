import type { CSSProperties } from "react";
import type { DayReport } from "@/domain/attendance";
import { weekday } from "@/domain/rules/calendar";
import { percentage } from "@/domain/rules/progress.js";
import { summarizeWeek } from "@/domain/rules/week";
import { durationText } from "@/domain/time";
import { ui } from "@/lib/ui-text.js";
import { Duration } from "../primitives";
import { Tooltip } from "../tooltip";
import { weeklyRuler } from "./weekly-ruler";
import "./weekly-total.css";

export function WeeklyTotal({ days, target, summary, showDifference }: {
  days: DayReport[];
  target: number;
  summary: ReturnType<typeof summarizeWeek>;
  showDifference: boolean;
}) {
  const percent = target > 0 ? percentage(summary.totalSeconds, target) : null;
  const segments = weeklyRuler(days);
  return <section className="dashboard-card metric weekly-total">
    <div className="metric-header">
      <span>{ui.weeklyTotal}</span>
      {percent !== null && <span className="metric-tag">{summary.incomplete && "≈ "}%{percent}</span>}
    </div>
    <div className="weekly-total-reading">
      <div className="metric-value"><Duration seconds={summary.totalSeconds} /></div>
      <span className="weekly-total-target" aria-label={`${ui.targetLabel}: ${durationText(target)}`}><span aria-hidden="true">/ </span><Duration seconds={target} /></span>
    </div>
    {segments.length > 0 && <>
      <div className="weekly-ruler" style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}>
        {segments.map(segment => {
          const { day } = segment;
          const name = ui.weekdays[weekday(day.date)];
          const known = day.recordedSeconds !== null || day.liveSeconds !== null;
          const actual = known ? `${day.state === "uncertain" ? "≈ " : ""}${durationText(day.source.total)}` : ui.noRecordedDuration;
          return <Tooltip key={day.date} className="weekly-ruler-day" label={name.long} content={<>
            <span className="pofis-tooltip-heading">{name.long}</span>
            <span>{actual} / {durationText(day.source.dailyGoalSeconds)}</span>
          </>}>
            <span className="weekly-ruler-tick" aria-hidden="true" style={{ "--ruler-recorded": `${segment.recorded * 100}%`, "--ruler-filled": `${segment.filled * 100}%` } as CSSProperties} />
            <span aria-hidden="true">{name.short}</span>
          </Tooltip>;
        })}
      </div>
    </>}
    {showDifference && !summary.incomplete && <dl className="weekly-total-difference"><dt>{summary.totalSeconds >= target ? ui.excessLabel : ui.remainingLabel}</dt><dd><Duration seconds={Math.abs(target - summary.totalSeconds)} /></dd></dl>}
    {summary.incomplete && <p className="metric-hint">{ui.availableRecordsTotal}</p>}
  </section>;
}
