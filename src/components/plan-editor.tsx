"use client";
import { useState } from "react";
import { ui } from "@/lib/ui-text.js";
import { planTargets, type WorkPlan } from "@/domain/rules/work-plan";
import { weekLabel, durationClock } from "@/domain/time";
import { weekStart } from "@/domain/rules/calendar";
import type { DayReport } from "@/domain/attendance";
import PlanControls from "./plan-controls.js";
import Modal from "./modal.js";
export function PlanEditor({
  plan,
  week,
  today,
  day,
  blocked,
  onSave,
  onClose,
}: {
  plan: WorkPlan;
  week: string;
  today: string;
  day?: DayReport;
  blocked: boolean;
  onSave: (plan: WorkPlan) => boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const { dailySeconds } = planTargets(plan);
  const target = day?.source.exitGoalSeconds ?? null;
  const unavailable =
    week !== weekStart(today)
      ? ui.selectCurrentWeek
      : blocked
        ? ui.missingRecords
        : ui.noRemainingDays;
  return (
    <Modal
      title={ui.workPlan}
      description={weekLabel(week, false, today)}
      onClose={onClose}
    >
      <div className="planner">
        <div className="plan-summary">
          <div className="plan-summary-primary">
            <strong className="plan-total">
              {plan.goals.hours} {ui.hoursPerDays} {plan.goals.days} {ui.days}
            </strong>
            <span className="plan-target">
              {ui.dailyGoal} {durationClock(dailySeconds)}
            </span>
          </div>
          {target === null ? (
            <p className="plan-unavailable">{unavailable}</p>
          ) : (
            <div className="plan-result">
              <span>{ui.dailyRequired}</span>
              <strong>{durationClock(target)}</strong>
            </div>
          )}
        </div>
        {error && (
          <p role="alert" className="plan-input-error">
            {error}
          </p>
        )}
        <PlanControls
          plan={plan}
          onChange={(next) => {
            const saved = onSave(next);
            setError(saved ? "" : ui.storageWriteError);
            return saved;
          }}
        />
      </div>
    </Modal>
  );
}
