"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ui } from "@/lib/ui-text.js";

export function PlanCompletion({ targetSeconds, surplus, disabled, canEqual, canLast, descriptionId, onComplete }: {
  targetSeconds: number;
  surplus: boolean;
  disabled: boolean;
  canEqual: boolean;
  canLast: boolean;
  descriptionId?: string;
  onComplete: (mode: "equal" | "last") => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  return <span className="work-plan-completion" ref={root}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => {
      if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); button.current?.focus(); }
    }}>
    <button type="button" className="work-plan-complete" ref={button} disabled={disabled || (!canEqual && !canLast)}
      aria-expanded={open} aria-controls={id} aria-describedby={!canEqual && !canLast ? descriptionId : undefined}
      onClick={() => setOpen(value => !value)}>
      {ui.planner.complete((targetSeconds / 3600).toLocaleString("tr-TR"), surplus)}<ChevronDown size={14} aria-hidden="true" />
    </button>
    {open && <span id={id} className="work-plan-completion-options">
      <button type="button" disabled={!canEqual} onClick={() => { onComplete("equal"); setOpen(false); }}>{ui.planner.distributeEqual}</button>
      <button type="button" disabled={!canLast} onClick={() => { onComplete("last"); setOpen(false); }}>{ui.planner.distributeLast}</button>
    </span>}
  </span>;
}
