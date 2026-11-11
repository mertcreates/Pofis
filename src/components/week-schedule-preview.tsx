"use client";

import { Fragment, useId, useRef, useState } from "react";
import { ui } from "@/lib/ui-text.js";
import { completeWeekPlan, referenceWeekTarget, readWeekPlan, editRequiredMinutes, DEFAULT_WORK_PLAN, PLAN_LIMITS, WORK_PLAN_POLICY, resolveWeekPlan, type IndependentWeekPlan, type ScheduleDraft, type ScheduleClockDraft, type PlanDay, type WeekTimes, type WorkPlan } from "@/domain/rules/work-plan";
import { previewWeekSchedule, resetScheduleDay } from "@/domain/rules/week-schedule";
import { parsePlanClock, planClockInputState } from "@/domain/rules/plan-duration";
import { durationText, formatClock } from "@/domain/time";
import { weekday, weekDates } from "@/domain/rules/calendar";
import { PlanCompletion } from "./plan-completion";
import { PlanSummary } from "./plan-summary";
import { PlanDayAction } from "./plan-day-action";
import { PlanTimeClear, PlanTimeInput } from "./plan-time-input";
import { ArrowRight, RotateCcw } from "lucide-react";
import { InlineNotice } from "./inline-notice";

const copy = ui.planner.schedule;
type Draft = ScheduleClockDraft;
const emptyDraft = (): ScheduleDraft => ({ drafts: {}, completion: null, leaveChanges: {} });
const clock = (seconds: number) => {
  const minute = ((Math.ceil(seconds / 60) % 1440) + 1440) % 1440;
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
};

export function IndependentWeekSchedule({ plan, week, ready, saved, onChange }: { plan: WorkPlan; week: string; ready: boolean; saved?: IndependentWeekPlan; onChange?: (value: IndependentWeekPlan) => void }) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [draft, setDraft] = useState<IndependentWeekPlan>(() => saved ?? { plan, ...emptyDraft() });
  function change(next: IndependentWeekPlan) { setDraft(next); onChange?.(next); }
  // Dates only align weekdays for the existing rule owner; this scenario has no real records or "today".
  const days: PlanDay[] = weekDates(week).map(date => ({ date, state: "future", recordedSeconds: null }));
  const resolved = resolveWeekPlan(days, draft.plan, week);
  return <WeekSchedulePreview week={week} today="" days={days} resolved={resolved} plan={draft.plan} defaultPlan={draft.plan} times={{}} leaveDays={[]}
    scenarioDraft={draft} onScenarioChange={next => change({ ...next, plan: draft.plan })} onScenarioReset={() => change({ plan, ...emptyDraft() })}
    ready={ready} selectedDay={selectedDay} onSelectDay={setSelectedDay} />;
}

