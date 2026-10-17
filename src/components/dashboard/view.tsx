"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { usePdks } from "@/data/use-pdks";
import type { useWorkPlans } from "@/data/use-work-plans";
import { prepareReport, type Report } from "@/domain/report";
import { dateKey, weekStart } from "@/domain/rules/calendar";
import { Connection } from "../connection";
import AppShell from "../shell/app-shell.js";
import LoadingState from "../loading-state.js";
import RequestError from "../request-error.js";
import { useAppearance } from "@/data/use-appearance";
import { DashboardHeader } from "./header";
import { DashboardMetrics } from "./metrics";
import { DayFlow } from "../attendance/day-flow";
import { WeekChart } from "../attendance/week-chart";
import { DailyRecords, RecordsDialog } from "../attendance/records";
import { ReportTable } from "../attendance/report-table";
import { PofiPanel } from "./pofi-panel";
import PofiCall from "../pofi-call.js";
import { ui } from "@/lib/ui-text.js";
import { PlanEditor } from "../plan-editor";
const PofiRoom = dynamic(
  () => import("../pofi-room-content").then((module) => module.PofiRoom),
  { ssr: false },
);

type Source =
  | { kind: "pdks"; state: ReturnType<typeof usePdks> }
  | {
      kind: "demo";
      report: Report;
      refresh: () => void;
      firstWeek: string;
      capturedDate: string;
      navigation: ReactNode;
    };
