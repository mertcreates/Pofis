"use client";

import { useMemo, useState } from "react";
import Icon from "../ui-icon.js";
import { formatDateLabel } from "@/lib/date-label.js";
import { weekday } from "@/domain/rules/calendar";
import {
  pofiNotebookDates,
  defaultNotebookDate,
} from "@/domain/rules/notebook-calendar";
import { ui } from "@/lib/ui-text.js";

export default function PofiNotebook({ today, notes }) {
  const dates = useMemo(
    () =>
      pofiNotebookDates(
        today,
        (notes ?? []).map((note) => note.date.slice(5)),
      ),
    [today, notes],
  );
  const currentDate = defaultNotebookDate(today, dates);
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const index = dates.indexOf(selectedDate);
  const selectedWeekday = weekday(selectedDate);
  const copy = ui.pofiRoom;
  const note = notes?.find((item) => item.date === selectedDate);
  if (!note)
    return (
      <p className="error" role="alert">
        {copy.notesUnavailable}
      </p>
    );

  return (
    <div className="pofi-room-notes">
      <article aria-live="polite" aria-atomic="true">
        <div className="pofi-notes-date">
          <time dateTime={selectedDate}>
            {formatDateLabel(selectedDate, today)} ·{" "}
            {ui.weekdays[selectedWeekday].long}
          </time>
          {selectedDate === currentDate && (
            <span>
              {selectedDate === today ? ui.today : copy.latestWeekdayNote}
            </span>
          )}
        </div>
        <p>{note.parts.join("\n\n")}</p>
      </article>
      <nav className="pofi-notes-nav" aria-label={copy.notebookNavigation}>
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setSelectedDate(dates[index - 1])}
        >
          <Icon name="arrow" className="pofi-notes-previous" />
          {copy.previousNote}
        </button>
        <span>
          {index + 1} / {dates.length}
        </span>
        <button
          type="button"
          disabled={index === dates.length - 1}
          onClick={() => setSelectedDate(dates[index + 1])}
        >
          {copy.nextNote}
          <Icon name="arrow" />
        </button>
      </nav>
    </div>
  );
}
