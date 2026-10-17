import { summarize } from "./rules/recorded-time.js";
import { resolveWeekPlan, planMinutes, weeklyTarget, type WorkPlan } from "./rules/work-plan";
import { dailyDurationState, durationTotals } from "./rules/duration.js";
import { passageDay, passageRecordRows } from "./rules/passages.js";
import { dailyRecordStatus } from "./rules/record-status";
import { pofiNote } from "@/domain/rules/pofi.js";
import { dateKey, weekday, sourceTimestamp } from "@/domain/rules/calendar";
import type { DayReport } from "./attendance";

export type SourcePassage = {
  date: string;
  time: string;
  direction: "in" | "out";
};
export type Report = {
  person: { id: string; name: string; unit: string; title: string };
  from: string;
  to: string;
  fetchedAt: string;
  passages: SourcePassage[];
  pofiNotes?: { date: string; id: string; parts: string[] }[];
};

// Preparation belongs to one report, plan, Istanbul date and freshness state.
export function prepareReport(
  report: Report,
  plan: WorkPlan,
  today: string,
  stale: boolean,
  targetSeconds = weeklyTarget(plan),
) {
  const startOfDay = new Date(sourceTimestamp(today, "00:00:00")!);
  const summary = summarize(report.passages, report.from, report.to, today);
  const sourceDays = summary.days.map((row) => {
    const selected = plan[weekday(row.date)] > 0;
    const passage = passageDay(report.passages, row.date, today);
    const statusInput = { day: row, passage, today, workingDay: selected };
    const state = dailyRecordStatus({ ...statusInput, live: false });
    return { row, passage, statusInput, state };
  });
  const { targets, plan: resolvedPlan, dailySeconds, blocked, exitGoal } = resolveWeekPlan(
    sourceDays.map(({ row, state }) => ({ date: row.date, state, recordedSeconds: row.duration })),
    plan,
    today,
    summary.weeks.some(week => week.partial),
    targetSeconds,
  );
  const timestamp = sourceTimestamp;
  const prepared = sourceDays.map(({ row, passage, statusInput }, index) => {
    const selected = resolvedPlan[weekday(row.date)] > 0;
    const input = {
      day: row,
      dailySeconds: targets[index],
      isToday: row.date === today,
      stale,
      passages: passage.events,
    };
    const firstEntry = timestamp(row.date, row.firstEntry);
    const lastExit = timestamp(row.date, row.lastExit);
    const records = (passage.events as SourcePassage[]).map((event, i) => ({
      id: `${row.date}:${i}`,
      at: new Date(timestamp(row.date, event.time)!).toISOString(),
      direction:
        event.direction === "in" ? ("entry" as const) : ("exit" as const),
    }));
    const fixed = {
      date: row.date,
      records,
      firstEntry,
      lastExit,
      recordedSeconds: row.duration,
      intervals: passageRecordRows(passage.events, row.date, today).map(
        (record) => {
          if (record.type === "unmatched")
            return {
              entry:
                record.event.direction === "in"
                  ? timestamp(row.date, record.event.time)
                  : null,
              exit:
                record.event.direction === "out"
                  ? timestamp(row.date, record.event.time)
                  : null,
              unmatched: true,
            };
          return {
            entry: timestamp(row.date, record.entry.time),
            exit:
              record.type === "interval"
                ? timestamp(row.date, record.exit.time)
                : null,
          };
        },
      ),
    };
    const goals = {
      plannedGoalSeconds: resolvedPlan[weekday(row.date)] * 60,
      goalSeconds: targets[index],
      dailyGoalSeconds: targets[index],
      exitGoalSeconds: selected && row.date === today ? exitGoal : null,
      stale,
    };
    const initialDuration = dailyDurationState({ ...input, now: startOfDay });
    function project(duration: typeof initialDuration, now: Date): DayReport {
      const state = dailyRecordStatus({
        ...statusInput,
        live: duration.basis === "live",
      });
      return {
        ...fixed,
        state,
        issues:
          state === "uncertain"
            ? ["Eksik veya tutarsız giriş–çıkış kaydı"]
            : [],
        liveSeconds: duration.basis === "live" ? duration.seconds : null,
        source: {
          ...goals,
          ...durationTotals(row.duration, duration),
          pofi: pofiNote({ ...input, now, today, workingDay: selected }),
        },
      };
    }
    const day = project(initialDuration, startOfDay);
    return {
      day,
      at(now: Date) {
        const duration = dailyDurationState({ ...input, now });
        // All time-dependent output derives from this rule's basis and seconds.
        if (
          duration.basis === initialDuration.basis &&
          duration.seconds === initialDuration.seconds
        )
          return day;
        return project(duration, now);
      },
    };
  });
  const presentation = {
    days: prepared.map(({ day }) => day),
    blocked,
    dailySeconds,
    plan: planMinutes(resolvedPlan),
  };
  const todayIndex = presentation.days.findIndex((day) => day.date === today);
  return (now: number) => {
    if (dateKey(now) !== today)
      throw new Error("Rapor hazırlığı güncel İstanbul tarihiyle yenilenmeli.");
    if (todayIndex === -1) return presentation;
    const day = prepared[todayIndex].at(new Date(now));
    if (day === presentation.days[todayIndex]) return presentation;
    const days = [...presentation.days];
    days[todayIndex] = day;
    return { ...presentation, days };
  };
}

export function presentReport(
  report: Report,
  plan: WorkPlan,
  now: number,
  stale: boolean,
  targetSeconds = weeklyTarget(plan),
) {
  return prepareReport(report, plan, dateKey(now), stale, targetSeconds)(now);
}
