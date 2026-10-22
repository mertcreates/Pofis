import { useClock } from "@/data/use-clock";
import { dateKey } from "@/domain/rules/calendar";
import type { prepareReport } from "@/domain/report";
import { ui } from "@/lib/ui-text.js";
import { ReportTable } from "../attendance/report-table";
import { DashboardMetrics } from "./metrics";
import { PofiPanel } from "./pofi-panel";

export function ReportContent({ prepared, initialNow, today, isCurrent, liveClock, week, owner, targetSeconds, leaveDays, onOpenRoom }: {
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
}) {
  const clock = useClock(initialNow, liveClock && isCurrent ? "second" : false);
  // The outer date owner replaces the projector at midnight; never call yesterday's projector with today's clock.
  const now = dateKey(clock) === today ? clock : initialNow;
  const { days } = prepared(now);
  const todayReport = days.find(day => day.date === today);
  return <section className="dashboard" aria-label={ui.personRecords(owner)}>
    <DashboardMetrics targetSeconds={targetSeconds} days={days} today={today} isCurrent={isCurrent} week={week} />
    {isCurrent && todayReport && <div className="middle-grid">
      <ReportTable days={days} today={today} compact leaveDays={leaveDays} />
      <PofiPanel key={today} day={todayReport} now={now} onOpen={onOpenRoom} />
    </div>}
    {!isCurrent && <ReportTable days={days} today={today} compact leaveDays={leaveDays} />}
    {isCurrent && !todayReport && <ReportTable days={days} today={today} leaveDays={leaveDays} />}
  </section>;
}
