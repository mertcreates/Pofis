import Icon from "../ui-icon.js";
import { ui } from "@/lib/ui-text.js";
import { formatClock, weekLabel } from "@/domain/time";
import { WeekPicker } from "./week-picker";
export function DashboardHeader({
  week,
  today,
  owner,
  fetchedAt,
  busy,
  firstWeek,
  onSelect,
  onRefresh,
  onEditPlan,
}: {
  week: string;
  today: string;
  owner?: string;
  fetchedAt?: string;
  busy: boolean;
  firstWeek?: string;
  onSelect: (week: string) => void;
  onRefresh: () => void;
  onEditPlan?: () => void;
}) {
  return (
    <div className="dashboard-topbar">
      <div>
        <p className="eyebrow">{ui.overview}</p>
        <h1>{weekLabel(week, false, today)}</h1>
        {owner && <p className="dashboard-person">{owner}</p>}
      </div>
      <div className="topbar-profile">
        <WeekPicker
          week={week}
          today={today}
          onSelect={onSelect}
          disabled={busy}
          firstWeek={firstWeek}
        />
        <div className="topbar-tools">
          <div className="report-updates">
            {fetchedAt && (
              <time dateTime={fetchedAt}>
                {ui.updatedAt(formatClock(Date.parse(fetchedAt), false))}
              </time>
            )}
            <button
              type="button"
              aria-label={ui.refreshReport}
              title={ui.refreshReport}
              onClick={onRefresh}
              disabled={busy}
            >
              <Icon name="refresh" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
