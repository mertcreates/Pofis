import { useRef } from "react";
import { useClock } from "@/data/use-clock";
import { dateKey } from "@/domain/rules/calendar";
import type { prepareReport } from "@/domain/report";
import { ui } from "@/lib/ui-text.js";
import { ReportTable, type ReportTableHandle } from "../attendance/report-table";
import { WeekChart } from "../attendance/week-chart";
import { DashboardMetrics } from "./metrics";
import { PofiPanel } from "./pofi-panel";

export function ReportContent({ prepared, initialNow, today, isCurrent, liveClock, week, owner, targetSeconds, leaveDays, onOpenRoom, onEditPlan }: {
  prepared: ReturnType<typeof prepareReport>;
  initialNow: number;
  today: string;
  isCurrent: boolean;
  liveClock: boolean;
  week: string;
  owner: string;
  targetSeconds: number;
  leaveDays: readonly number[];
  onOpenRoom: () => void;
  onEditPlan: (date: string) => void;
}) {
  const report = useRef<ReportTableHandle>(null);
  const clock = useClock(initialNow, liveClock && isCurrent ? "second" : false);
  // The outer date owner replaces the projector at midnight; never call yesterday's projector with today's clock.
  const now = dateKey(clock) === today ? clock : initialNow;
  const { days } = prepared(now);
  const todayReport = days.find(day => day.date === today);
  function selectDay(date: string) {
    if (date < today) report.current?.openDay(date);
    else onEditPlan(date);
  }
  return <section className="dashboard" aria-label={ui.personRecords(owner)}>
    <DashboardMetrics targetSeconds={targetSeconds} days={days} today={today} isCurrent={isCurrent} week={week} leaveDays={leaveDays} onSelectDay={selectDay} onOpenRecords={() => report.current?.openDay(today)} />
    {isCurrent && <div className="middle-grid">
      <WeekChart days={days} today={today} start={week} current />
      {todayReport && <PofiPanel key={today} day={todayReport} now={now} onOpen={onOpenRoom} />}
    </div>}
    <ReportTable ref={report} days={days} today={today} compact={!isCurrent || !!todayReport} leaveDays={leaveDays} />
  </section>;
}
