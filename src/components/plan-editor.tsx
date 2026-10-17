"use client";
import { Fragment, useId, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { ui } from "@/lib/ui-text.js";
import {
  completeWeekPlan, readWeekPlan, resolveWeekPlan, setDayMinutes, weeklyTarget, PLAN_LIMITS, WORKING_DAY_COUNT, type WorkPlan, type PlanDay,
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
  plan, defaultPlan, days, special, ready, week, today, error, targetSeconds = weeklyTarget(plan), onSave, onSaveDefault, onReset, onClose,
}: {
  plan: WorkPlan;
  defaultPlan: WorkPlan;
  days: readonly PlanDay[];
  special: boolean;
  ready: boolean;
  week: string;
  today: string;
  error: string;
  targetSeconds?: number;
  onSave: (plan: WorkPlan, targetSeconds?: number) => boolean;
  onSaveDefault: (plan: WorkPlan) => boolean;
  onReset: () => boolean;
  onClose: () => void;
}) {
  const [scope, setScope] = useState<"default" | "week">("week");
  const [editedDays, setEditedDays] = useState<boolean[]>(Array(7).fill(false));
  const [selectedDay, setSelectedDay] = useState(() =>
    plan[weekday(today)] > 0 ? weekday(today) : Math.max(0, plan.findLastIndex(minutes => minutes > 0)));
  const id = useId();
  const weekDays = days.filter(day => weekStart(day.date) === week);
  const resolved = resolveWeekPlan(weekDays, plan, today, weekDays.length !== 7, targetSeconds);
  const activePlan = scope === "default" ? defaultPlan : resolved.plan;
  const locked = scope === "week" && resolved.completed[selectedDay] !== null;
  const selectedSeconds = locked ? resolved.completed[selectedDay]! : activePlan[selectedDay] * 60;
  const value = activePlan[selectedDay];
  const plannedTotal = scope === "week" ? targetSeconds : weeklyTarget(activePlan);
  const total = plannedTotal;
  const defaultTotal = weeklyTarget(defaultPlan);
  const different = scope === "week" && plannedTotal !== defaultTotal;
  const selectedDifferent = scope === "week" && value !== defaultPlan[selectedDay];
  const adjusted = scope === "week" && !locked && resolved.displaySeconds[selectedDay] !== value * 60;
  const completedPlan = scope === "week" && different
    ? completeWeekPlan(plan, defaultPlan, resolved, editedDays) : null;
  const protectedNames = ui.weekdays.flatMap((day, index) => editedDays[index]
    ? [`${day.long} ${planHours(plan[index])}`] : []);
  const completionChanges = completedPlan?.flatMap((minutes, day) => resolved.completed[day] === null &&
    Math.round(minutes * 60) !== resolved.displaySeconds[day] ? [day] : []) ?? [];
  const changedDay = completionChanges.length === 1 ? completionChanges[0] : null;
  const completeLabel = changedDay !== null && completedPlan
    ? copy.adjustDay(changedDay, hours(Math.abs(completedPlan[changedDay] * 60 - resolved.displaySeconds[changedDay]) / 60), completedPlan[changedDay] * 60 > resolved.displaySeconds[changedDay])
    : copy.complete((defaultTotal / 3600).toLocaleString("tr-TR"));
  const canApplyToOtherDays = activePlan.some((minutes, day) => day !== selectedDay &&
    (scope === "week" ? resolved.eligible[day] : minutes > 0) && minutes !== value);
  const canReset = editedDays.some(Boolean) || plan.some((minutes, day) =>
    resolved.completed[day] === null && minutes !== defaultPlan[day]);
  const save = scope === "default" ? onSaveDefault : onSave;
  const weekTitle = `${week === weekStart(today) ? ui.currentWeek : copy.selectedWeek} · ${weekLabel(week, true, today)}`;

  function saveManual(next: WorkPlan) {
    if (!save(next) || scope !== "week") return;
    setEditedDays(previous => previous.map((edited, day) => edited || next[day] !== activePlan[day]));
  }

  function applyToOpenDays() {
    if (locked) return;
    const next = readWeekPlan(activePlan.map((minutes, day) => scope === "week" && !resolved.eligible[day]
      ? minutes : minutes > 0 || day === selectedDay ? value : 0));
    if (next) saveManual(next);
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
            const carried = scope === "week" && resolved.displaySeconds[day] !== minutes * 60;
            const displayedSeconds = recorded ?? (carried ? resolved.displaySeconds[day] : minutes * 60);
            const displayed = recorded !== null || carried ? hours(displayedSeconds / 60) : planHours(minutes);
            return (
            <button key={day} type="button" className="work-plan-day"
              data-open={minutes > 0 || recorded !== null} data-locked={recorded !== null} aria-pressed={selectedDay === day}
              aria-label={`${ui.weekdays[day].long}, ${recorded !== null || minutes > 0 ? durationText(displayedSeconds) : copy.closed.toLocaleLowerCase("tr-TR")}${recorded !== null ? `, ${copy.locked}` : ""}`}
              onClick={() => setSelectedDay(day)}>
              <span className="work-plan-day-label"><strong>{ui.weekdays[day].short}</strong>
                {recorded !== null && <LockKeyhole size={10} aria-hidden="true" />}</span>
              <span className="work-plan-day-time" title={durationText(displayedSeconds)}>{recorded !== null || minutes > 0
                ? displayed.split(/ (?=\d)/).map((part, index) => (
                  <Fragment key={index}>{index > 0 && " "}<span className="work-plan-duration-part">{part}</span></Fragment>
                ))
                : "–"}</span>
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
        <fieldset className="work-plan-day-editor" disabled={!ready} aria-labelledby={`${id}-day`}>
          <legend className="visually-hidden">{copy.selectedDayDuration}</legend>
          <div className="work-plan-editor-top">
            <div className="work-plan-day-title">
              <strong id={`${id}-day`}>{ui.weekdays[selectedDay].long}</strong>
              {scope === "week" && <span>{copy.plannedLabel} {planHours(value)}
                {adjusted && <> · {copy.effectiveTarget} {durationText(resolved.displaySeconds[selectedDay], false)}</>}
              </span>}
            </div>
            <div className="work-plan-stepper" role="group" aria-label={`${ui.weekdays[selectedDay].long} ${copy.duration}`}>
              <button type="button" aria-label={copy.decrease} disabled={value === 0}
                onClick={() => saveManual(setDayMinutes(activePlan, selectedDay, Math.max(0, value - PLAN_LIMITS.stepMinutes)))}>−</button>
              <output aria-live="polite">{planHours(value)}</output>
              <button type="button" aria-label={copy.increase} disabled={value === PLAN_LIMITS.maxDailyMinutes}
                onClick={() => saveManual(setDayMinutes(activePlan, selectedDay, Math.min(PLAN_LIMITS.maxDailyMinutes, value + PLAN_LIMITS.stepMinutes)))}>+</button>
            </div>
          </div>
          <div className="work-plan-editor-bottom">
            <div className="work-plan-presets" role="group" aria-label={copy.presets}>
              {[0, 240, 480].map(minutes => (
                <button key={minutes} type="button" aria-pressed={value === minutes}
                  onClick={() => saveManual(setDayMinutes(activePlan, selectedDay, minutes))}>
                  {minutes === 0 ? copy.closed : hours(minutes)}
                </button>
              ))}
            </div>
            {canApplyToOtherDays && <button type="button" className="work-plan-apply" onClick={applyToOpenDays}>{copy.applyToOpen}</button>}
          </div>
        </fieldset>
        )}
        {scope === "week" && special && (
          <div className="work-plan-actions">
            <span>{different
              ? copy.difference(durationText(Math.abs(plannedTotal - defaultTotal), false), plannedTotal < defaultTotal)
              : copy.customDistribution}</span>
            <div>
              {different && <button type="button" className="work-plan-complete" disabled={!ready || !completedPlan}
                aria-describedby={!completedPlan ? `${id}-capacity` : undefined}
                onClick={() => { if (completedPlan) onSave(completedPlan, defaultTotal); }}>{completeLabel}</button>}
              {canReset && <button type="button" disabled={!ready} onClick={() => {
                if (onReset()) setEditedDays(Array(7).fill(false));
              }}>{copy.reset}</button>}
            </div>
          </div>
        )}
        {scope === "week" && different && !completedPlan &&
          <p id={`${id}-capacity`} className="work-plan-capacity">{protectedNames.length > 0
            ? copy.protectedCapacity(protectedNames.join(", "), (defaultTotal / 3600).toLocaleString("tr-TR"))
            : copy.capacity}</p>}
      </div>
    </Modal>
  );
}
