import { ui } from "@/lib/ui-text.js";
import { durationText } from "@/domain/time";

export function PlanSummary({ targetSeconds, totalSeconds }: { targetSeconds: number; totalSeconds: number | null }) {
  const difference = totalSeconds === null ? null : totalSeconds - targetSeconds;
  return <dl className="work-plan-summary" aria-live="polite">
    <div><dt>{ui.planner.referenceTarget}</dt><dd>{durationText(targetSeconds)}</dd></div>
    {totalSeconds !== null && <div className="work-plan-total"><dt>{ui.planner.projectedTotal}</dt><dd>{durationText(totalSeconds)}</dd></div>}
    {difference !== null && difference !== 0 && <div className="work-plan-difference"><dt>{ui.planner.difference(difference < 0)}</dt><dd>{durationText(Math.abs(difference))}</dd></div>}
  </dl>;
}
