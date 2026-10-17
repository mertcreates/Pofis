"use client";

import { useCallback, useMemo, useReducer, useState } from "react";
import { DashboardView } from "@/components/dashboard/view";
import { useWorkPlans } from "@/data/use-work-plans";
import { addDays, dateKey, weekday, weekStart } from "@/domain/rules/calendar";
import type { demoData } from "./report";
import { demoDays, previewDemoDay } from "./navigation";
import { DemoDayPicker } from "./day-picker";
import dynamic from "next/dynamic";
import { ui } from "@/lib/ui-text.js";
import "./error-preview.css";

const DemoErrorPreview = dynamic(() => import("./error-preview").then(module => module.DemoErrorPreview));

export function DemoDashboard({
  now: capturedAt,
  firstWeek,
  reports,
}: ReturnType<typeof demoData>) {
  const [date, setDate] = useState(() => dateKey(capturedAt));
  const [extraMinutes, setExtraMinutes] = useState(0);
  const [errorPreview, setErrorPreview] = useState(false);
  const week = weekStart(date);
  const dates = demoDays(week, capturedAt);
  const selectWeek = useCallback(
    (next: string) => {
      if (!reports.some((report) => report.from === next)) return;
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
      throw new Error("Seçilen hafta örnek veri aralığında bulunmuyor.");
    return previewDemoDay(captured, date, capturedAt, extraMinutes);
  }, [reports, week, date, capturedAt, extraMinutes, revision]);
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

  if (errorPreview) return <DemoErrorPreview onClose={() => setErrorPreview(false)} />;

  return (
    <DashboardView
      now={report.now}
      week={week}
      onWeekChange={selectWeek}
      data={{
        kind: "demo",
        report: report.report,
        refresh,
        firstWeek,
        capturedDate: dateKey(capturedAt),
        navigation: (
          <>
            <button type="button" className="demo-error-launch" onClick={() => setErrorPreview(true)}>
              {ui.demo.errors.launch}
            </button>
            <DemoDayPicker
              dates={dates}
              selected={date}
              now={report.now}
              capturedAt={capturedAt}
              extraMinutes={extraMinutes}
              maxExtraMinutes={report.maxExtraMinutes}
              unavailableReason={report.unavailableReason}
              onExtraMinutesChange={setExtraMinutes}
              onSelect={selectDate}
            />
          </>
        ),
      }}
      workPlans={workPlans}
    />
  );
}