export function DashboardView({
  now,
  week,
  onWeekChange,
  data,
  workPlans,
}: {
  now: number;
  week: string;
  onWeekChange: (week: string) => void;
  data: Source;
  workPlans: ReturnType<typeof useWorkPlans>;
}) {
  const appearance = useAppearance();
  const [dialog, setDialog] = useState<"plan" | "room" | "records" | null>(
    null,
  );
  const today = dateKey(now);
  const currentWeek = weekStart(today);
  const navigationDate = data.kind === "demo" ? data.capturedDate : today;
  const liveClock = data.kind === "pdks";
  const isCurrent = week === currentWeek;
  const pdks = data.kind === "pdks" ? data.state : null;
  const connected = pdks ? pdks.connected : true;
  const busy = !!pdks?.busy;
  const stale = pdks?.stale ?? false;
  const refresh = data.kind === "pdks" ? data.state.refresh : data.refresh;
  const source = data.kind === "pdks" ? data.state.report : data.report;
  const firstWeek = data.kind === "demo" ? data.firstWeek : undefined;
  const prepared = useMemo(() => {
    if (!source) return null;
    try {
      return {
        read: prepareReport(source, workPlans.plan, today, stale),
        error: "",
      };
    } catch (error) {
      return {
        read: null,
        error: error instanceof Error ? error.message : "Rapor okunamadı.",
      };
    }
  }, [source, workPlans.plan, today, stale]);
  const presentation = useMemo(() => {
    if (!prepared?.read) return { value: null, error: prepared?.error };
    try {
      return { value: prepared.read(now), error: "" };
    } catch (error) {
      return {
        value: null,
        error: error instanceof Error ? error.message : "Rapor okunamadı.",
      };
    }
  }, [prepared, now]);
  const days = presentation?.value?.days ?? [];
  const plan = presentation?.value?.plan ?? [];
  const todayReport = days.find((day) => day.date === today);
  useEffect(() => {
    if (!connected) {
      setDialog(null);
      onWeekChange(weekStart(today));
    }
  }, [connected, today, onWeekChange]);
  const previousToday = useRef(today);
  useEffect(() => {
    if (!liveClock) return;
    if (previousToday.current === today) return;
    const previousWeek = weekStart(previousToday.current);
    previousToday.current = today;
    if (week === previousWeek) {
      onWeekChange(currentWeek);
      if (week === currentWeek) void refresh();
    }
  }, [liveClock, today, currentWeek, week, refresh, onWeekChange]);
  function selectWeek(next: string) {
    if (
      next !== weekStart(next) ||
      next > weekStart(navigationDate) ||
      (firstWeek && next < firstWeek)
    )
      return;
    onWeekChange(next);
  }
  return (
    <>
      <AppShell
        connected={!!connected}
        busy={busy}
        appearance={appearance}
        navigation={null}
        section="overview"
        settingsOpen={dialog === "plan"}
        showNavigation={true}
        onSection={(section: string) =>
          section === "settings" ? setDialog("plan") : selectWeek(currentWeek)
        }
        onDisconnect={pdks ? () => void pdks.disconnect() : undefined}
      >
        {(appearance.error || workPlans.error) && (
          <p role="alert" className="error">
            {appearance.error || workPlans.error}
          </p>
        )}
        {pdks?.failure && connected === true && (
          <RequestError
            error={pdks.failure}
            variant={source ? "notice" : "page"}
            busy={busy}
            onRetry={pdks.retryFailure}
          />
        )}
        {connected === null ? (
          <div className="session-loading">
            <LoadingState label={ui.checkingSession} />
          </div>
        ) : pdks && !connected ? (
          <Connection
            busy={busy}
            error={pdks.failure}
            onRetry={pdks.retryFailure}
            onReturnToLogin={pdks.returnToLogin}
            onConnect={pdks.connect}
          />
        ) : (
          <>
            <DashboardHeader
              week={week}
              today={navigationDate}
              owner={source?.person.name}
              fetchedAt={source?.fetchedAt}
              busy={busy}
              firstWeek={firstWeek}
              onSelect={selectWeek}
              onRefresh={() => void refresh()}
            />
            {data.kind === "demo" && (
              <div className="demo-preview">
                <p className="demo-notice">
                  {ui.demo.notice}
                </p>
                {data.navigation}
              </div>
            )}
            <div className="report-area" aria-busy={busy}>
              {stale && (
                <p className="report-notice" role="status">
                  {ui.staleReport}
                </p>
              )}
              {source && presentation?.value ? (
                <section
                  className="dashboard"
                  aria-label={ui.personRecords(source.person.name)}
                >
                  <DashboardMetrics
                    days={days}
                    plan={plan}
                    today={today}
                    isCurrent={isCurrent}
                  />
                  {isCurrent && todayReport && (
                    <div className="middle-grid">
                      <DayFlow
                        day={todayReport}
                        target={todayReport.source.exitGoalSeconds}
                      />
                      <PofiPanel
                        key={today}
                        day={todayReport}
                        now={now}
                        onOpen={() => setDialog("room")}
                      />
                    </div>
                  )}
                  <div
                    className={isCurrent ? "bottom-grid" : "weekly-chart-list"}
                  >
                    <div className="weekly-chart-list">
                      <WeekChart
                        days={days}
                        plan={plan}
                        today={today}
                        start={week}
                        current={isCurrent}
                        blocked={presentation?.value?.blocked}
                      />
                    </div>
                    {isCurrent && todayReport && (
                      <DailyRecords
                        day={todayReport}
                        onAll={() => setDialog("records")}
                      />
                    )}
                    {!isCurrent && (
                      <ReportTable days={days} plan={plan} today={today} />
                    )}
                  </div>
                  {isCurrent && (
                    <ReportTable days={days} plan={plan} today={today} />
                  )}
                </section>
              ) : presentation?.error ? (
                <p className="error" role="alert">
                  {presentation.error}
                </p>
              ) : pdks?.failure ? null : busy ? (
                <LoadingState label={ui.loadingSelf} />
              ) : (
                <div className="empty report-empty">
                  <h2>{ui.reportFailed}</h2>
                  <p>{ui.refreshInstruction}</p>
                </div>
              )}
            </div>
          </>
        )}
        {connected && dialog === "plan" && (
          <PlanEditor
            week={week}
            today={today}
            plan={workPlans.plan}
            day={todayReport}
            blocked={presentation?.value?.blocked ?? false}
            onSave={workPlans.save}
            onClose={() => setDialog(null)}
          />
        )}
        {connected && dialog === "room" && (
          <PofiRoom
            today={today}
            notes={source?.pofiNotes}
            onClose={() => setDialog(null)}
          />
        )}
        {connected && dialog === "records" && todayReport && (
          <RecordsDialog day={todayReport} onClose={() => setDialog(null)} />
        )}
      </AppShell>
      <PofiCall />
    </>
  );
}
