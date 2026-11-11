"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { ui } from "@/lib/ui-text.js";
import { parsePlanClock, planClockTimes } from "@/domain/rules/plan-duration";
import type { PlanTime } from "@/domain/rules/work-plan";
import { PlanTimeInput } from "./plan-time-input";

const copy = ui.planner;

export function PlanTimePlanner({ time, seconds, day, disabled, recordedEntry = false, id, onCommit }: {
  time: PlanTime | undefined;
  seconds: number;
  day: number;
  disabled: boolean;
  recordedEntry?: boolean;
  id: string;
  onCommit: (time: PlanTime | null) => boolean | Promise<boolean>;
}) {
  const [mode, setMode] = useState<PlanTime["anchor"]>(time?.anchor ?? "entry");
  const [draft, setDraft] = useState(() => planClockTimes(time, seconds)?.[time?.anchor ?? "entry"].value ?? "");
  const [invalid, setInvalid] = useState(false);
  const [focusHour, setFocusHour] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const minute = parsePlanClock(draft);
  const preview = minute === null ? undefined : { anchor: mode, minute };
  const opposite = mode === "entry" ? "exit" : "entry";
  const clocks = planClockTimes(preview, seconds);
  const result = clocks?.[opposite];
  const savedMode = time?.anchor ?? "entry";
  const savedDraft = planClockTimes(time, seconds)?.[time?.anchor ?? "entry"].value ?? "";
  const previousSaved = useRef({ mode: savedMode, draft: savedDraft });

  useLayoutEffect(() => {
    const previous = previousSaved.current;
    if (previous.mode === savedMode && previous.draft === savedDraft) return;
    previousSaved.current = { mode: savedMode, draft: savedDraft };
    const unchanged = draft === previous.draft && (draft === "" || mode === previous.mode);
    if (unchanged && !invalid) {
      setMode(savedMode);
      setDraft(savedDraft);
    }
  }, [savedMode, savedDraft, mode, draft, invalid]);

  useLayoutEffect(() => {
    if (!focusHour) return;
    inputRef.current?.focus();
    inputRef.current?.select();
    setFocusHour(false);
  }, [focusHour]);

  async function saveTime() {
    if (disabled || recordedEntry) return;
    if (draft.trim() && minute === null) { setInvalid(true); return; }
    const next = minute === null ? null : { anchor: mode, minute };
    const changed = (next?.minute ?? null) !== (time?.minute ?? null) || next?.anchor !== time?.anchor;
    if (changed && !(await onCommit(next))) return;
    setInvalid(false);
    setDraft(planClockTimes(next ?? undefined, seconds)?.[mode].value ?? "");
  }

  return <div className="work-plan-clock" onKeyDown={event => {
    if (event.key !== "Escape") return;
    if (draft === savedDraft && mode === (time?.anchor ?? "entry") && !invalid) return;
    event.preventDefault();
    event.stopPropagation();
    setDraft(savedDraft);
    setMode(time?.anchor ?? "entry");
    setInvalid(false);
    setFocusHour(true);
  }}>
    <div id={id} className="work-plan-clock-panel" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) saveTime();
    }}>
      <div className="work-plan-clock-editor">
        <div className="work-plan-clock-controls">
          <div className="work-plan-clock-prompt">
            <div className="work-plan-time-field">
              <PlanTimeInput inputRef={inputRef} value={draft} disabled={disabled || recordedEntry}
                label={`${ui.weekdays[day].long} ${ui[mode].toLocaleLowerCase("tr-TR")} saati`} invalid={invalid} errorId={`${id}-error`}
                onChange={next => { setDraft(next); setInvalid(false); }} onConfirm={saveTime} />
              {!recordedEntry && clocks && <span className="work-plan-time-suffix">{copy.clockAt(clocks[mode].value).slice(5)}</span>}
              {!recordedEntry && <button type="button" className="work-plan-time-clear" disabled={disabled || !draft} aria-label={copy.clearTime}
                onClick={async () => {
                  if (await onCommit(null)) { setDraft(""); setInvalid(false); setFocusHour(true); }
                }}><X size={16} aria-hidden="true" /></button>}
            </div>
          </div>
          {recordedEntry ? <span className="small-label">{ui.firstEntry}</span> : <div className="work-plan-time-choice" role="group" aria-label={copy.timeChoice}>
            <button type="button" disabled={disabled} aria-pressed={mode === "entry"}
              onClick={() => setMode("entry")}>{copy.ifEntry}</button>
            <span aria-hidden="true">/</span>
            <button type="button" disabled={disabled} aria-pressed={mode === "exit"}
              onClick={() => setMode("exit")}>{copy.toExit}</button>
          </div>}
        </div>
        <div className="work-plan-clock-operation">
          {result && <ArrowRight size={16} aria-hidden="true" />}
        </div>
        <div className="work-plan-clock-result">
          <output className="work-plan-time-result" aria-live="polite">
            {result && <>
              <strong>{copy.clockAt(result.value)}</strong>
              <span className="work-plan-time-conclusion">
                {result.dayOffset !== 0 && <>{ui.weekdays[((day + result.dayOffset) % 7 + 7) % 7].long}{" "}</>}
                {mode === "entry" ? copy.willExit : copy.shouldEnter}
              </span>
            </>}
          </output>
        </div>
        {invalid && <span id={`${id}-error`} className="work-plan-clock-error" role="alert">{copy.timeError}</span>}
      </div>
    </div>
  </div>;
}
