import { summarizeWeek } from "@/domain/rules/week";
import type { DayReport } from "@/domain/attendance";
import { DayFlow } from "../attendance/day-flow";
import { WeekChart } from "../attendance/week-chart";
import { WeeklyTotal } from "./weekly-total";

export function DashboardMetrics({
  days,
  today,
  isCurrent,
  targetSeconds: target,
  week,
}: {
  days: DayReport[];
  today: string;
  isCurrent: boolean;
  targetSeconds: number;
  week: string;
}) {
  const summary = summarizeWeek(days, today);
  const day = days.find((day) => day.date === today);
  const exitGoal = day?.source.exitGoalSeconds ?? null;
  return (
    <div className={`metrics metrics-today${isCurrent ? "" : " metrics-history"}`}>
      {isCurrent && day && (
        <DayFlow day={day} target={exitGoal} />
      )}
      {!isCurrent && <WeekChart days={days} today={today} start={week} current={false} />}
      <WeeklyTotal days={days} target={target} summary={summary} isCurrent={isCurrent} />
    </div>
  );
}
