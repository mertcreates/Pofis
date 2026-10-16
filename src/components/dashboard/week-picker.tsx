"use client";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import Icon from "../ui-icon.js";
import { weekLabel, formatDate } from "@/domain/time";
import { addDays, weekStart } from "@/domain/rules/calendar";
import { monthWeeks, shiftMonth } from "./week-calendar";
import { ui } from "@/lib/ui-text.js";

type Props = {
  week: string;
  today: string;
  onSelect: (week: string) => void;
  disabled?: boolean;
  firstWeek?: string;
};
export function WeekPicker({
  week,
  today,
  onSelect,
  disabled = false,
  firstWeek,
}: Props) {
  const id = useId();
  const picker = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [month, setMonth] = useState(week.slice(0, 7) + "-01");
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 16 });
  const currentWeek = weekStart(today);
  const currentMonth = today.slice(0, 7) + "-01";
  const label =
    week === currentWeek ? ui.currentWeek : weekLabel(week, false, today);
  useEffect(() => {
    const close = () => picker.current?.hidePopover();
    const scroll = (event: Event) => {
      if (!picker.current?.contains(event.target as Node)) close();
    };
    window.addEventListener("resize", close);
    window.addEventListener("scroll", scroll, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", scroll, true);
    };
  }, []);
  function choose(next: string) {
    picker.current?.hidePopover();
    onSelect(next);
    trigger.current?.focus({ preventScroll: true });
  }
  return (
    <div className="week-selector" role="group" aria-label={ui.reportPeriod}>
      <div className="chart-navigation">
        <button
          type="button"
          aria-label={ui.previousWeek}
          title={ui.previousWeek}
          disabled={disabled || (!!firstWeek && week <= firstWeek)}
          onClick={() => onSelect(addDays(week, -7))}
        >
          <Icon name="arrow" className="previous-arrow" />
        </button>
        <button
          ref={trigger}
          className="week-picker-trigger"
          type="button"
          popoverTarget={id}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`${ui.chooseWeek}: ${label}`}
          disabled={disabled}
          onClick={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            setMonth(week.slice(0, 7) + "-01");
            setPosition({
              left: Math.max(
                16,
                Math.min(
                  bounds.right - 288,
                  document.documentElement.clientWidth - 304,
                ),
              ),
              top: bounds.bottom + 8,
            });
          }}
        >
          <span>{label}</span>
          <Icon name="chevron-down" />
        </button>
        <button
          type="button"
          aria-label={ui.nextWeek}
          title={ui.nextWeek}
          disabled={disabled || week >= currentWeek}
          onClick={() => onSelect(addDays(week, 7))}
        >
          <Icon name="arrow" />
        </button>
        <div
          id={id}
          ref={picker}
          className="week-picker"
          popover="auto"
          role="dialog"
          aria-label={ui.chooseWeek}
          style={
            {
              ...position,
              "--week-picker-top": `${position.top}px`,
            } as CSSProperties
          }
          onToggle={(event) => {
            const isOpen = event.newState === "open";
            setOpen(isOpen);
            if (isOpen)
              picker.current
                ?.querySelector<HTMLButtonElement>('[aria-current="true"]')
                ?.focus();
          }}
        >
          <div className="week-picker-heading">
            <button
              type="button"
              aria-label={ui.previousMonth}
              disabled={
                disabled ||
                (!!firstWeek && month <= firstWeek.slice(0, 7) + "-01")
              }
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <Icon name="arrow" className="previous-arrow" />
            </button>
            <strong className="week-picker-month" aria-live="polite">
              {formatDate(month, { month: "long", year: "numeric" })}
            </strong>
            <button
              type="button"
              aria-label={ui.nextMonth}
              disabled={disabled || month >= currentMonth}
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <Icon name="arrow" />
            </button>
          </div>
          <div className="week-picker-weeks">
            {monthWeeks(month).map((start) => (
              <button
                key={start}
                className="week-picker-option"
                type="button"
                aria-current={start === week ? "true" : undefined}
                disabled={
                  disabled ||
                  start > currentWeek ||
                  (!!firstWeek && start < firstWeek)
                }
                onClick={() => choose(start)}
              >
                <span>{weekLabel(start, false, today)}</span>
                {start === currentWeek && <small>{ui.currentWeek}</small>}
              </button>
            ))}
          </div>
          <button
            className="week-picker-current"
            type="button"
            disabled={disabled}
            onClick={() => choose(currentWeek)}
          >
            {ui.returnToCurrentWeek}
          </button>
        </div>
      </div>
    </div>
  );
}
