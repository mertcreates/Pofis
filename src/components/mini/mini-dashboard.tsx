"use client";

import { useEffect, useMemo, useState } from "react";
import { useClock } from "@/data/use-clock";
import { usePdks } from "@/data/use-pdks";
import { useWorkPlans } from "@/data/use-work-plans";
import { prepareReport } from "@/domain/report";
import { dateKey, weekStart } from "@/domain/rules/calendar";
import { targetExitAt } from "@/domain/rules/work-plan";
import { summarizeWeek } from "@/domain/rules/week";
import { percentage } from "@/domain/rules/progress.js";
import { durationClock, durationText, formatClock } from "@/domain/time";
import { product, ui } from "@/lib/ui-text.js";
import "./mini-dashboard.css";

declare global {
  interface Window {
    pofisMini?: {
      get(): Promise<{ pinned: boolean }>;
      pin(): Promise<{ pinned: boolean }>;
      openMain(): Promise<void>;
    };
  }
}

export function MiniDashboard({ initialNow }: { initialNow: number }) {
  const now = useClock(initialNow, "second");
  const today = dateKey(now);
  const [week, setWeek] = useState(() => weekStart(today));
  const pdks = usePdks(week);
  const plans = useWorkPlans(week);
  const [pinned, setPinned] = useState(false);
  useEffect(() => { setWeek(weekStart(today)); }, [today]);
  useEffect(() => { void window.pofisMini?.get().then(value => setPinned(value.pinned)).catch(() => {}); }, []);

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

  function openMain() {
    if (window.pofisMini) void window.pofisMini.openMain();
    else window.location.assign("/");
  }
  function togglePin() {
    void window.pofisMini?.pin().then(value => setPinned(value.pinned));
  }

  return (
    <main className="pofi-mini">
      <header className="pofi-mini-header">
        <div className="pofi-mini-brand">
          <img src="/pofi/pofi-mark-256.png" alt="" width="34" height="34" />
          <span><strong>Pofi Mini</strong><small>{product.tagline}</small></span>
        </div>
        <button className={`pofi-mini-pin${pinned ? " is-pinned" : ""}`} type="button"
          onClick={togglePin} aria-pressed={pinned} title={pinned ? "Sabitlemeyi kaldır" : "Pencereyi sabitle"}>
          {pinned ? "●" : "○"} <span>Sabitle</span>
        </button>
      </header>

      {pdks.connected === false ? (
        <div className="pofi-mini-empty"><strong>PDKS bağlantısı yok</strong><p>Mesaini görmek için Pofis'e giriş yap.</p></div>
      ) : !presentation ? (
        <div className="pofi-mini-empty" role="status">
          {pdks.failure ? "Mesai bilgileri alınamadı. Pofis'ten yeniden dene." : "Mesai bilgileri hazırlanıyor…"}
        </div>
      ) : (
        <>
          <section className="pofi-mini-today" aria-label="Bugünkü mesai">
            <span className="pofi-mini-label">{ui.todayWork}</span>
            <strong className="pofi-mini-duration">{duration === null ? "—" : durationClock(duration)}</strong>
            <span className="pofi-mini-status">{day?.state === "uncertain" ? ui.incompleteRecord :
              day?.state === "ongoing" ? ui.mesaiOngoing :
              day?.state === "outside" ? ui.lastExitStatus :
              day?.state === "awaiting-entry" ? ui.awaitingEntry : ""}</span>
          </section>
          <div className="pofi-mini-grid">
            <div><span className="pofi-mini-label">{ui.targetExit}</span>
              <strong>{exitAt === null ? "—" : formatClock(exitAt, false)}</strong></div>
            <div><span className="pofi-mini-label">{delta === null ? ui.targetRemaining :
              delta >= 0 ? ui.targetOver : ui.targetRemaining}</span>
              <strong>{delta === null ? "—" : durationText(Math.abs(delta), false)}</strong></div>
          </div>
          <section className="pofi-mini-week">
            <div className="pofi-mini-week-heading"><span>{ui.weeklyTotal}</span>
              <strong>{weekSummary ? durationText(weekSummary.totalSeconds, false) : "—"}
                <span> / {durationText(plans.targetSeconds, false)}</span></strong></div>
            <div className="pofi-mini-track" role="progressbar" aria-label={ui.weeklyTotal}
              aria-valuenow={progress === null ? undefined : Math.min(100, progress)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${Math.min(100, Math.max(0, progress ?? 0))}%` }} />
            </div>
            {weekSummary?.incomplete && <small>{ui.incompleteRecord}</small>}
          </section>
        </>
      )}
      <button type="button" className="pofi-mini-open" onClick={openMain}>{ui.desktop.open} ↗</button>
    </main>
  );
}
