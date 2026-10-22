"use client";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LockKeyhole } from "lucide-react";
import { ui } from "@/lib/ui-text.js";
import {
  completeWeekPlan, editRequiredMinutes, isOpenPlanDay, referenceWeekTarget, resolveWeekPlan, setDayMinutes, weeklyTarget, DEFAULT_WORK_PLAN, PLAN_LIMITS, WORK_PLAN_POLICY, WORKING_DAY_COUNT, type WorkPlan, type PlanDay,
} from "@/domain/rules/work-plan";
import { weekLabel, durationText } from "@/domain/time";
import { parsePlanDuration, stepPlanDuration } from "@/domain/rules/plan-duration";
import { weekday, weekStart } from "@/domain/rules/calendar";
import Modal from "./modal.js";
import { InlineNotice } from "./inline-notice";
import "./plan-editor.css";

const copy = ui.planner;
const hours = (minutes: number) => minutes === 0 ? `0 ${ui.units.hour}` : durationText(Math.round(minutes * 60), false);
const planHours = (minutes: number) => minutes % 30 === 0
  ? `${(minutes / 60).toLocaleString("tr-TR")} ${ui.units.hour}` : durationText(Math.round(minutes * 60), false);

function DurationInput({ value, label, disabled, onCommit }: { value: number; label: string; disabled: boolean; onCommit: (minutes: number) => void }) {
  const [draft, setDraft] = useState(hours(value));
  const [invalid, setInvalid] = useState(false);
  function commit() {
    if (draft === hours(value)) return;
    const parsed = parsePlanDuration(draft);
    if (parsed === null) { setInvalid(true); return; }
    setInvalid(false);
    setDraft(hours(parsed));
    if (parsed !== value) onCommit(parsed);
  }
  return <><input className="work-plan-duration-input" type="text" inputMode="text" value={draft} disabled={disabled}
    aria-label={label} aria-invalid={invalid} aria-describedby={invalid ? "plan-duration-error" : undefined}
    onChange={event => { setDraft(event.target.value); setInvalid(false); }} onBlur={commit}
    onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(hours(value)); setInvalid(false); } }} />
    {invalid && <span id="plan-duration-error" className="work-plan-input-help" role="alert">{copy.durationError}</span>}</>;
}

