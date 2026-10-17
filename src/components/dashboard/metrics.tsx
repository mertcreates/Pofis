import { targetExitAt } from "@/domain/rules/work-plan";
import { summarizeWeek } from "@/domain/rules/week";
import { percentage } from "@/domain/rules/progress.js";
import type { DayReport } from "@/domain/attendance";
import { formatClock, formatDate } from "@/domain/time";
import { dateKey } from "@/domain/rules/calendar";
import { ui } from "@/lib/ui-text.js";
import { Duration } from "../primitives";
import { MetricCard } from "./metric-card";

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
  const todaySeconds = day?.source.total ?? 0;
  const dailyGoal = day?.source.dailyGoalSeconds ?? 0;
  const exitGoal = day?.source.exitGoalSeconds ?? null;
  const targetAt =
    day && day.state !== "uncertain"
      ? targetExitAt(day.firstEntry, exitGoal)
      : null;
  const percent =
    day && day.firstEntry !== null && day.state !== "uncertain" && day.source.workingDay
      ? percentage(todaySeconds, dailyGoal)
      : null;
  const weeklyPercent = target > 0 ? percentage(summary.totalSeconds, target) : null;
  const delta = exitGoal !== null ? todaySeconds - exitGoal : null;
  const hint =
    day?.state === "uncertain"
      ? ui.incompleteRecordHint
      : day?.firstEntry === null
        ? ui.exitAwaitingHint
        : exitGoal === null
          ? ui.missingRecords
          : targetAt !== null && dateKey(targetAt) !== today
            ? formatDate(dateKey(targetAt))
            : null;
  return (
    <div className={`metrics ${isCurrent ? "metrics-today" : ""}`}>
      {isCurrent && day && (
        <>
          <MetricCard
            label={ui.todayDuration}
            icon="clock"
            badge={percent === null ? undefined : `%${percent}`}
            progress={{
              recorded: day.source.recorded,
              estimated: day.source.estimated,
              target: dailyGoal,
            }}
            foot={
              <dl className="metric-facts">
                <div>
                  <dt>{ui.targetLabel}</dt>
                  <dd>
                    <Duration seconds={dailyGoal} />
                  </dd>
                </div>
              </dl>
            }
          >
            <Duration
              seconds={
                day.firstEntry === null || day.state === "uncertain"
                  ? null
                  : todaySeconds
              }
            />
          </MetricCard>
          <MetricCard
            label={ui.todayTargetExit}
            icon="clock"
            hint={hint}
            foot={
              targetAt === null ? undefined : (
                <dl className="metric-facts exit-details">
                  <div>
                    <dt>
                      {delta !== null && delta >= 0
                        ? ui.targetOver
                        : ui.targetRemaining}
                    </dt>
                    <dd>
                      {delta !== null && delta >= 0 && "+"}
                      <Duration
                        seconds={delta === null ? null : Math.abs(delta)}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>{ui.firstEntry}</dt>
                    <dd>{formatClock(day.firstEntry)}</dd>
                  </div>
                </dl>
              )
            }
          >
            {targetAt === null ? (
              <span className="metric-state">
                {day.firstEntry === null ? ui.noEntryYet : ui.notCalculated}
              </span>
            ) : (
              <time title={formatClock(targetAt)}>
                {formatClock(targetAt).slice(0, 5)}
                <span className="exit-seconds">
                  {formatClock(targetAt).slice(5)}
                </span>
              </time>
            )}
          </MetricCard>
        </>
      )}
      <MetricCard
        label={summary.estimatedSeconds > 0 ? ui.liveEstimate(ui.weeklyTotal) : ui.weeklyTotal}
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