export function WeekSchedulePreview({ week, today, days, resolved: savedResolved, plan, defaultPlan, zeroOpenDays = [], userLockedDays = [], times, leaveDays: savedLeaves, ready, selectedDay, onSelectDay, scenarioDraft, onScenarioChange, onScenarioReset }: {
  week: string;
  today: string;
  days: readonly (PlanDay & { firstEntry?: number | null; lastExit?: number | null })[];
  resolved: ReturnType<typeof resolveWeekPlan>;
  plan: WorkPlan;
  defaultPlan: WorkPlan;
  zeroOpenDays?: readonly number[];
  userLockedDays?: readonly number[];
  times: WeekTimes;
  leaveDays: readonly number[];
  ready: boolean;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  scenarioDraft?: ScheduleDraft;
  onScenarioChange?: (value: ScheduleDraft) => void;
  onScenarioReset?: () => void;
}) {
  const id = useId();
  const dayPickerRef = useRef<HTMLDivElement>(null);
  const entryRef = useRef<HTMLInputElement>(null);
  const exitRef = useRef<HTMLInputElement>(null);
  const [localDraft, setLocalDraft] = useState(emptyDraft);
  const schedule = scenarioDraft ?? localDraft;
  const { drafts, completion, leaveChanges } = schedule;
  function updateSchedule(update: (current: ScheduleDraft) => ScheduleDraft) {
    if (onScenarioChange) onScenarioChange(update(schedule));
    else setLocalDraft(update);
  }
  const [confirmed, setConfirmed] = useState<Record<number, Partial<Record<"entry" | "exit", boolean>>>>({});
  const dates = weekDates(week);
  const complete = days.filter(day => dates.includes(day.date)).length === 7;
  const reliable = complete && !savedResolved.blocked;
  const initialPlan = readWeekPlan(plan.map((minutes, day) => savedResolved.locked[day] ? minutes : savedResolved.displaySeconds[day] / 60))!;
  const basePlan = completion?.plan ?? initialPlan;
  const baseLeaves = completion?.leaveDays ?? savedLeaves;
  const baseZeroOpenDays = completion?.zeroOpenDays ?? zeroOpenDays;
  const weekDays = days.filter(day => dates.includes(day.date));
  const baseResolved = completion ? resolveWeekPlan(weekDays, basePlan, today || week, !complete,
    completion.targetSeconds, baseZeroOpenDays, WORK_PLAN_POLICY.autoReduceSurplus, userLockedDays, "manual") : savedResolved;
  const updates = dates.slice(0, 5).flatMap((_, day) => {
    const leave = leaveChanges[day] ?? savedLeaves.includes(day);
    return leave === baseLeaves.includes(day) || savedResolved.locked[day] || userLockedDays.includes(day) ? []
      : [{ day, minutes: leave ? 0 : defaultPlan[day] || DEFAULT_WORK_PLAN[day] }];
  });
  const scenario = updates.length ? editRequiredMinutes(basePlan, baseResolved, updates, defaultPlan, baseLeaves) : null;
  const leaveDays = scenario?.leaveDays ?? baseLeaves;
  const resolved = scenario ? resolveWeekPlan(weekDays, scenario.plan, today || week,
    !complete, scenario.targetSeconds, baseZeroOpenDays.filter(day => !leaveDays.includes(day)), WORK_PLAN_POLICY.autoReduceSurplus, userLockedDays, "manual") : baseResolved;
  const fixed: Partial<Record<number, number>> = {};
  const invalid: number[] = [];
  const pending: number[] = [];
  const formatErrors: Record<number, { entry: boolean; exit: boolean }> = {};
  const rows = dates.slice(0, 5).map((date, day) => {
    const source = days.find(item => item.date === date);
    const firstEntry = date === today ? source?.firstEntry : null;
    const actual = firstEntry == null ? null : formatClock(firstEntry).split(":").map(Number).reduce((total, part) => total * 60 + part, 0);
    const draft = drafts[day];
    const saved = times[day];
    const anchor = actual !== null ? "entry" : draft?.anchor ?? saved?.anchor ?? "entry";
    const entry = actual !== null ? formatClock(firstEntry!, false) : draft?.entry ?? (!draft && saved?.anchor === "entry" ? clock(saved.minute * 60) : "");
    const exit = draft?.exit ?? (!draft && saved?.anchor === "exit" ? clock(saved.minute * 60) : "");
    const entryState = planClockInputState(entry), exitState = planClockInputState(exit);
    const entryPending = actual === null && draft?.entry !== undefined && entryState !== "empty" && entryState !== "complete";
    const exitPending = draft?.exit !== undefined && exitState !== "empty" && exitState !== "complete";
    if (resolved.eligible[day] && (entryPending || exitPending)) pending.push(day);
    formatErrors[day] = { entry: entryPending && !!confirmed[day]?.entry, exit: exitPending && !!confirmed[day]?.exit };
    const manualPair = draft?.entry !== undefined && draft.exit !== undefined;
    if (resolved.eligible[day] && (actual !== null || manualPair) && entryState === "complete" && exitState === "complete") {
      const entryMinute = parsePlanClock(entry), exitMinute = parsePlanClock(exit);
      if (entryMinute !== null && exitMinute !== null) {
        const originalExit = actual === null ? null : clock(actual + savedResolved.displaySeconds[day]);
        const value = actual !== null && clock(exitMinute * 60) === originalExit ? savedResolved.displaySeconds[day]
          : (exitMinute * 60 - (actual ?? entryMinute * 60) + 86400) % 86400;
        if (value > PLAN_LIMITS.maxDailyMinutes * 60) invalid.push(day);
        else fixed[day] = value;
      }
    }
    return { day, date, entry, exit, anchor, actual, explicitPair: manualPair || (actual !== null && draft?.exit !== undefined), recordedEntry: source?.firstEntry == null ? "" : formatClock(source.firstEntry, false), recordedExit: source?.lastExit == null ? "" : formatClock(source.lastExit, false) };
  });
  const result = previewWeekSchedule(resolved, fixed);
  const dayClocks = rows.map(({ day, entry, exit, anchor, actual, explicitPair, recordedEntry, recordedExit }) => {
    if (resolved.locked[day]) return { shownEntry: recordedEntry, shownExit: recordedExit, nextDay: false, previousDay: false };

    const entryMinute = planClockInputState(entry) === "complete" ? parsePlanClock(entry) : null;
    const exitMinute = planClockInputState(exit) === "complete" ? parsePlanClock(exit) : null;
    const seconds = result.seconds[day];
    const shownEntry = !explicitPair && anchor === "exit" && exitMinute !== null ? clock(exitMinute * 60 - seconds) : entry;
    const shownExit = !explicitPair && anchor === "entry" && entryMinute !== null ? clock((actual ?? entryMinute * 60) + seconds) : exit;
    const nextDay = (explicitPair || anchor === "entry") && entryMinute !== null && (actual ?? entryMinute * 60) + seconds >= 86400;
    const previousDay = !explicitPair && anchor === "exit" && exitMinute !== null && exitMinute * 60 - seconds < 0;
    return { shownEntry, shownExit, nextDay, previousDay };
  });
  const referenceTarget = referenceWeekTarget(defaultPlan, leaveDays);
  const needsCompletion = result.total !== referenceTarget || resolved.weeklySeconds !== referenceTarget;
  const completionResolved = { ...resolved, displaySeconds: result.seconds, projectedWeeklySeconds: result.total,
    eligible: resolved.eligible.map((eligible, day) => eligible && fixed[day] === undefined) };
  const valid = reliable && invalid.length === 0 && pending.length === 0;
  const equalPlan = valid && needsCompletion ? completeWeekPlan(scenario?.plan ?? basePlan, defaultPlan, completionResolved, "equal", leaveDays) : null;
  const lastPlan = valid && needsCompletion ? completeWeekPlan(scenario?.plan ?? basePlan, defaultPlan, completionResolved, "last", leaveDays) : null;
  function completePlan(mode: "equal" | "last") {
    const next = mode === "equal" ? equalPlan : lastPlan;
    if (!next) return;
    updateSchedule(current => ({ ...current, completion: { plan: next, targetSeconds: referenceTarget, leaveDays: [...leaveDays],
      zeroOpenDays: next.flatMap((minutes, day) => minutes === 0 && resolved.workingDays[day] && !leaveDays.includes(day) ? [day] : []) } }));
  }
  function clearDay(day: number) {
    updateSchedule(current => resetScheduleDay(current, day, { plan: initialPlan, leaveDays: savedLeaves, zeroOpenDays }, defaultPlan));
  }
  function edit(day: number, field: "entry" | "exit", value: string) {
    updateSchedule(current => {
      const saved = times[day];
      // A saved anchor is already a user choice; editing its opposite makes a manual pair.
      const previous = current.drafts[day] ?? (saved ? { anchor: saved.anchor, [saved.anchor]: clock(saved.minute * 60) } : undefined);
      if (value === "") {
        const next: Draft = { ...previous, anchor: field === "entry" ? "exit" : "entry" };
        delete next[field];
        return { ...current, drafts: { ...current.drafts, [day]: next } };
      }
      return { ...current, drafts: { ...current.drafts, [day]: { ...previous, anchor: field, [field]: value } } };
    });
    setConfirmed(current => ({ ...current, [day]: { ...current[day], [field]: false } }));
  }
  function resetDay(day: number) {
    clearDay(day);
    setConfirmed(current => { const next = { ...current }; delete next[day]; return next; });
    const input = entryRef.current?.disabled ? exitRef.current : entryRef.current;
    if (input) input.focus();
    else dayPickerRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
  }
  function originalClocks(day: number) {
    const row = rows[day];
    const duration = savedResolved.displaySeconds[day];
    if (row.actual !== null) return { entry: clock(Math.floor(row.actual / 60) * 60), exit: clock(row.actual + duration) };
    const saved = times[day];
    if (!saved) return { entry: "", exit: "" };
    return saved.anchor === "entry"
      ? { entry: clock(saved.minute * 60), exit: clock(saved.minute * 60 + duration) }
      : { entry: clock(saved.minute * 60 - duration), exit: clock(saved.minute * 60) };
  }
  function originalDay(day: number, draft = drafts[day]) {
    if (leaveDays.includes(day) !== savedLeaves.includes(day) || result.seconds[day] !== savedResolved.displaySeconds[day]) return false;
    if (!draft || leaveDays.includes(day)) return true;
    const original = originalClocks(day);
    const actual = rows[day].actual;
    let entry = actual !== null ? original.entry : draft.entry ?? "";
    let exit = draft.exit ?? "";
    const pair = draft.entry !== undefined && draft.exit !== undefined;
    if (actual !== null && draft.exit === undefined) exit = original.exit;
    else if (actual === null && !pair) {
      const value = parsePlanClock(draft[draft.anchor] ?? "");
      if (value !== null) {
        if (draft.anchor === "entry") exit = clock(value * 60 + savedResolved.displaySeconds[day]);
        else entry = clock(value * 60 - savedResolved.displaySeconds[day]);
      }
    }
    const normalized = (value: string) => {
      const minute = parsePlanClock(value);
      return minute === null ? value : clock(minute * 60);
    };
    return normalized(entry) === original.entry && normalized(exit) === original.exit;
  }
  function finishDay(day: number) {
    if (!originalDay(day)) return;
    clearDay(day);
    setConfirmed(current => { const next = { ...current }; delete next[day]; return next; });
  }
  function confirmClock(day: number, field: "entry" | "exit") {
    setConfirmed(current => ({ ...current, [day]: { ...current[day], [field]: true } }));
  }
  function finishEditing(day: number, field: "entry" | "exit") {
    confirmClock(day, field);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }
  return <section className="week-schedule-preview" aria-label={copy.title}>
    {!reliable && <InlineNotice tone="warning">{copy.incomplete}</InlineNotice>}
    <PlanSummary targetSeconds={resolved.weeklySeconds} totalSeconds={reliable && invalid.length === 0 && pending.length === 0 ? result.total : null} />
    <div className="work-plan-heading"><h3>{ui.workingDays}</h3></div>
    <div ref={dayPickerRef} className="work-plan-days" role="group" aria-label={ui.planner.chooseDay}>
      {rows.map(({ day, date }) => {
        const recorded = resolved.locked[day];
        const unknown = recorded && resolved.completed[day] === null;
        const duration = pending.includes(day) || invalid.includes(day) ? ui.emptyValue : unknown ? ui.planner.unknownDuration : leaveDays.includes(day) ? ui.planner.onLeave : !resolved.workingDays[day] && !resolved.locked[day] ? ui.planner.closed : durationText(result.seconds[day], false);
        const { shownEntry, shownExit, nextDay, previousDay } = dayClocks[day];
        const showClocks = !leaveDays.includes(day) && (shownEntry || shownExit) &&
          (recorded || (reliable && resolved.workingDays[day] && !pending.includes(day) && !invalid.includes(day)));
        const clockLabel = showClocks ? [
          shownEntry && `${copy.entryTime} ${shownEntry}${previousDay ? ` (${copy.previousDay})` : ""}`,
          shownExit && `${copy.exitTime} ${shownExit}${nextDay ? ` (${copy.nextDay})` : ""}`,
        ].filter(Boolean).join(", ") : "";
        return <button key={date} type="button" className="work-plan-day" aria-pressed={selectedDay === day}
          data-open={resolved.workingDays[day] || resolved.locked[day]} data-locked={resolved.locked[day] || userLockedDays.includes(day)}
          aria-label={`${ui.weekdays[day].long}, ${duration}${date === today ? `, ${ui.today}` : ""}`}
          aria-describedby={showClocks ? `${id}-day-clocks-${day}` : undefined}
          onClick={() => onSelectDay(day)}>
          <span className="work-plan-day-label"><strong>{ui.weekdays[day].short}</strong></span>
          <span className="work-plan-day-time">{duration.split(/ (?=\d)/).map((part, index) => <Fragment key={index}>{index > 0 && " "}<span className="work-plan-duration-part">{part}</span></Fragment>)}</span>
          {showClocks && <>
            <span className="week-schedule-day-clocks" aria-hidden="true">
              <span>{shownEntry || ui.emptyValue}</span>
              <span>– {shownExit || ui.emptyValue}</span>
            </span>
            <span className="visually-hidden" id={`${id}-day-clocks-${day}`}>{clockLabel}</span>
          </>}
        </button>;
      })}
    </div>
    {rows.filter(({ day }) => day === selectedDay).map(({ day, date, entry, exit, actual }) => {
      const editable = resolved.eligible[day] && reliable;
      const recorded = resolved.locked[day];
      const onLeave = leaveDays.includes(day);
      const canToggleLeave = reliable && !savedResolved.locked[day] && !userLockedDays.includes(day);
      const seconds = result.seconds[day];
      const { shownEntry, shownExit, nextDay, previousDay } = dayClocks[day];
      const label = ui.weekdays[day].long;
      const entryLabel = `${label} ${copy.entryTime.toLocaleLowerCase("tr-TR")}`;
      const exitLabel = `${label} ${copy.exitTime.toLocaleLowerCase("tr-TR")}`;
      return <fieldset key={date} className="work-plan-day-editor week-schedule-editor" disabled={!ready || !reliable} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) finishDay(day); }}>
        <legend className="visually-hidden">{label}</legend>
        <div className="work-plan-editor-top">
          <div className="week-schedule-title"><div className="work-plan-day-title"><strong>{label}</strong></div>
            {canToggleLeave && <div className="work-plan-day-options"><PlanDayAction pressed={onLeave} label={ui.planner.leaveActionLabel(label, !resolved.workingDays[day], onLeave)} onClick={() => updateSchedule(current => ({ ...current, leaveChanges: { ...current.leaveChanges, [day]: !onLeave } }))}>{onLeave ? ui.planner.onLeave : ui.planner.leaveDay}</PlanDayAction></div>}</div>
          <div className="week-schedule-day-summary">{(editable || recorded) && <span className="week-schedule-duration">{recorded && resolved.completed[day] === null ? ui.planner.unknownDuration : (invalid.includes(day) || pending.includes(day)) ? ui.emptyValue : durationText(seconds, false)}</span>}
            {canToggleLeave && !originalDay(day) && <button type="button" className="week-schedule-day-reset" aria-label={copy.resetDay(label)} title={copy.resetDay(label)} onClick={() => resetDay(day)}><RotateCcw size={14} aria-hidden="true" /></button>}</div>
        </div>
        {!onLeave && (!editable && !recorded ? <p className="week-schedule-state">{resolved.locked[day] && resolved.completed[day] === null ? ui.planner.unknownDuration : durationText(resolved.displaySeconds[day])}{" · "}{resolved.locked[day] ? ui.planner.recordedLabel : resolved.workingDays[day] ? ui.planner.userLocked : ui.planner.closed}</p>
          : <>
            <div className="week-schedule-clocks">
              <div className="week-schedule-clock" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) confirmClock(day, "entry"); }}><span className="week-schedule-label">{copy.entryTime}</span><div className="work-plan-time-field">
                <PlanTimeInput inputRef={entryRef} value={shownEntry} disabled={actual !== null || !editable || !ready} label={entryLabel}
                  invalid={formatErrors[day].entry || (actual === null && invalid.includes(day))} errorId={formatErrors[day].entry ? `${id}-entry-error` : `${id}-capacity-error`} onChange={value => edit(day, "entry", value)} onConfirm={() => finishEditing(day, "entry")} />
                {editable && actual === null && <PlanTimeClear label={copy.clearClock(entryLabel)} disabled={!ready || !entry}
                  onClear={() => { edit(day, "entry", ""); entryRef.current?.focus(); }} />}
              </div></div>
              <ArrowRight size={16} aria-hidden="true" />
              <div className="week-schedule-clock" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) confirmClock(day, "exit"); }}><span className="week-schedule-label">{copy.exitTime}</span><div className="work-plan-time-field">
                <PlanTimeInput inputRef={exitRef} value={shownExit} disabled={!editable || !ready} label={exitLabel}
                  invalid={formatErrors[day].exit || invalid.includes(day)} errorId={formatErrors[day].exit ? `${id}-exit-error` : `${id}-capacity-error`} onChange={value => edit(day, "exit", value)} onConfirm={() => finishEditing(day, "exit")} />
                {editable && <PlanTimeClear label={copy.clearClock(exitLabel)} disabled={!ready || !exit}
                  onClear={() => { edit(day, "exit", ""); exitRef.current?.focus(); }} />}
              </div></div>
            </div>
            {(["entry", "exit"] as const).map(field => formatErrors[day][field] && <p key={field} id={`${id}-${field}-error`} className="work-plan-capacity" role="alert">{planClockInputState(field === "entry" ? entry : exit) === "incomplete" ? copy.incompleteTime : ui.planner.timeError}</p>)}
            {invalid.includes(day) && <p id={`${id}-capacity-error`} className="work-plan-capacity" role="alert">{copy.invalid}</p>}
            {!recorded && !pending.includes(day) && !invalid.includes(day) && (nextDay || previousDay) && <p className="week-schedule-help">{nextDay ? copy.nextDay : copy.previousDay}</p>}
          </>)}
      </fieldset>;
    })}
    <div className="work-plan-actions"><div>
      <button type="button" className="work-plan-reset" onClick={() => { setConfirmed({}); if (onScenarioReset) onScenarioReset(); else updateSchedule(emptyDraft); }}>{copy.reset}</button>
      {needsCompletion && valid && <PlanCompletion targetSeconds={referenceTarget} surplus={result.total >= referenceTarget}
        disabled={!ready} canEqual={!!equalPlan} canLast={!!lastPlan} descriptionId={`${id}-completion-capacity`}
        onComplete={completePlan} />}
    </div></div>
    {needsCompletion && valid && !equalPlan && !lastPlan && <p id={`${id}-completion-capacity`} className="work-plan-capacity">{ui.planner.capacity}</p>}
  </section>;
}
