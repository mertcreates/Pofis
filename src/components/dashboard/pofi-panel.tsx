import { specialMinuteRemaining } from "@/domain/rules/pofi-surprises";
import Icon from "../ui-icon.js";
import { product, ui } from "@/lib/ui-text.js";
import { type DayReport } from "@/domain/attendance";
import { useEffect, useState } from "react";
type Props = {
  day: DayReport;
  now: number;
  onOpen: () => void;
};
export function PofiPanel({ day, now, onOpen }: Props) {
  const pofiText = day.source.pofi;
  const [openedAt] = useState(now);
  const [specialTime, setSpecialTime] = useState(false);
  useEffect(() => {
    const remaining = specialMinuteRemaining(openedAt);
    if (remaining === 0) return;
    setSpecialTime(true);
    const timer = setTimeout(() => setSpecialTime(false), remaining);
    return () => clearTimeout(timer);
  }, [openedAt]);

  const message =
    specialTime && pofiText.state !== "error"
      ? ui.pofi.clockSurprise
      : pofiText.basis === "live"
        ? `${pofiText.title} ${pofiText.message}`
        : pofiText.message;
  return (
    <section className="dashboard-card pofi-panel" data-state={pofiText.state}>
      <header className="panel-heading">
        <h2>{product.mascotName}</h2>
        {pofiText.percentage === undefined && pofiText.badge !== ui.awaitingEntry && (
          <span className="small-label pofi-badge">
            <Icon name="spark" className="pofi-spark" />
            <span>{pofiText.badge}</span>
          </span>
        )}
      </header>
      <div className="pofi-content">
        <div className="pofi-stage">
          <button
            className="pofi-trigger"
            type="button"
            aria-haspopup="dialog"
            onClick={onOpen}
            aria-label={ui.pofiRoom.open}
            onKeyDown={(event) => {
              if (event.repeat) event.preventDefault();
            }}
          >
            <img
              src={day.source.pofi.asset}
              className="pofi-hero"
              alt=""
              width={156}
              height={156}
              fetchPriority="high"
            />
          </button>
        </div>
        <div className="pofi-message">
          {pofiText.basis !== "live" && <p className="pofi-message-title">{pofiText.title}</p>}
          <p className="pofi-message-copy">{message}</p>
        </div>
      </div>
    </section>
  );
}
