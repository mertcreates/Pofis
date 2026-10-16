"use client";
import Icon from "../ui-icon.js";
import { ui } from "@/lib/ui-text.js";
import type { DayReport } from "@/domain/attendance";
import { formatClock, formatDate } from "@/domain/time";
import { Modal } from "../primitives";
import { passageSummary } from "./labels";

export function RecordIntervals({
  day,
  limit,
}: {
  day: DayReport;
  limit?: number;
}) {
  const rows = [...day.intervals].reverse().slice(0, limit);
  return (
    <ol className="record-intervals">
      {rows.map((row, index) => (
        <li
          key={index}
          data-kind={
            row.unmatched
              ? "unmatched"
              : row.exit === null
                ? "open"
                : "interval"
          }
        >
          <dl className="record-pair">
            {(row.entry !== null || !row.unmatched) && (
              <div>
                <dt>{ui.entry}</dt>
                <dd>
                  <time
                    dateTime={
                      row.entry === null
                        ? undefined
                        : new Date(row.entry).toISOString()
                    }
                  >
                    {formatClock(row.entry)}
                  </time>
                </dd>
              </div>
            )}
            {(row.exit !== null || !row.unmatched) && (
              <div>
                <dt>{ui.exit}</dt>
                <dd>
                  {row.exit === null ? (
                    <span>{ui.noPassageYet}</span>
                  ) : (
                    <time dateTime={new Date(row.exit).toISOString()}>
                      {formatClock(row.exit)}
                    </time>
                  )}
                </dd>
              </div>
            )}
          </dl>
          {row.unmatched ? (
            <small>{ui.unmatchedRecord}</small>
          ) : (
            row.exit === null && <small>{ui.openEntryRecord}</small>
          )}
        </li>
      ))}
    </ol>
  );
}

export function RawPassages({ day }: { day: DayReport }) {
  return (
    <ol>
      {day.records.map((record) => (
        <li key={record.id}>
          <time dateTime={record.at}>{formatClock(Date.parse(record.at))}</time>
          <span>
            <Icon
              name="arrow"
              className={`record-icon ${record.direction === "entry" ? "in" : "out"}`}
            />
            {record.direction === "entry" ? ui.entry : ui.exit}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function DailyRecords({
  day,
  onAll,
}: {
  day: DayReport;
  onAll: () => void;
}) {
  return (
    <section className="dashboard-card record-panel">
      <div className="panel-heading">
        <div>
          <h2>{ui.recordsForDate(formatDate(day.date))}</h2>
        </div>
        {day.records.length > 0 && (
          <button
            type="button"
            className="text-button"
            aria-haspopup="dialog"
            onClick={onAll}
          >
            {ui.allRecords}
            <Icon name="arrow" />
          </button>
        )}
      </div>
      {day.records.length > 0 ? (
        <>
          <p className="record-counts">{passageSummary(day)}</p>
          <RecordIntervals day={day} limit={4} />
        </>
      ) : (
        <p className="records-empty">{ui.noRecord}</p>
      )}
    </section>
  );
}
export function RecordsDialog({
  day,
  onClose,
}: {
  day: DayReport;
  onClose: () => void;
}) {
  return (
    <Modal
      title={ui.recordsForDate(formatDate(day.date))}
      description={passageSummary(day)}
      className="record-details-modal"
      onClose={onClose}
    >
      <RecordIntervals day={day} />
    </Modal>
  );
}
