"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { usePdks } from "@/data/use-pdks";
import type { useWorkPlans } from "@/data/use-work-plans";
import { prepareReport, type Report } from "@/domain/report";
import { dateKey, weekStart } from "@/domain/rules/calendar";
import { planProtectionMarkers } from "@/domain/rules/work-plan";
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
import { MealMenuModal } from "../meals/menu-modal";
import { useDesktopNotifications } from "@/data/use-desktop-notifications";
import type { NotificationSettingsSource } from "../notifications/settings";

type Source =
  | { kind: "pdks"; state: ReturnType<typeof usePdks> }
  | {
      kind: "demo";
      report: Report;
      refresh: () => void;
      firstWeek: string;
      capturedDate: string;
      notifications: NotificationSettingsSource;
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
  const [dialog, setDialog] = useState<"plan" | "room" | "meals" | null>(
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
  const notifications = useDesktopNotifications(data.kind === "pdks", connected,
    pdks?.busy === "connect" || pdks?.busy === "disconnect", workPlans.serialized);
  const firstWeek = data.kind === "demo" ? data.firstWeek : undefined;
  const prepared = useMemo(() => {
    if (!source) return null;
    return prepareReport(source, workPlans.plan, today, stale, workPlans.targetSeconds, workPlans.zeroOpenDays, workPlans.userLockedDays);
  }, [source, workPlans.plan, workPlans.targetSeconds, workPlans.zeroOpenDays, workPlans.userLockedDays, today, stale]);
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
        notifications={data.kind === "demo" ? data.notifications : { ...notifications, mode: notifications.available ? "desktop" : "web" }}
        settingsOpen={dialog === "plan"}
        mealsOpen={dialog === "meals"}
        showMeals={data.kind === "pdks"}
        onSection={(section: string) => {
          if (section === "meals") {
            setDialog("meals");
            return;
          }
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
            userLockedDays={workPlans.userLockedDays}
            onSetLockedDays={workPlans.setLockedDays}
            special={workPlans.special}
            ready={workPlans.ready && source?.from === week}
            error={workPlans.error}
            onSave={(plan, targetSeconds, leaveDays) => workPlans.save(plan, planProtectionMarkers(days, week, today), targetSeconds, leaveDays)}
            onSaveDefault={plan => workPlans.saveDefault(plan, planProtectionMarkers(days, week, today))}
            onReset={() => workPlans.reset(planProtectionMarkers(days, week, today))}
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
        {connected && dialog === "meals" && (
          <MealMenuModal today={today} onClose={() => setDialog(null)} />
        )}
      </AppShell>
      <PofiCall />
    </>
  );
}
