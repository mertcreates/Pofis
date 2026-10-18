"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { usePdks } from "@/data/use-pdks";
import type { useWorkPlans } from "@/data/use-work-plans";
import { prepareReport, type Report } from "@/domain/report";
import { dateKey, weekStart } from "@/domain/rules/calendar";
import { completedDaySeconds } from "@/domain/rules/work-plan";
import { Connection } from "../connection";
import AppShell from "../shell/app-shell.js";
import LoadingState from "../loading-state.js";
import RequestError from "../request-error.js";
import { InlineNotice } from "../inline-notice";
import { useAppearance } from "@/data/use-appearance";
import { DashboardHeader } from "./header";
import { ReportContent } from "./report-content";
import PofiCall from "../pofi-call.js";
import { ui } from "@/lib/ui-text.js";
import { PlanEditor } from "../plan-editor";
import { PofiRoom } from "../pofi-room-content";

type Source =
  | { kind: "pdks"; state: ReturnType<typeof usePdks> }
  | {
      kind: "demo";
      report: Report;
      refresh: () => void;
      firstWeek: string;
      capturedDate: string;
    };
export function DashboardView({
  now,
  week,
  onWeekChange,
  data,
  workPlans,
  children,
}: {
  now: number;
  week: string;
  onWeekChange: (week: string) => void;
  data: Source;
  workPlans: ReturnType<typeof useWorkPlans>;
  children?: ReactNode;
}) {
  const appearance = useAppearance();
  const [dialog, setDialog] = useState<"plan" | "room" | null>(
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
    return prepareReport(source, workPlans.plan, today, stale, workPlans.targetSeconds, workPlans.zeroOpenDays);
  }, [source, workPlans.plan, workPlans.targetSeconds, workPlans.zeroOpenDays, today, stale]);
  const presentation = useMemo(() => {
    return prepared ? prepared(now) : null;
  }, [prepared, now]);
  const days = presentation?.days ?? [];
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
        settingsOpen={dialog === "plan"}
        onSection={(section: string) => {
          selectWeek(currentWeek);
          if (section === "settings") setDialog("plan");
        }}
        onDisconnect={pdks ? () => void pdks.disconnect() : undefined}
      >
        {workPlans.error && dialog !== "plan" && (
          <InlineNotice tone="warning">{workPlans.error}</InlineNotice>
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
            {children}
            <DashboardHeader
              week={week}
              today={navigationDate}
              owner={source?.person.name}
              fetchedAt={source?.fetchedAt}
              busy={busy}
              firstWeek={firstWeek}
              onSelect={selectWeek}
              onRefresh={() => void refresh()}
              onEditPlan={!isCurrent ? () => setDialog("plan") : undefined}
            />
            <div className="report-area" aria-busy={busy}>
              {stale && (
                <InlineNotice>
                  {ui.staleReport}
                </InlineNotice>
              )}
              {source && prepared ? (
                <ReportContent
                  key={week}
                  prepared={prepared}
                  initialNow={now}
                  today={today}
                  isCurrent={isCurrent}
                  liveClock={liveClock}
                  week={week}
                  owner={source.person.name}
                  targetSeconds={workPlans.targetSeconds}
                  onOpenRoom={() => setDialog("room")}
                />
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
            targetSeconds={workPlans.targetSeconds}
            days={days}
            defaultPlan={workPlans.defaultPlan}
            leaveDays={workPlans.leaveDays}
            zeroOpenDays={workPlans.zeroOpenDays}
            special={workPlans.special}
            ready={workPlans.ready && source?.from === week}
            error={workPlans.error}
            onSave={(plan, targetSeconds, leaveDays) => workPlans.save(plan, completedDaySeconds(days, week, today), targetSeconds, leaveDays)}
            onSaveDefault={plan => workPlans.saveDefault(plan, completedDaySeconds(days, week, today))}
            onReset={() => workPlans.reset(completedDaySeconds(days, week, today))}
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
      </AppShell>
      <PofiCall />
    </>
  );
}
