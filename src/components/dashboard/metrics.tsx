import { summarizeWeek } from "@/domain/rules/week";
import type { DayReport } from "@/domain/attendance";
import { ui } from "@/lib/ui-text.js";
import { Duration } from "../primitives";
import { MetricCard } from "./metric-card";
import { DayFlow } from "../attendance/day-flow";
import { WeeklyTotal } from "./weekly-total";

export function DashboardMetrics({
  days,
  today,
  isCurrent,
  targetSeconds: target,
}: {
  days: DayReport[];
  today: string;
  isCurrent: boolean;
  targetSeconds: number;
}) {
  const summary = summarizeWeek(days, today);
  const day = days.find((day) => day.date === today);
  const exitGoal = day?.source.exitGoalSeconds ?? null;
  return (
    <div className={`metrics ${isCurrent ? "metrics-today" : ""}`}>
      {isCurrent && day && (
        <DayFlow day={day} target={exitGoal} />
      )}
      <WeeklyTotal days={days} target={target} summary={summary} showDifference={isCurrent} />
      {!isCurrent && (
        <>
          <MetricCard
            label={ui.weeklyGoal}
            icon="target"
            foot={
              <>
                {ui.planner.workingDayCount(days.filter(day => day.source.workingDay).length)}
              </>
            }
          >
            <Duration seconds={target} />
          </MetricCard>
          <MetricCard
            label={ui.targetDifference}
            icon="clock"
            hint={
              summary.incomplete
                ? ui.missingRecords
                : summary.totalSeconds > target
                  ? ui.exceeded
                  : undefined
            }
          >
            <Duration
              seconds={
                summary.incomplete
                  ? null
                  : Math.abs(summary.totalSeconds - target)
              }
            />
          </MetricCard>
          <MetricCard label={ui.recordedDays} icon="file">
            <>
              {summary.recordedDays} <small>{ui.days}</small>
            </>
          </MetricCard>
        </>
      )}
    </div>
  );
}
