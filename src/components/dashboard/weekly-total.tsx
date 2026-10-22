import type { CSSProperties } from "react";
import { TriangleAlert } from "lucide-react";
import type { DayReport } from "@/domain/attendance";
import { weekday } from "@/domain/rules/calendar";
import { percentage } from "@/domain/rules/progress.js";
import { summarizeWeek } from "@/domain/rules/week";
import { durationText } from "@/domain/time";
import { ui } from "@/lib/ui-text.js";
import { Duration } from "../primitives";
import { Tooltip } from "../tooltip";
import { stateLabel } from "../attendance/labels";
import { weeklyRuler } from "./weekly-ruler";
import "./weekly-total.css";

export function WeeklyTotal({ days, target, summary, isCurrent, leaveDays, today, onSelectDay }: {
  days: DayReport[];
  target: number;
  summary: ReturnType<typeof summarizeWeek>;
  isCurrent: boolean;
  leaveDays: readonly number[];
  today: string;
  onSelectDay: (date: string) => void;
}) {
  const percent = target > 0 ? percentage(summary.totalSeconds, target) : null;
  const segments = isCurrent ? weeklyRuler(days, leaveDays) : [];
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
          const { day, onLeave } = segment;
          const name = ui.weekdays[weekday(day.date)];
          const known = day.recordedSeconds !== null || day.liveSeconds !== null;
          const isToday = day.date === today;
          const future = day.date > today && !known;
          const recordIssue = day.state === "missing" || day.state === "uncertain";
          const status = recordIssue ? stateLabel(day, false) : null;
          const approximate = day.state === "uncertain" ? "≈ " : "";
          const actual = known ? `${approximate}${durationText(day.source.total)}` : ui.noRecordedDuration;
          const heading = isToday ? `${name.long} · ${ui.today}` : name.long;
          const worked = `${ui.workedDurationLabel}: ${actual}`;
          const detail = onLeave ? `${ui.planner.onLeave}${known ? `, ${worked}` : ""}` : future
            ? ui.plannedDuration(durationText(day.source.dailyGoalSeconds))
            : `${worked}, ${ui.targetLabel}: ${durationText(day.source.dailyGoalSeconds)}`;
          const action = day.date < today ? ui.openDayRecords(name.long) : ui.openDayPlan(name.long);
          return <Tooltip key={day.date} className={`weekly-ruler-day${isToday ? " is-today" : ""}${future ? " is-future" : ""}${recordIssue ? " has-record-issue" : ""}`}
            onActivate={() => onSelectDay(day.date)}
            label={`${heading}, ${status ? `${status}, ` : ""}${detail}. ${action}`} content={<>
            <span className="pofis-tooltip-heading">{heading}</span>
            {onLeave && <span>{ui.planner.onLeave}</span>}
            {status && <span>{status}</span>}
            {future && !onLeave ? <span>{detail}</span> : <>
              {(!onLeave || known) && <span>{ui.workedDurationLabel}<b>{actual}</b></span>}
              {!onLeave && <span>{ui.targetLabel}<b>{durationText(day.source.dailyGoalSeconds)}</b></span>}
            </>}
          </>}>
            {onLeave ? <span className="weekly-ruler-tick weekly-ruler-leave" aria-hidden="true">{ui.planner.onLeave}</span>
              : <span className="weekly-ruler-tick" aria-hidden="true" style={{ "--ruler-recorded": `${segment.recorded * 100}%`, "--ruler-filled": `${segment.filled * 100}%` } as CSSProperties} />}
            <span className="weekly-ruler-day-label" aria-hidden="true">{name.short}{recordIssue && <TriangleAlert size={12} />}</span>
            {onLeave && known && day.source.total > 0 && <span className="weekly-ruler-leave-duration" aria-hidden="true">{approximate}{day.source.total < 60 ? ui.lessThanMinute : durationText(day.source.total, false)}</span>}
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
