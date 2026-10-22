"use client";

import { useCallback, useMemo, useReducer, useState, type ReactNode } from "react";
import { DashboardView } from "@/components/dashboard/view";
import { useWorkPlans } from "@/data/use-work-plans";
import { addDays, dateKey, weekday, weekStart } from "@/domain/rules/calendar";
import type { demoData } from "./report";
import { demoDays, previewDemoDay } from "./navigation";
import { useDemoClock } from "./use-demo-clock";
import { useDemoNotifications } from "./use-notifications";
import { DemoDayPicker } from "./day-picker";
import { DemoControls, initialErrorPreview, type DemoView, type ErrorPreviewState } from "./controls";
import { DemoNoticeControls, DemoNoticePreview, initialNoticePreview, type NoticePreviewState } from "./notice-preview";
import dynamic from "next/dynamic";
import { ui } from "@/lib/ui-text.js";
import "./error-preview.css";

const DemoErrorPreview = dynamic(() => import("./error-preview").then(module => module.DemoErrorPreview));

const attendancePresets = {
  shortfall: { date: "2026-10-15", minutes: 0 },
  warning: { date: "2026-10-07", minutes: 0 },
  empty: { date: "2026-10-09", minutes: 0 },
  ongoing: { date: "2026-10-15", minutes: 120 },
};

export function DemoDashboard({
  now: capturedAt,
  firstWeek,
  reports,
}: ReturnType<typeof demoData>) {
  const [date, setDate] = useState(() => dateKey(capturedAt));
  const [extraMinutes, setExtraMinutes] = useState(0);
  const [historical, setHistorical] = useState(false);
  const [view, setView] = useState<DemoView>("attendance");
  const [errorPreview, setErrorPreview] = useState<ErrorPreviewState>(initialErrorPreview);
  const [noticePreview, setNoticePreview] = useState<NoticePreviewState>(initialNoticePreview);
  const notifications = useDemoNotifications();
  const week = weekStart(date);
  const dates = demoDays(week, capturedAt);
  const selectWeek = useCallback(
    (next: string) => {
      if (!reports.some((report) => report.from === next)) return;
      if (next === weekStart(dateKey(capturedAt))) setHistorical(false);
      const available = demoDays(next, capturedAt);
      const matchingDay = addDays(next, weekday(date));
      const nextDate = available.includes(matchingDay)
        ? matchingDay
        : available[available.length - 1];
      if (nextDate !== date) setExtraMinutes(0);
      setDate(nextDate);
    },
    [reports, capturedAt, date],
  );
  const [revision, refresh] = useReducer((value: number) => value + 1, 0);
  const workPlans = useWorkPlans(week, "demo");
  const report = useMemo(() => {
    const captured = reports.find((report) => report.from === week);
    if (!captured)
      throw new Error(ui.demoMessages.weekUnavailable);
    if (historical) return { report: captured, now: capturedAt, maxExtraMinutes: 0 };
    return previewDemoDay(captured, date, capturedAt, extraMinutes);
  }, [reports, week, date, capturedAt, extraMinutes, revision, historical]);
  const now = useDemoClock(report.now, !historical && extraMinutes > 0);
  function selectDate(next: string) {
    const nextWeek = weekStart(next);
    if (
      !reports.some((report) => report.from === nextWeek) ||
      !demoDays(nextWeek, capturedAt).includes(next)
    )
      return;
    if (next !== date) setExtraMinutes(0);
    setDate(next);
  }

  function resetPreview() {
    setDate(dateKey(capturedAt));
    setExtraMinutes(0);
    setHistorical(false);
    setErrorPreview(initialErrorPreview);
    setNoticePreview(initialNoticePreview);
    setView("attendance");
  }
  const selectedPreset = historical ? "historical" : Object.entries(attendancePresets).find(
    ([, preset]) => preset.date === date && preset.minutes === extraMinutes,
  )?.[0] ?? "custom";
  const controls = (children: ReactNode) => (
    <DemoControls view={view} onViewChange={setView} onReset={resetPreview}>{children}</DemoControls>
  );

  if (view === "errors") return (
    <DemoErrorPreview state={errorPreview} onChange={setErrorPreview} controls={controls} />
  );

  return (
    <DashboardView
      now={now}
      week={week}
      onWeekChange={selectWeek}
      data={{
        kind: "demo",
        report: report.report,
        refresh,
        firstWeek,
        capturedDate: dateKey(capturedAt),
        notifications,
      }}
      workPlans={workPlans}
    >
      {view === "notices" ? <>
        {controls(<DemoNoticeControls state={noticePreview} onChange={setNoticePreview} />)}
        <DemoNoticePreview state={noticePreview} onChange={setNoticePreview} today={date} notes={report.report.pofiNotes} />
      </> : controls(<>
        <div className="demo-preset-row">
          <label className="demo-control-select">
            <span>{ui.demo.controls.scenario}</span>
            <select value={selectedPreset} onChange={event => {
              const past = event.currentTarget.value === "historical";
              setHistorical(past);
              if (past) {
                setDate(addDays(weekStart(dateKey(capturedAt)), -7));
                setExtraMinutes(0);
                return;
              }
              const preset = attendancePresets[event.currentTarget.value as keyof typeof attendancePresets];
              setDate(preset.date);
              setExtraMinutes(preset.minutes);
            }}>
              <option value="custom" disabled>{ui.demo.controls.custom}</option>
              <option value="historical">{ui.demo.controls.historical}</option>
              {(Object.keys(attendancePresets) as (keyof typeof attendancePresets)[]).map(key => (
                <option key={key} value={key}>{ui.demo.controls.presets[key]}</option>
              ))}
            </select>
          </label>
          <p className="demo-notice">{ui.demo.notice}</p>
        </div>
        {!historical && <DemoDayPicker
          dates={dates}
          selected={date}
          now={now}
          capturedAt={capturedAt}
          extraMinutes={extraMinutes}
          maxExtraMinutes={report.maxExtraMinutes}
          onExtraMinutesChange={setExtraMinutes}
          onSelect={selectDate}
        />}
      </>)}
    </DashboardView>
  );
}
