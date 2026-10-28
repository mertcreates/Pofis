import { clockSurpriseAt } from "@/domain/rules/pofi-surprises";
import { product, ui } from "@/lib/ui-text.js";
import { type DayReport } from "@/domain/attendance";
import { formatClock } from "@/domain/time";
type Props = {
  day: DayReport;
  now: number;
  onOpen: () => void;
};
export function PofiPanel({ day, now, onOpen }: Props) {
  const pofiText = day.source.pofi;
  const surprise = clockSurpriseAt(now);
  const surpriseMessage = surprise === "sequence"
    ? ui.pofi.clockSurprises.sequence(formatClock(now, false))
    : surprise ? ui.pofi.clockSurprises[surprise] : null;
  const pofiMessage = surpriseMessage && pofiText.state !== "error"
    ? surpriseMessage : pofiText.message;
  const message = pofiText.basis === "live" && pofiText.title
    ? `${pofiText.title} ${pofiMessage}` : pofiMessage;
  return (
    <section className="dashboard-card pofi-panel" data-state={pofiText.state}>
      <header className="panel-heading">
        <h2>{product.mascotName}</h2>
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
