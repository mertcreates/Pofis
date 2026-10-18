"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { tooltipPosition } from "./tooltip-position";
import "./tooltip.css";

export function Tooltip({ children, content, className, label, anchorSelector }: {
  children: ReactNode;
  content: ReactNode;
  className?: string;
  label?: string;
  // A chart can keep the whole column interactive while positioning at its bar.
  anchorSelector?: string;
}) {
  const id = useId();
  const anchor = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focused = useRef(false);
  const hovered = useRef(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<ReturnType<typeof tooltipPosition> | null>(null);
  const enabled = content !== null && content !== undefined && content !== false;

  function clearTimer() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }
  function close() {
    clearTimer();
    setOpen(false);
    setPosition(null);
  }
  function show(delay = 0) {
    clearTimer();
    if (!enabled) return;
    if (delay) timer.current = setTimeout(() => setOpen(true), delay);
    else setOpen(true);
  }
  function leave() {
    clearTimer();
    if (!focused.current) timer.current = setTimeout(close, 120);
  }

  useEffect(() => () => clearTimer(), []);
  useLayoutEffect(() => {
    if (!open || !enabled) return;
    const positionAnchor = (anchorSelector ? anchor.current?.querySelector<HTMLElement>(anchorSelector) : null) ?? anchor.current;
    function update() {
      if (!positionAnchor || !tip.current) return;
      const bounds = positionAnchor.getBoundingClientRect();
      const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
      if (bounds.bottom <= 0 || bounds.top >= viewport.height || bounds.right <= 0 || bounds.left >= viewport.width) {
        close();
        return;
      }
      setPosition(tooltipPosition(bounds, tip.current.getBoundingClientRect(), viewport));
    }
    update();
    const observer = new ResizeObserver(update);
    if (positionAnchor) observer.observe(positionAnchor);
    if (tip.current) observer.observe(tip.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, enabled, content, anchorSelector]);
  useEffect(() => {
    if (!open) return;
    document.dispatchEvent(new CustomEvent("pofis:tooltip-open", { detail: id }));
    const otherTooltip = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !anchor.current?.contains(event.target) && !tip.current?.contains(event.target)) close();
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("pofis:tooltip-open", otherTooltip);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("pofis:tooltip-open", otherTooltip);
    };
  }, [open, id]);

  return <>
    <div ref={anchor} className={`tooltip-trigger${className ? ` ${className}` : ""}`} tabIndex={enabled ? 0 : undefined} aria-label={label} aria-describedby={open && enabled ? id : undefined}
      onPointerEnter={event => { if (event.pointerType !== "touch") { hovered.current = true; show(180); } }}
      onPointerLeave={event => { if (event.pointerType !== "touch") { hovered.current = false; leave(); } }}
      onFocus={() => { focused.current = true; show(); }}
      onBlur={() => { focused.current = false; if (!hovered.current) close(); }}
      onPointerDown={event => { if (event.pointerType === "touch" && enabled) { event.preventDefault(); if (open) close(); else show(); } }}>
      {children}
    </div>
    {open && enabled && createPortal(<div ref={tip} id={id} role="tooltip" className="pofis-tooltip" data-side={position?.side}
      style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? "visible" : "hidden" }}
      onPointerEnter={clearTimer} onPointerLeave={leave}>
      {content}
    </div>, document.body)}
  </>;
}
