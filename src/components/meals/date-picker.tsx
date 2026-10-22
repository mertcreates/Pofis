"use client";

import { ui } from "../../lib/ui-text.js";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";
import { getMealCalendarDates, getMealWeekDates, shiftMealCalendarMonth, shiftMealDate, shiftMealWeek } from "@/lib/meals/dates";
import { getMealCalendarHeight, getMealCalendarPosition } from "./calendar-position";
import { TIME_ZONE } from "@/domain/rules/calendar";
const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long", timeZone: TIME_ZONE });
const weekAccessibleDateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long", year: "numeric", timeZone: TIME_ZONE });
const weekRangeFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: TIME_ZONE });
function mealDateValue(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00Z`);
}

function mealDate(date: string) {
  return dateFormatter.format(mealDateValue(date));
}

function mealWeekRange(weekDates: string[]) {
  const firstDate = mealDateValue(weekDates[0]);
  const lastDate = mealDateValue(weekDates[weekDates.length - 1]);
  if (firstDate.getUTCMonth() === lastDate.getUTCMonth()) {
    return `${firstDate.getUTCDate()}–${weekRangeFormatter.format(lastDate)}`;
  }
  return `${weekRangeFormatter.format(firstDate)}–${weekRangeFormatter.format(lastDate)}`;
}

const calendarMonthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: TIME_ZONE });
const calendarWeekdays = ui.weekdays.map(day => day.short);

export function MealDatePicker({ value, today, minDate, maxDate, onChange }: {
  value: string;
  today: string;
  minDate: string;
  maxDate: string;
  onChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(value.slice(0, 7));
  const [focusedDate, setFocusedDate] = useState(value);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const shouldFocusDateRef = useRef(false);
  const dates = getMealCalendarDates(visibleMonth);
  const weekDates = getMealWeekDates(value);
  const previousMonth = shiftMealCalendarMonth(visibleMonth, -1);
  const nextMonth = shiftMealCalendarMonth(visibleMonth, 1);
  const monthLabel = calendarMonthFormatter.format(new Date(`${visibleMonth}-01T12:00:00+03:00`));
  const weekLabel = mealWeekRange(weekDates);
  const weekAccessibleLabel = `Hafta: ${weekAccessibleDateFormatter.format(mealDateValue(weekDates[0]))} – ${weekAccessibleDateFormatter.format(mealDateValue(weekDates[weekDates.length - 1]))}`;

  useEffect(() => {
    if (!open) return;
    // Keep the picker in the active dialog's DOM so its focus trap includes the calendar.
    const dialog = rootRef.current?.closest("dialog") as HTMLElement | null;
    if (dialog) setPortalTarget(dialog);
  }, [open]);

  useEffect(() => {
    const calendar = calendarRef.current;
    if (!open || !portalTarget || !calendar) return;
    if (!calendar.matches(":popover-open")) calendar.showPopover();
    return () => {
      if (calendar.matches(":popover-open")) calendar.hidePopover();
    };
  }, [open, portalTarget]);

  useEffect(() => {
    if (!open || !portalTarget || !popoverPosition || !shouldFocusDateRef.current) return;
    calendarRef.current?.querySelector<HTMLButtonElement>(`[data-meal-date="${focusedDate}"]`)?.focus({ preventScroll: true });
    shouldFocusDateRef.current = false;
  }, [focusedDate, open, portalTarget, popoverPosition, visibleMonth]);

  useEffect(() => {
    if (!open || !portalTarget) return;
    const placeCalendar = () => {
      const trigger = triggerRef.current;
      const calendar = calendarRef.current;
      if (!trigger || !calendar) return;
      const triggerRect = trigger.getBoundingClientRect();
      const position = getMealCalendarPosition(
        { left: triggerRect.left, top: triggerRect.top, bottom: triggerRect.bottom },
        { width: calendar.offsetWidth, height: getMealCalendarHeight(calendar) },
        { width: window.innerWidth, height: window.innerHeight },
      );
      setPopoverPosition(position);
    };
    placeCalendar();
    window.addEventListener("resize", placeCalendar);
    return () => window.removeEventListener("resize", placeCalendar);
  }, [focusedDate, open, portalTarget, visibleMonth]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !calendarRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape, true);
    document.addEventListener("pointerdown", closeOnOutsidePress, true);
    return () => {
      document.removeEventListener("keydown", closeOnEscape, true);
      document.removeEventListener("pointerdown", closeOnOutsidePress, true);
    };
  }, [open]);

  function showMonth(month: string) {
    const firstSelectableDate = datesForMonth(month).find((date) => date >= minDate && date <= maxDate);
    if (!firstSelectableDate) return;
    shouldFocusDateRef.current = true;
    setVisibleMonth(month);
    setFocusedDate(firstSelectableDate);
  }

  function datesForMonth(month: string) {
    return getMealCalendarDates(month).filter((date): date is string => date !== null);
  }

  function moveFocus(date: string, days: number) {
    const nextDate = shiftMealDate(date, { days });
    if (nextDate < minDate || nextDate > maxDate) return;
    shouldFocusDateRef.current = true;
    setFocusedDate(nextDate);
    if (nextDate.slice(0, 7) !== visibleMonth) setVisibleMonth(nextDate.slice(0, 7));
  }

  function changeSelectedDate(nextDate: string | null) {
    if (!nextDate) return;
    onChange(nextDate);
    setOpen(false);
    setFocusedDate(nextDate);
    if (nextDate.slice(0, 7) !== visibleMonth) setVisibleMonth(nextDate.slice(0, 7));
    if (open) shouldFocusDateRef.current = true;
  }

  const previousWeek = shiftMealWeek(value, -1, minDate, maxDate);
  const nextWeek = shiftMealWeek(value, 1, minDate, maxDate);

  return (
    <span className="meal-date-picker" ref={rootRef} role="group" aria-label={ui.mealLabels.date}>
      <span className="meal-week-navigation">
        <span className="meal-week-control-group">
          <button type="button" className="meal-date-step" aria-label={ui.previousWeek} disabled={previousWeek === null} onClick={() => changeSelectedDate(previousWeek)}>
            <ChevronLeft size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
          <span className="meal-week-label" role="status" aria-atomic="true" aria-label={weekAccessibleLabel}>{weekLabel}</span>
          <button type="button" className="meal-date-step" aria-label={ui.nextWeek} disabled={nextWeek === null} onClick={() => changeSelectedDate(nextWeek)}>
            <ChevronRight size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </span>
        <button
          ref={triggerRef}
          type="button"
          className="meal-calendar-trigger"
          aria-label={ui.mealLabels.dateTrigger(ui.mealLabels.dateLabel(mealDate(value), value === today))}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            if (open) {
              setOpen(false);
              return;
            }
            setVisibleMonth(value.slice(0, 7));
            setFocusedDate(value);
            setPopoverPosition(null);
            shouldFocusDateRef.current = true;
            setOpen(true);
          }}
        >
          <CalendarDays size={17} strokeWidth={1.7} aria-hidden="true" />
        </button>
      </span>
      <span className="meal-week-days" role="group" aria-label={ui.mealLabels.weekdays}>
        {weekDates.map((date, index) => <button
          type="button"
          className="meal-week-day"
          key={date}
          aria-label={ui.mealLabels.dateLabel(mealDate(date), date === today)}
          aria-current={date === today ? "date" : undefined}
          aria-pressed={date === value}
          disabled={date < minDate || date > maxDate}
          onClick={() => changeSelectedDate(date)}
        >
          <span>{calendarWeekdays[index]}</span>
          <strong>{Number(date.slice(-2))}</strong>
          <span className="meal-weekday-dot" aria-hidden="true" />
        </button>)}
      </span>
      {open && portalTarget && createPortal(<div popover="manual" className="meal-calendar-popover" role="dialog" aria-label={ui.mealLabels.chooseDate} ref={calendarRef} style={popoverPosition ? {
        top: popoverPosition.top,
        left: popoverPosition.left,
        maxHeight: popoverPosition.maxHeight,
      } : { visibility: "hidden" }}>
        <span className="meal-calendar-header">
          <button type="button" className="meal-calendar-nav" aria-label={ui.previousMonth} disabled={previousMonth < minDate.slice(0, 7)} onClick={() => showMonth(previousMonth)}>
            <ChevronLeft size={17} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <span aria-live="polite">{monthLabel}</span>
          <button type="button" className="meal-calendar-nav" aria-label={ui.nextMonth} disabled={nextMonth > maxDate.slice(0, 7)} onClick={() => showMonth(nextMonth)}>
            <ChevronRight size={17} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </span>
        <span className="meal-calendar-weekdays" aria-hidden="true">
          {calendarWeekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </span>
        <span className="meal-calendar-grid">
          {dates.map((date, index) => date === null
            ? <span className="meal-calendar-spacer" key={`spacer-${index}`} aria-hidden="true" />
            : <button
              type="button"
              className="meal-calendar-day"
              key={date}
              data-meal-date={date}
              aria-label={mealDate(date)}
              aria-current={date === today ? "date" : undefined}
              aria-pressed={date === value}
              disabled={date < minDate || date > maxDate}
              tabIndex={date === focusedDate ? 0 : -1}
              onFocus={() => setFocusedDate(date)}
              onKeyDown={(event) => {
                const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
                if (offset === undefined) return;
                event.preventDefault();
                moveFocus(date, offset);
              }}
              onClick={() => {
                onChange(date);
                setOpen(false);
                triggerRef.current?.focus({ preventScroll: true });
              }}
            >
              {Number(date.slice(-2))}
            </button>)}
        </span>
      </div>, portalTarget)}
    </span>
  );
}

