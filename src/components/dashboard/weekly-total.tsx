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

export function WeeklyTotal({ days, target, summary, isCurrent }: {
  days: DayReport[];
  target: number;
  summary: ReturnType<typeof summarizeWeek>;
  isCurrent: boolean;
}) {
  const percent = target > 0 ? percentage(summary.totalSeconds, target) : null;
  const segments = isCurrent ? weeklyRuler(days) : [];
  const difference = summary.totalSeconds - target;
  const differenceLabel = difference === 0 ? ui.equalTargetLabel
    : difference > 0 ? ui.excessLabel
    : isCurrent ? ui.remainingLabel : ui.shortfallLabel;
  return <section className="dashboard-card metric weekly-total">
    <div className="metric-header">
      <span>{ui.weeklyTotal}</span>
      {percent !== null && <span className="metric-tag" aria-label={summary.incomplete ? ui.approximateWeekPercent(percent) : undefined}>{summary.incomplete && "≈ "}%{percent}</span>}
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
    {(!isCurrent || !summary.incomplete) && <dl className="weekly-total-difference">
      <dt>{differenceLabel}</dt>
      <dd aria-label={summary.incomplete ? ui.approximateWeekDifference(durationText(Math.abs(difference))) : undefined}>{summary.incomplete && "≈ "}<Duration seconds={Math.abs(difference)} /></dd>
    </dl>}
  </section>;
}
