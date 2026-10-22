"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { parsePlanClock } from "@/domain/rules/plan-duration";
import { ui } from "@/lib/ui-text.js";

type ClockPart = "hour" | "minute";

export function editPlanTimeSegment(clock: string, part: ClockPart, input: string) {
  const maximum = part === "hour" ? 23 : 59;
  if (!/^\d{0,2}$/.test(input) || Number(input) > maximum) return null;
  const complete = input.length === 2 || (input !== "" && Number(input) * 10 > maximum);
  const segment = complete ? input.padStart(2, "0") : input;
  const [hour = "", minute = ""] = clock.split(":");
  const nextHour = part === "hour" ? segment : hour;
  const nextMinute = part === "minute" ? segment : minute;
  return {
    value: nextHour || nextMinute ? `${nextHour}:${nextMinute}` : "",
    advance: part === "hour" && complete,
  };
}

export function pastePlanTime(input: string) {
  const minute = parsePlanClock(input);
  if (minute === null) return null;
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function stepPlanTime(clock: string, part: ClockPart, direction: 1 | -1) {
  const minutes = parsePlanClock(clock);
  if (minutes === null) return null;
  const next = (minutes + direction * (part === "hour" ? 60 : 1) + 1440) % 1440;
  return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
}

export function PlanTimeInput({ value, onChange, onConfirm, inputRef, label, disabled, invalid, errorId }: {
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  disabled: boolean;
  invalid: boolean;
  errorId: string;
}) {
  const minuteRef = useRef<HTMLInputElement>(null);
  const [focusTarget, setFocusTarget] = useState<ClockPart | null>(null);
  const [hour = "", minute = ""] = value.split(":");

  useLayoutEffect(() => {
    if (!focusTarget) return;
    // Move only after the controlled inputs contain the new value; blur must see that draft.
    const input = (focusTarget === "hour" ? inputRef : minuteRef).current;
    input?.focus();
    input?.select();
    setFocusTarget(null);
  }, [focusTarget, inputRef]);

  function change(part: ClockPart, input: string) {
    const next = editPlanTimeSegment(value, part, input);
    if (!next) return;
    onChange(next.value);
    if (next.advance) setFocusTarget("minute");
  }

  return <div className="work-plan-time-input" role="group" aria-label={label}
    onPointerDown={event => {
      if (disabled || event.target instanceof HTMLInputElement) return;
      event.preventDefault();
      const hourBox = inputRef.current?.getBoundingClientRect();
      const minuteBox = minuteRef.current?.getBoundingClientRect();
      if (hourBox && minuteBox) setFocusTarget(event.clientX < (hourBox.right + minuteBox.left) / 2 ? "hour" : "minute");
    }}>
    {(["hour", "minute"] as const).map(part => <span className="work-plan-time-part" key={part}>
      {part === "minute" && <span className="work-plan-time-separator" aria-hidden="true">:</span>}
      <input ref={part === "hour" ? inputRef : minuteRef} type="text" inputMode="numeric" autoComplete="off"
        placeholder="––" value={part === "hour" ? hour : minute} disabled={disabled}
        aria-label={`${label}, ${ui.planner[part]}`} aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onFocus={event => event.currentTarget.select()}
        onClick={event => event.currentTarget.select()}
        onChange={event => change(part, event.currentTarget.value)}
        onBlur={event => {
          // Padding the hour must not complete an unfinished minute or save the draft.
          const text = event.currentTarget.value;
          if (part === "hour" && /^\d$/.test(text)) onChange(`${text.padStart(2, "0")}:${minute}`);
        }}
        onPaste={event => {
          event.preventDefault();
          const text = event.clipboardData.getData("text").trim();
          const clock = pastePlanTime(text);
          if (clock !== null) { onChange(clock); setFocusTarget("minute"); }
          else if (/^\d{1,2}$/.test(text)) change(part, text);
        }}
        onKeyDown={event => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const next = stepPlanTime(value, part, event.key === "ArrowUp" ? 1 : -1);
            if (next !== null) { onChange(next); setFocusTarget(part); }
          } else if (event.key === "Enter") { event.preventDefault(); onConfirm(); }
          else if (part === "hour" && (event.key === ":" || event.key === "ArrowRight")) {
            event.preventDefault();
            setFocusTarget("minute");
          } else if (part === "minute" && (event.key === "ArrowLeft" || (event.key === "Backspace" && !minute))) {
            event.preventDefault();
            setFocusTarget("hour");
          }
        }} />
    </span>)}
  </div>;
}
