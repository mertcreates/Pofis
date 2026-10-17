import type { ReactNode } from "react";
import Icon from "../ui-icon.js";
import { Progress } from "../primitives";
export function MetricCard({
  label,
  icon,
  badge,
  children,
  foot,
  hint,
  progress,
}: {
  label: string;
  icon: string;
  badge?: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
  hint?: ReactNode;
  progress?: { recorded: number; estimated: number; target: number };
}) {
  return (
    <section className="dashboard-card metric">
      <div className="metric-header">
        <span>
          <Icon name={icon} />
          {label}
        </span>
        {badge !== undefined && <span className="metric-tag">{badge}</span>}
      </div>
      <div className="metric-reading">
        <div className="metric-value">{children}</div>
        {progress && <Progress {...progress} label={label} />}
      </div>
      {(hint || foot) && (
        <div className="metric-details">
          {foot && <div className="metric-foot">{foot}</div>}
          {hint && <p className="metric-hint">{hint}</p>}
        </div>
      )}
    </section>
  );
}
