import { summarizeWeek } from "@/domain/rules/week";
import { percentage } from "@/domain/rules/progress.js";
import type { DayReport } from "@/domain/attendance";
import { ui } from "@/lib/ui-text.js";
import { Duration } from "../primitives";
import { MetricCard } from "./metric-card";
import { DayFlow } from "../attendance/day-flow";

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
  const weeklyPercent = target > 0 ? percentage(summary.totalSeconds, target) : null;
  return (
    <div className={`metrics ${isCurrent ? "metrics-today" : ""}`}>
      {isCurrent && day && (
        <DayFlow day={day} target={exitGoal} />
      )}
      <MetricCard
        label={ui.weeklyTotal}
        icon="bars"
        badge={
          weeklyPercent === null
            ? undefined
            : `${summary.incomplete ? "≈ " : ""}%${weeklyPercent}`
        }
        hint={summary.incomplete ? ui.availableRecordsTotal : undefined}
        progress={{
          recorded: summary.recordedSeconds,
          estimated: summary.estimatedSeconds,
          target,
        }}
        foot={
          isCurrent ? (
            <dl className="metric-facts">
              <div>
                <dt>{ui.targetLabel}</dt>
                <dd>
                  <Duration seconds={target} />
                </dd>
              </div>
              {!summary.incomplete && (
                <div>
                  <dt>
                    {summary.totalSeconds >= target
                      ? ui.excessLabel
                      : ui.remainingLabel}
                  </dt>
                  <dd>
                    <Duration
                      seconds={Math.abs(target - summary.totalSeconds)}
                    />
                  </dd>
                </div>
              )}
            </dl>
          ) : undefined
        }
      >
        <Duration seconds={summary.totalSeconds} />
      </MetricCard>
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
