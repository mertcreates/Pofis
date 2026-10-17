"use client";
import { ui } from "@/lib/ui-text.js";
import { planTargets, type WorkPlan } from "@/domain/rules/work-plan";
import { weekLabel, durationClock } from "@/domain/time";
import { weekStart } from "@/domain/rules/calendar";
import type { DayReport } from "@/domain/attendance";
import PlanControls from "./plan-controls.js";
import Modal from "./modal.js";
import { InlineNotice } from "./inline-notice";
export function PlanEditor({
  plan,
  week,
  today,
  day,
  blocked,
  error,
  onSave,
  onClose,
}: {
  plan: WorkPlan;
  week: string;
  today: string;
  day?: DayReport;
  blocked: boolean;
  error: string;
  onSave: (plan: WorkPlan) => boolean;
  onClose: () => void;
}) {
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
          <InlineNotice tone="warning">{error}</InlineNotice>
        )}
        <PlanControls
          plan={plan}
          onChange={onSave}
        />
      </div>
    </Modal>
  );
}
