"use client";
import { Fragment, useId, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { ui } from "@/lib/ui-text.js";
import {
  completeWeekPlan, editRequiredMinutes, isOpenPlanDay, referenceWeekTarget, resolveWeekPlan, setDayMinutes, weeklyTarget, DEFAULT_WORK_PLAN, PLAN_LIMITS, WORKING_DAY_COUNT, type WorkPlan, type PlanDay,
} from "@/domain/rules/work-plan";
import { weekLabel, durationText } from "@/domain/time";
import { weekday, weekStart } from "@/domain/rules/calendar";
import Modal from "./modal.js";
import { InlineNotice } from "./inline-notice";
import "./plan-editor.css";

const copy = ui.planner;
const hours = (minutes: number) => minutes === 0 ? "0 sa" : durationText(Math.round(minutes * 60), false);
const planHours = (minutes: number) => minutes % 30 === 0
  ? `${(minutes / 60).toLocaleString("tr-TR")} sa` : durationText(Math.round(minutes * 60), false);

export function PlanEditor({
  plan, defaultPlan, days, special, ready, week, today, error, leaveDays = [], zeroOpenDays = [], targetSeconds = weeklyTarget(plan), onSave, onSaveDefault, onReset, onClose,
}: {
  plan: WorkPlan;
  defaultPlan: WorkPlan;
  days: readonly PlanDay[];
  special: boolean;
  ready: boolean;
  week: string;
  today: string;
  error: string;
  leaveDays?: readonly number[];
  zeroOpenDays?: readonly number[];
  targetSeconds?: number;
  onSave: (plan: WorkPlan, targetSeconds?: number, leaveDays?: readonly number[]) => boolean;
  onSaveDefault: (plan: WorkPlan) => boolean;
  onReset: () => boolean;
  onClose: () => void;
}) {
  const [scope, setScope] = useState<"default" | "week">("week");
  const [selectedDay, setSelectedDay] = useState(() =>
    isOpenPlanDay(plan, weekday(today), zeroOpenDays) ? weekday(today)
      : Math.max(0, plan.findLastIndex((_, day) => isOpenPlanDay(plan, day, zeroOpenDays))));
  const id = useId();
  const weekDays = days.filter(day => weekStart(day.date) === week);
  const resolved = resolveWeekPlan(weekDays, plan, today, weekDays.length !== 7, targetSeconds, zeroOpenDays);
  const activePlan = scope === "default" ? defaultPlan : resolved.plan;
  const locked = scope === "week" && resolved.completed[selectedDay] !== null;
  const selectedSeconds = scope === "week" ? resolved.displaySeconds[selectedDay] : activePlan[selectedDay] * 60;
  const value = selectedSeconds / 60;
  const closed = scope === "week" ? !resolved.workingDays[selectedDay] : activePlan[selectedDay] === 0;
  const onLeave = scope === "week" && leaveDays.includes(selectedDay);
  const reopenMinutes = defaultPlan[selectedDay] || DEFAULT_WORK_PLAN[selectedDay];
  const plannedTotal = scope === "week" ? targetSeconds : weeklyTarget(activePlan);
  const total = plannedTotal;
  const defaultTotal = scope === "week" ? referenceWeekTarget(defaultPlan, leaveDays) : weeklyTarget(defaultPlan);
  const different = scope === "week" && plannedTotal !== defaultTotal;
  const selectedDifferent = scope === "week" && plan[selectedDay] !== defaultPlan[selectedDay];
  const completedPlan = scope === "week" && different
    ? completeWeekPlan(plan, defaultPlan, resolved, selectedDay, leaveDays) : null;
  const canApplyToOtherDays = activePlan.some((minutes, day) => day !== selectedDay &&
    (scope === "week" ? resolved.eligible[day] : minutes > 0) &&
    (scope === "week" ? resolved.displaySeconds[day] / 60 : minutes) !== value);
  const resetTotal = referenceWeekTarget(defaultPlan, leaveDays.filter(day => resolved.completed[day] !== null));
  const canReset = targetSeconds !== resetTotal || leaveDays.some(day => resolved.completed[day] === null) || plan.some((minutes, day) =>
    resolved.completed[day] === null && (minutes !== defaultPlan[day] || zeroOpenDays.includes(day)));
  const weekTitle = `${week === weekStart(today) ? ui.currentWeek : copy.selectedWeek} · ${weekLabel(week, true, today)}`;

  function saveManual(updates: readonly { day: number; minutes: number }[]) {
    if (scope === "default") {
      onSaveDefault(updates.reduce((next, update) => setDayMinutes(next, update.day, update.minutes), defaultPlan));
      return;
    }
    const changed = updates.filter(update => Math.round(update.minutes * 60) !== resolved.displaySeconds[update.day] ||
      (update.minutes === 0 && resolved.workingDays[update.day]));
    if (!changed.length) return;
    const next = editRequiredMinutes(plan, resolved, changed, defaultPlan, leaveDays);
    onSave(next.plan, next.targetSeconds, next.leaveDays);
  }

  function applyToOpenDays() {
    if (locked) return;
    saveManual(activePlan.flatMap((minutes, day) => day !== selectedDay &&
      (scope === "week" ? resolved.eligible[day] : minutes > 0) ? [{ day, minutes: value }] : []));
  }

  return (
    <Modal title={ui.workPlan} className="work-plan-modal" initialFocus="title" onClose={onClose}>
      <div className="work-planner">
        {error && <InlineNotice tone="warning">{error}</InlineNotice>}
        {scope === "week" && resolved.unallocatedSeconds !== 0 && <InlineNotice tone="warning">
          {copy.unallocated(durationText(Math.abs(resolved.unallocatedSeconds)), resolved.unallocatedSeconds > 0)}
        </InlineNotice>}
        <div className="work-plan-tabs" role="group" aria-label={copy.scope}>
          <button type="button" aria-pressed={scope === "default"} onClick={() => setScope("default")}>
            {copy.defaultPlan}
          </button>
          <button type="button" aria-pressed={scope === "week"} onClick={() => setScope("week")}>
            <span>{weekTitle}</span>
            {special && <span className="work-plan-dot" role="img" aria-label={copy.customWeek} />}
          </button>
        </div>
        <div className="work-plan-heading">
          <h3>{ui.workingDays}</h3>
          <span className={different ? "work-plan-total is-different" : "work-plan-total"} aria-live="polite">
            {different && <s aria-label={`${copy.defaultLabel} ${durationText(defaultTotal, false)}`}>{durationText(defaultTotal, false)}</s>}
            <span><span className="work-plan-total-label">{copy.total}</span> {durationText(total, false)}</span>
            {scope === "week" && resolved.projectedWeeklySeconds !== total &&
              <span className="work-plan-total-label" title={durationText(resolved.projectedWeeklySeconds)}>
                {copy.expectedTotal} {durationText(resolved.projectedWeeklySeconds, false)}
              </span>}
          </span>
        </div>
        <div className="work-plan-days" role="group" aria-label={copy.chooseDay}>
          {activePlan.slice(0, WORKING_DAY_COUNT).map((minutes, day) => {
            const recorded = scope === "week" ? resolved.completed[day] : null;
            const leave = scope === "week" && leaveDays.includes(day);
            const open = scope === "week" ? resolved.workingDays[day] : minutes > 0;
            const carried = scope === "week" && resolved.displaySeconds[day] !== minutes * 60;
            const displayedSeconds = recorded ?? (carried ? resolved.displaySeconds[day] : minutes * 60);
            const displayed = scope === "week" ? hours(displayedSeconds / 60) : planHours(minutes);
            return (
            <button key={day} type="button" className="work-plan-day"
              data-open={open || recorded !== null} data-locked={recorded !== null} aria-pressed={selectedDay === day}
              aria-label={`${ui.weekdays[day].long}, ${recorded !== null || open ? durationText(displayedSeconds) : (leave ? copy.onLeave : copy.closed).toLocaleLowerCase("tr-TR")}${recorded !== null ? `, ${copy.locked}` : ""}`}
              onClick={() => setSelectedDay(day)}>
              <span className="work-plan-day-label"><strong>{ui.weekdays[day].short}</strong>
                {recorded !== null && <LockKeyhole size={10} aria-hidden="true" />}</span>
              <span className="work-plan-day-time" title={durationText(displayedSeconds)}>{recorded !== null || open
                ? displayed.split(/ (?=\d)/).map((part, index) => (
                  <Fragment key={index}>{index > 0 && " "}<span className="work-plan-duration-part">{part}</span></Fragment>
                ))
                : leave ? copy.onLeave : "–"}</span>
            </button>
          ); })}
        </div>
        {locked ? (
          <div className="work-plan-day-editor" aria-labelledby={`${id}-day`}>
            <div className="work-plan-editor-top">
              <div className="work-plan-day-title">
                <strong id={`${id}-day`}>{ui.weekdays[selectedDay].long}</strong>
                <span>{copy.plannedLabel} {hours(plan[selectedDay])}
                  {selectedDifferent && <> · {copy.defaultLabel} {hours(defaultPlan[selectedDay])}</>}
                </span>
              </div>
              <span className="work-plan-recorded-time" title={durationText(selectedSeconds)} aria-label={`${copy.locked}, ${durationText(selectedSeconds)}`}>
                <LockKeyhole size={13} aria-hidden="true" />
                <span className="work-plan-recorded-label">{copy.recordedLabel}</span>
                {hours(selectedSeconds / 60)}
              </span>
            </div>
          </div>
        ) : (
        <fieldset className="work-plan-day-editor work-plan-editable" disabled={!ready} aria-labelledby={`${id}-day`}>
          <legend className="visually-hidden">{copy.selectedDayDuration}</legend>
          <div className="work-plan-editor-top">
            <div className="work-plan-day-title">
              <strong id={`${id}-day`}>{ui.weekdays[selectedDay].long}</strong>
              <button type="button" className="work-plan-day-action"
                aria-label={scope === "week" ? copy.leaveActionLabel(ui.weekdays[selectedDay].long, closed, onLeave)
                  : copy.dayActionLabel(ui.weekdays[selectedDay].long, closed)}
                onClick={() => saveManual([{ day: selectedDay, minutes: closed ? reopenMinutes : 0 }])}>
                {closed ? copy.openDay : scope === "week" ? copy.leaveDay : copy.closeDay}
              </button>
            </div>
            <div className="work-plan-duration-control">
              {!closed && canApplyToOtherDays && <button type="button" className="work-plan-apply"
                aria-label={copy.applyDurationToOpen(hours(value))} onClick={applyToOpenDays}>{copy.applyToOpen}</button>}
              {closed ? <span className="work-plan-closed-status">{onLeave ? copy.onLeave : copy.closed}</span> : (
                <div className="work-plan-stepper" role="group" aria-label={`${ui.weekdays[selectedDay].long} ${copy.duration}`}>
                  <button type="button" aria-label={copy.decrease} disabled={value === 0}
                    onClick={() => saveManual([{ day: selectedDay, minutes: Math.max(0, value - PLAN_LIMITS.stepMinutes) }])}>−</button>
                  <output aria-live="polite">{scope === "week" ? hours(value) : planHours(value)}</output>
                  <button type="button" aria-label={copy.increase} disabled={value === PLAN_LIMITS.maxDailyMinutes}
                    onClick={() => saveManual([{ day: selectedDay, minutes: Math.min(PLAN_LIMITS.maxDailyMinutes, value + PLAN_LIMITS.stepMinutes) }])}>+</button>
                </div>
              )}
            </div>
          </div>
        </fieldset>
        )}
        {scope === "week" && special && (different || canReset) && (
          <div className="work-plan-actions">
            <span>{different
              ? copy.difference(durationText(defaultTotal, false), durationText(Math.abs(plannedTotal - defaultTotal), false), plannedTotal < defaultTotal)
              : copy.customDistribution}</span>
            <div>
              {different && <button type="button" className="work-plan-complete" disabled={!ready || !completedPlan}
                aria-describedby={!completedPlan ? `${id}-capacity` : undefined}
                onClick={() => { if (completedPlan) onSave(completedPlan, defaultTotal, leaveDays); }}>{copy.complete((defaultTotal / 3600).toLocaleString("tr-TR"))}</button>}
              {canReset && <button type="button" className="work-plan-reset" disabled={!ready} onClick={onReset}>{copy.reset}</button>}
            </div>
          </div>
        )}
        {scope === "week" && different && !completedPlan &&
          <p id={`${id}-capacity`} className="work-plan-capacity">{copy.capacity}</p>}
      </div>
    </Modal>
  );
}
