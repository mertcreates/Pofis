import { specialMinuteRemaining } from "@/domain/rules/pofi-surprises";
import Image from "next/image";
import Icon from "../ui-icon.js";
import { ui } from "@/lib/ui-text.js";
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
        <h2>Pofi</h2>
        {pofiText.percentage === undefined && (
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
            aria-label="Pofi’nin odasını aç"
            onKeyDown={(event) => {
              if (event.repeat) event.preventDefault();
            }}
          >
            <Image
              src={day.source.pofi.asset}
              className="pofi-hero"
              alt=""
              width={156}
              height={156}
              priority
            />
          </button>
        </div>
        <div className="pofi-message">
          {pofiText.basis !== "live" && <p>{pofiText.title}</p>}
          <p>{message}</p>
        </div>
      </div>
    </section>
  );
}
