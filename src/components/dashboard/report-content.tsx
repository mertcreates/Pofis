import { useClock } from "@/data/use-clock";
import { dateKey } from "@/domain/rules/calendar";
import type { prepareReport } from "@/domain/report";
import { ui } from "@/lib/ui-text.js";
import { ReportTable } from "../attendance/report-table";
import { WeekChart } from "../attendance/week-chart";
import { DashboardMetrics } from "./metrics";
import { PofiPanel } from "./pofi-panel";

export function ReportContent({ prepared, initialNow, today, isCurrent, liveClock, week, owner, targetSeconds, onOpenRoom }: {
  prepared: ReturnType<typeof prepareReport>;
  initialNow: number;
  today: string;
  isCurrent: boolean;
  liveClock: boolean;
  week: string;
  owner: string;
  targetSeconds: number;
  onOpenRoom: () => void;
}) {
  const clock = useClock(initialNow, liveClock && isCurrent ? "second" : false);
  // The outer date owner replaces the projector at midnight; never call yesterday's projector with today's clock.
  const now = dateKey(clock) === today ? clock : initialNow;
  const { days, blocked } = prepared(now);
  const todayReport = days.find(day => day.date === today);
  return <section className="dashboard" aria-label={ui.personRecords(owner)}>
    <DashboardMetrics targetSeconds={targetSeconds} days={days} today={today} isCurrent={isCurrent} />
    {isCurrent && todayReport && <div className="middle-grid">
      <ReportTable days={days} today={today} compact />
      <PofiPanel key={today} day={todayReport} now={now} onOpen={onOpenRoom} />
    </div>}
    {!isCurrent && <div className="weekly-chart-list">
      <WeekChart days={days} today={today} start={week} current={isCurrent} blocked={blocked} />
      <ReportTable days={days} today={today} />
    </div>}
    {isCurrent && !todayReport && <ReportTable days={days} today={today} />}
  </section>;
}