export function PlanEditor({
  plan, defaultPlan, days, special, ready, week, today, error, leaveDays = [], zeroOpenDays = [], userLockedDays = [], targetSeconds = weeklyTarget(plan), onSave, onSaveDefault, onReset, onSetLockedDays, onClose,
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
  userLockedDays?: readonly number[];
  targetSeconds?: number;
  onSave: (plan: WorkPlan, targetSeconds?: number, leaveDays?: readonly number[]) => boolean;
  onSaveDefault: (plan: WorkPlan) => boolean;
  onReset: () => boolean;
  onSetLockedDays?: (days: readonly number[], plan: WorkPlan) => boolean;
  onClose: () => void;
}) {
  const [scope, setScope] = useState<"default" | "week">("week");
  const [completionOpen, setCompletionOpen] = useState(false);
  const completionRef = useRef<HTMLSpanElement>(null);
  const completionButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedDay, setSelectedDay] = useState(() =>
    isOpenPlanDay(plan, weekday(today), zeroOpenDays) ? weekday(today)
      : Math.max(0, plan.findLastIndex((_, day) => isOpenPlanDay(plan, day, zeroOpenDays))));
  const id = useId();
  const weekDays = days.filter(day => weekStart(day.date) === week);
  const resolved = resolveWeekPlan(weekDays, plan, today, weekDays.length !== 7, targetSeconds, zeroOpenDays, WORK_PLAN_POLICY.autoReduceSurplus, userLockedDays);
  const preservedSurplus = !WORK_PLAN_POLICY.autoReduceSurplus && resolved.unallocatedSeconds < 0;
  const surplusCopy = preservedSurplus ? copy.surplus(durationText(-resolved.unallocatedSeconds)) : null;
  const activePlan = scope === "default" ? defaultPlan : plan;
  const locked = scope === "week" && resolved.locked[selectedDay];
  const selectedSeconds = scope === "week" ? resolved.displaySeconds[selectedDay] : activePlan[selectedDay] * 60;
  const value = selectedSeconds / 60;
  const closed = scope === "week" ? !resolved.workingDays[selectedDay] : activePlan[selectedDay] === 0;
  const onLeave = scope === "week" && leaveDays.includes(selectedDay);
  const userLocked = scope === "week" && userLockedDays.includes(selectedDay);
  const reopenMinutes = defaultPlan[selectedDay] || DEFAULT_WORK_PLAN[selectedDay];
  const plannedTotal = scope === "week" ? targetSeconds : weeklyTarget(activePlan);
  const total = plannedTotal;
  const defaultTotal = scope === "week" ? referenceWeekTarget(defaultPlan, leaveDays) : weeklyTarget(defaultPlan);
  const different = scope === "week" && plannedTotal !== defaultTotal;
  const needsCompletion = scope === "week" && (different || resolved.projectedWeeklySeconds !== defaultTotal);
  const selectedDifferent = scope === "week" && plan[selectedDay] !== defaultPlan[selectedDay];
  const equalPlan = needsCompletion ? completeWeekPlan(plan, defaultPlan, resolved, selectedDay, leaveDays, "equal") : null;
  const lastPlan = needsCompletion ? completeWeekPlan(plan, defaultPlan, resolved, selectedDay, leaveDays, "last") : null;
  const canApplyToOtherDays = activePlan.some((minutes, day) => day !== selectedDay &&
    (scope === "week" ? resolved.eligible[day] : minutes > 0) &&
    (scope === "week" ? resolved.displaySeconds[day] / 60 : minutes) !== value);
  const resetTotal = referenceWeekTarget(defaultPlan, leaveDays.filter(day => resolved.locked[day]));
  const canReset = userLockedDays.length > 0 || targetSeconds !== resetTotal || leaveDays.some(day => !resolved.locked[day]) || plan.some((minutes, day) =>
    !resolved.locked[day] && (minutes !== defaultPlan[day] || zeroOpenDays.includes(day)));
  const weekTitle = `${week === weekStart(today) ? ui.currentWeek : copy.selectedWeek} · ${weekLabel(week, true, today)}`;

  useEffect(() => {
    if (!completionOpen) return;
    function closeOutside(event: PointerEvent) {
      if (!completionRef.current?.contains(event.target as Node)) setCompletionOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [completionOpen]);

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

  function toggleDayLock() {
    if (!onSetLockedDays || locked || onLeave) return;
    const next = userLocked ? userLockedDays.filter(day => day !== selectedDay) : [...userLockedDays, selectedDay];
    const materialized = setDayMinutes(plan, selectedDay, value);
    onSetLockedDays(next, materialized);
  }

  return (
    <Modal title={ui.workPlan} className="work-plan-modal" initialFocus="title" onClose={onClose}>
      <div className="work-planner">
        <div className="work-plan-tabs" role="group" aria-label={copy.scope}>
          <button type="button" aria-pressed={scope === "default"} onClick={() => setScope("default")}>
            {copy.defaultPlan}
          </button>
          <button type="button" aria-pressed={scope === "week"} onClick={() => setScope("week")}>
            <span>{weekTitle}</span>
            {special && <span className="work-plan-dot" role="img" aria-label={copy.customWeek} />}
          </button>
        </div>
        {error && <InlineNotice tone="warning">{error}</InlineNotice>}
        {scope === "week" && resolved.unallocatedSeconds !== 0 && (!preservedSurplus || !different) && <InlineNotice tone={preservedSurplus ? "info" : "warning"}>
          {surplusCopy ? <>{surplusCopy.before}<strong className="work-plan-surplus-emphasis">{surplusCopy.emphasis}</strong>{surplusCopy.after}</>
            : copy.unallocated(durationText(Math.abs(resolved.unallocatedSeconds)), resolved.unallocatedSeconds > 0)}
        </InlineNotice>}
        <div className="work-plan-heading">
          <h3>{ui.workingDays}</h3>
          <span className={different ? "work-plan-total is-different" : "work-plan-total"} aria-live="polite">
            <span><span className="work-plan-total-label">{copy.total}</span> {durationText(total, false)}</span>
          </span>
        </div>
        <div className="work-plan-days" role="group" aria-label={copy.chooseDay}>
          {activePlan.slice(0, WORKING_DAY_COUNT).map((minutes, day) => {
            const recorded = scope === "week" ? resolved.completed[day] : null;
            const dayLocked = scope === "week" && resolved.locked[day];
            const leave = scope === "week" && leaveDays.includes(day);
            const open = scope === "week" ? resolved.workingDays[day] : minutes > 0;
            const carried = scope === "week" && resolved.displaySeconds[day] !== minutes * 60;
            const displayedSeconds = recorded ?? (carried ? resolved.displaySeconds[day] : minutes * 60);
            const displayed = scope === "week" ? hours(displayedSeconds / 60) : planHours(minutes);
            return (
            <button key={day} type="button" className="work-plan-day"
              data-open={open || dayLocked} data-locked={dayLocked || userLockedDays.includes(day)} aria-pressed={selectedDay === day}
              aria-label={`${ui.weekdays[day].long}, ${dayLocked && recorded === null ? copy.unknownDuration : recorded !== null || open ? durationText(displayedSeconds) : (leave ? copy.onLeave : copy.closed).toLocaleLowerCase("tr-TR")}${dayLocked ? `, ${copy.locked}` : userLockedDays.includes(day) ? `, ${copy.userLocked}` : ""}`}
              onClick={() => setSelectedDay(day)}>
              <span className="work-plan-day-label"><strong>{ui.weekdays[day].short}</strong>
                {(dayLocked || (scope === "week" && userLockedDays.includes(day))) && <LockKeyhole size={10} aria-hidden="true" />}</span>
              <span className="work-plan-day-time" title={dayLocked && recorded === null ? copy.unknownDuration : durationText(displayedSeconds)}>{dayLocked && recorded === null ? copy.unknownDuration : recorded !== null || open
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
              <span className="work-plan-recorded-time" title={resolved.completed[selectedDay] === null ? copy.unknownDuration : durationText(selectedSeconds)} aria-label={`${copy.locked}, ${resolved.completed[selectedDay] === null ? copy.unknownDuration : durationText(selectedSeconds)}`}>
                <LockKeyhole size={13} aria-hidden="true" />
                <span className="work-plan-recorded-label">{copy.recordedLabel}</span>
                {resolved.completed[selectedDay] === null ? copy.unknownDuration : hours(selectedSeconds / 60)}
              </span>
            </div>
          </div>
        ) : (
        <fieldset className="work-plan-day-editor work-plan-editable" disabled={!ready} aria-labelledby={`${id}-day`}>
          <legend className="visually-hidden">{copy.selectedDayDuration}</legend>
          <div className="work-plan-editor-top">
            <div className="work-plan-day-title">
              <strong id={`${id}-day`}>{ui.weekdays[selectedDay].long}</strong>
              <button type="button" className="work-plan-day-action" disabled={userLocked}
                aria-label={scope === "week" ? copy.leaveActionLabel(ui.weekdays[selectedDay].long, closed, onLeave)
                  : copy.dayActionLabel(ui.weekdays[selectedDay].long, closed)}
                onClick={() => saveManual([{ day: selectedDay, minutes: closed ? reopenMinutes : 0 }])}>
                {closed ? copy.openDay : scope === "week" ? copy.leaveDay : copy.closeDay}
              </button>
              {scope === "week" && !onLeave && onSetLockedDays && <button type="button" className="work-plan-lock"
                aria-pressed={userLocked} aria-label={userLocked ? copy.unlockDay(ui.weekdays[selectedDay].long) : copy.lockDay(ui.weekdays[selectedDay].long)}
                title={userLocked ? copy.unlock : copy.lock} onClick={toggleDayLock}>
                <LockKeyhole size={14} aria-hidden="true" />{userLocked ? copy.unlock : copy.lock}
              </button>}
            </div>
            <div className="work-plan-duration-control">
              {!closed && canApplyToOtherDays && <button type="button" className="work-plan-apply"
                aria-label={copy.applyDurationToOpen(hours(value))} onClick={applyToOpenDays}>{copy.applyToOpen}</button>}
              {closed ? <span className="work-plan-closed-status">{onLeave ? copy.onLeave : copy.closed}</span> : (
                <div className="work-plan-stepper" role="group" aria-label={`${ui.weekdays[selectedDay].long} ${copy.duration}`}>
                  <button type="button" aria-label={copy.decrease} disabled={userLocked || value === 0}
                    onClick={() => saveManual([{ day: selectedDay, minutes: stepPlanDuration(value, -1) }])}>−</button>
                  <DurationInput key={`${scope}-${selectedDay}-${selectedSeconds}`} value={value} disabled={userLocked}
                    label={`${ui.weekdays[selectedDay].long} ${copy.duration}`} onCommit={minutes => saveManual([{ day: selectedDay, minutes }])} />
                  <button type="button" aria-label={copy.increase} disabled={userLocked || value === PLAN_LIMITS.maxDailyMinutes}
                    onClick={() => saveManual([{ day: selectedDay, minutes: stepPlanDuration(value, 1) }])}>+</button>
                </div>
              )}
            </div>
          </div>
        </fieldset>
        )}
        {scope === "week" && (needsCompletion || (special && canReset)) && (
          <div className="work-plan-actions">
            {different && <span>{copy.difference(durationText(defaultTotal, false), durationText(Math.abs(plannedTotal - defaultTotal), false), plannedTotal < defaultTotal)}</span>}
            <div>
              {canReset && <button type="button" className="work-plan-reset" disabled={!ready} onClick={onReset}>{copy.reset}</button>}
              {needsCompletion && <span className="work-plan-completion" ref={completionRef}
                onBlur={event => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setCompletionOpen(false);
                }}
                onKeyDown={event => {
                  if (event.key === "Escape" && completionOpen) {
                    event.stopPropagation();
                    setCompletionOpen(false);
                    completionButtonRef.current?.focus();
                  }
                }}>
                <button type="button" className="work-plan-complete" ref={completionButtonRef}
                  disabled={!ready || (!equalPlan && !lastPlan)} aria-expanded={completionOpen}
                  aria-controls={`${id}-completion`}
                  aria-describedby={!equalPlan && !lastPlan ? `${id}-capacity` : undefined}
                  onClick={() => setCompletionOpen(open => !open)}>
                  {copy.complete((defaultTotal / 3600).toLocaleString("tr-TR"))}
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
                {completionOpen && <span id={`${id}-completion`} className="work-plan-completion-options">
                  <button type="button" disabled={!equalPlan} onClick={() => {
                    if (equalPlan) onSave(equalPlan, defaultTotal, leaveDays);
                    setCompletionOpen(false);
                  }}>{copy.distributeEqual}</button>
                  <button type="button" disabled={!lastPlan} onClick={() => {
                    if (lastPlan) onSave(lastPlan, defaultTotal, leaveDays);
                    setCompletionOpen(false);
                  }}>{copy.distributeLast}</button>
                </span>}
              </span>}
            </div>
          </div>
        )}
        {needsCompletion && !equalPlan && !lastPlan &&
          <p id={`${id}-capacity`} className="work-plan-capacity">{userLockedDays.length && !resolved.eligible.some(Boolean) ? copy.capacityLocked : copy.capacity}</p>}
      </div>
    </Modal>
  );
}
