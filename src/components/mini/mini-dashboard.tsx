"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CircleCheck, Coffee, Pin, PinOff } from "lucide-react";
import { useClock } from "@/data/use-clock";
import { usePdks } from "@/data/use-pdks";
import { useWorkPlans } from "@/data/use-work-plans";
import { useAppearance } from "@/data/use-appearance";
import { prepareReport } from "@/domain/report";
import { dateKey, weekStart } from "@/domain/rules/calendar";
import { targetExitAt } from "@/domain/rules/work-plan";
import { summarizeWeek } from "@/domain/rules/week";
import { percentage } from "@/domain/rules/progress.js";
import { durationText, formatClock } from "@/domain/time";
import { product, ui } from "@/lib/ui-text.js";
import "./mini-dashboard.css";

declare global {
  interface Window {
    pofisMini?: {
      get(): Promise<{ pinned: boolean }>;
      pin(): Promise<{ pinned: boolean }>;
      openMain(): Promise<void>;
      resize(height: number): Promise<void>;
    };
  }
}

export function MiniDashboard({ initialNow }: { initialNow: number }) {
  useAppearance();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const bridge = window.pofisMini;
    const element = panel.current;
    if (!bridge || !element) return;
    let previousHeight = 0;
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      if (height === previousHeight) return;
      previousHeight = height;
      void bridge.resize(height).catch(() => console.warn(ui.desktop.miniLoadFailed));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const now = useClock(initialNow, "second");
  const today = dateKey(now);
  const [week, setWeek] = useState(() => weekStart(today));
  const pdks = usePdks(week, { observeDesktopSession: true });
  const plans = useWorkPlans(week);
  const [pinned, setPinned] = useState(false);
  useEffect(() => { setWeek(weekStart(today)); }, [today]);
  useEffect(() => {
    void window.pofisMini?.get().then(value => setPinned(value.pinned))
      .catch(() => console.warn(ui.desktop.miniLoadFailed));
  }, []);

  const prepared = useMemo(() => {
    if (!pdks.report || !plans.ready || pdks.report.from !== week) return null;
    return prepareReport(pdks.report, plans.plan, today, pdks.stale,
      plans.targetSeconds, plans.zeroOpenDays, plans.userLockedDays);
  }, [pdks.report, pdks.stale, plans.ready, plans.plan, plans.targetSeconds,
    plans.zeroOpenDays, plans.userLockedDays, week, today]);
  const presentation = useMemo(() => prepared?.(now) ?? null, [prepared, now]);
  const day = presentation?.days.find(value => value.date === today);
  const duration = day && (day.recordedSeconds !== null || day.liveSeconds !== null)
    ? day.source.total : null;
  const exitAt = day && day.source.exitGoalSeconds !== null
    ? targetExitAt(day.firstEntry, day.source.exitGoalSeconds) : null;
  const delta = duration !== null && day?.source.exitGoalSeconds !== null &&
    day?.source.exitGoalSeconds !== undefined ? day.source.total - day.source.exitGoalSeconds : null;
  const weekSummary = presentation ? summarizeWeek(presentation.days, today) : null;
  const progress = weekSummary ? percentage(weekSummary.totalSeconds, plans.targetSeconds) : null;
  const noPlannedWork = day?.source.workingDay === false;
  const targetComplete = !noPlannedWork && !pdks.stale && day?.state !== "uncertain" && delta !== null && delta >= 0;
  const weekComplete = weekSummary && !weekSummary.incomplete && plans.targetSeconds > 0 && weekSummary.totalSeconds >= plans.targetSeconds;

  function openMain() {
    if (window.pofisMini) void window.pofisMini.openMain().catch(() => console.warn(ui.desktop.miniLoadFailed));
    else window.location.assign("/");
  }
  function togglePin() {
    void window.pofisMini?.pin().then(value => setPinned(value.pinned))
      .catch(() => console.warn(ui.desktop.miniLoadFailed));
  }
  const pinLabel = pinned ? ui.desktop.miniUnpin : ui.desktop.miniPin;

  return (
    <main className="pofi-mini" ref={panel}>
      <header className="pofi-mini-header">
        <div className="pofi-mini-brand">
          <img src="/pofi/pofi-mark-256.png" alt="" width="34" height="34" />
          <span><strong>{product.name}</strong><small>{product.tagline}</small></span>
        </div>
        <button className={`pofi-mini-pin${pinned ? " is-pinned" : ""}`} type="button"
          onClick={togglePin} title={pinLabel} aria-label={pinLabel} aria-pressed={pinned}>
          {pinned ? <PinOff size={16} aria-hidden="true" /> : <Pin size={16} aria-hidden="true" />}
        </button>
      </header>

      {plans.error || pdks.failure ? (
        <div className="pofi-mini-empty" role="alert">{plans.error || ui.desktop.miniLoadFailed}</div>
      ) : pdks.connected === false ? (
        <div className="pofi-mini-empty"><strong>{ui.desktop.miniDisconnectedTitle}</strong><p>{ui.desktop.miniDisconnectedHelp}</p></div>
      ) : !presentation ? (
        <div className="pofi-mini-empty" role="status">
          {ui.desktop.miniLoading}
        </div>
      ) : (
        <>
          {noPlannedWork || targetComplete ? (
            <section className="pofi-mini-summary" aria-label={ui.todayWork}>
              <h1>{noPlannedWork ? <Coffee size={20} aria-hidden="true" /> : <CircleCheck size={20} aria-hidden="true" />}
                {noPlannedWork ? ui.desktop.miniNoPlannedWork : ui.desktop.miniTargetComplete}</h1>
              {duration !== null && <p>{ui.todayWork}: <strong>{durationText(duration)}</strong></p>}
              {day?.state === "uncertain" && <p>{ui.incompleteRecord}</p>}
            </section>
          ) : (
          <>
          <section className="pofi-mini-today" aria-label={ui.todayWork}>
            <span className="pofi-mini-label">{ui.todayWork}</span>
            <strong className="pofi-mini-duration">{duration === null ? "—" : durationText(duration)}</strong>
            <span className="pofi-mini-status">{day?.state === "uncertain" ? ui.incompleteRecord :
              day?.state === "ongoing" ? ui.mesaiOngoing :
              day?.state === "outside" ? ui.lastExitStatus :
              day?.state === "awaiting-entry" ? ui.awaitingEntry : ""}</span>
          </section>
          <div className="pofi-mini-grid">
            <div><span className="pofi-mini-label">{ui.targetExit}</span>
              <strong>{exitAt === null ? "—" : formatClock(exitAt)}</strong></div>
            <div><span className="pofi-mini-label">{delta === null ? ui.targetRemaining :
              delta > 0 ? ui.targetOver :
              delta === 0 ? ui.equalTargetLabel : ui.targetRemaining}</span>
              <strong>{delta === null ? "—" : durationText(Math.abs(delta))}</strong></div>
          </div>
          </>
          )}
          <section className="pofi-mini-week">
            <div className="pofi-mini-week-heading"><span>{ui.weeklyTotal}</span>
              <strong>{weekSummary ? durationText(weekSummary.totalSeconds, false) : "—"}
                <span> / {durationText(plans.targetSeconds, false)}</span></strong></div>
            <div className="pofi-mini-track" role="progressbar" aria-label={ui.weeklyTotal}
              aria-valuenow={progress === null ? undefined : Math.min(100, progress)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${Math.min(100, Math.max(0, progress ?? 0))}%` }} />
            </div>
            {weekSummary?.incomplete ? <small>{ui.incompleteRecord}</small> :
              weekComplete ? <small className="pofi-mini-complete">{ui.desktop.miniWeekComplete}</small> : null}
          </section>
        </>
      )}
      <button type="button" className="pofi-mini-open primary" onClick={openMain}>
        {ui.desktop.open} <ArrowUpRight size={15} aria-hidden="true" />
      </button>
    </main>
  );
}
