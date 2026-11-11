import type { ReactNode } from "react";

export function PlanDayAction({ label, pressed, disabled, onClick, children }: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return <button type="button" className="work-plan-day-action" disabled={disabled}
    aria-pressed={pressed} aria-label={label} onClick={onClick}>{children}</button>;
}
