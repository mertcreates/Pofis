"use client";

import { ui } from "@/lib/ui-text.js";

import { memo, useState } from "react";
import {
  readPlanInput,
  PLAN_LIMITS,
  planTargets,
} from "@/domain/rules/work-plan";

/** @param {{ plan: import('../domain/report').WorkPlan, onChange: (plan: import('../domain/report').WorkPlan) => unknown }} props */
function PlanControls({ plan, onChange }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const { dailyHours: dailyTargetHours, dayCount } = planTargets(plan);
  const hours = String(plan.goals.hours);
  const dailyHours = String(Number(dailyTargetHours.toFixed(4)));

  function changeHours(field, value) {
    setDraft({ field, value });
    const next = readPlanInput({
      weekdays: plan.goals.weekdays,
      [field]: value,
    });
    setError(next ? "" : ui.validHours);
    if (next) onChange(next);
  }

  function toggleDay(index) {
    const weekdays = plan.goals.weekdays.includes(index)
      ? plan.goals.weekdays.filter((day) => day !== index)
      : [...plan.goals.weekdays, index];
    const next = readPlanInput({
      weekdays,
      dailyHours: dailyTargetHours,
    });
    if (!next) {
      setError(ui.hoursDoNotFit);
      return;
    }
    setError("");
    setDraft(null);
    onChange(next);
  }

  return (
    <div className="plan-settings">
      <fieldset className="plan-setting plan-weekdays">
        <legend>{ui.workingDays}</legend>
        <div className="plan-day-options">
          {ui.weekdays.map(({ short, long }, index) => (
            <button
              key={long}
              type="button"
              aria-label={long}
              aria-pressed={plan.goals.weekdays.includes(index)}
              disabled={
                dayCount === PLAN_LIMITS.minDays &&
                plan.goals.weekdays.includes(index)
              }
              onClick={() => toggleDay(index)}
            >
              {short}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="plan-setting plan-hours">
        <label htmlFor="plan-hours">{ui.weeklyHours}</label>
        <input
          id="plan-hours"
          type="number"
          min={PLAN_LIMITS.minHours}
          max={dayCount * PLAN_LIMITS.maxDailyHours}
          step="any"
          required
          aria-invalid={draft?.field === "hours" && !!error}
          aria-describedby={error ? "plan-input-error" : undefined}
          value={draft?.field === "hours" ? draft.value : hours}
          onChange={(event) => changeHours("hours", event.target.value)}
          onBlur={() => {
            setDraft(null);
            setError("");
          }}
        />
      </div>
      <div className="plan-setting plan-hours">
        <label htmlFor="plan-daily-hours">{ui.dailyHours}</label>
        <input
          id="plan-daily-hours"
          type="number"
          min={PLAN_LIMITS.minHours}
          max={PLAN_LIMITS.maxDailyHours}
          step="any"
          required
          aria-invalid={draft?.field === "dailyHours" && !!error}
          aria-describedby={error ? "plan-input-error" : undefined}
          value={draft?.field === "dailyHours" ? draft.value : dailyHours}
          onChange={(event) => changeHours("dailyHours", event.target.value)}
          onBlur={() => {
            setDraft(null);
            setError("");
          }}
        />
      </div>
      {error && (
        <p id="plan-input-error" className="plan-input-error" role="status">
          {error}
        </p>
      )}
    </div>
  );
}

export default memo(PlanControls);
