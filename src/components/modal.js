"use client";

import { useEffect, useId, useRef, useState } from "react";
import Icon from "./ui-icon.js";
import { ui } from "@/lib/ui-text.js";

/**
 * @param {{
 *   open?: boolean,
 *   title: string,
 *   description?: string,
 *   className?: string,
 *   onClose: () => void,
 *   onBack?: () => void,
 *   backLabel?: string,
 *   onTitleClick?: () => void,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function Modal({
  open = true,
  onClose,
  title,
  description,
  onTitleClick,
  onBack,
  backLabel,
  className = "",
  children,
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const titleRef = useRef(null);
  const bodyRef = useRef(null);
  const previousTitle = useRef(title);
  const gesture = useRef(null);
  const dragMoved = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    previousTitle.current = title;
    const opener = document.activeElement;
    const { scrollX, scrollY } = window;
    const root = document.documentElement;
    const previous = {
      overflow: root.style.overflow,
      scrollbarGutter: root.style.scrollbarGutter,
    };
    // Reserve a classic scrollbar's space while keeping the sidebar's scroll container.
    if (window.innerWidth > root.clientWidth)
      root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";
    dialog.showModal();
    closeRef.current.focus({ preventScroll: true });
    return () => {
      dialog.close();
      Object.assign(root.style, previous);
      window.scrollTo(scrollX, scrollY);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open || previousTitle.current === title) return;
    previousTitle.current = title;
    bodyRef.current.scrollTop = 0;
    titleRef.current.focus({ preventScroll: true });
  }, [open, title]);

  return (
    <dialog
      ref={dialogRef}
      className={`app-modal ${className}`}
      data-dragging={dragOffset > 0}
      style={
        dragOffset > 0
          ? { transform: `translateY(${dragOffset}px)` }
          : undefined
      }
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [
          ...event.currentTarget.querySelectorAll(
            "button, a[href], input, select, textarea, [tabindex]",
          ),
        ].filter(
          (element) =>
            element.tabIndex >= 0 &&
            !element.disabled &&
            element.getClientRects().length > 0,
        );
        const first = controls[0];
        const last = controls.at(-1);
        if (!controls.includes(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button
        type="button"
        className="app-modal-handle"
        aria-label={ui.close}
        onClick={(event) => {
          if (event.detail === 0 || !dragMoved.current) onClose();
          dragMoved.current = false;
        }}
        onPointerDown={(event) => {
          gesture.current = { x: event.clientX, y: event.clientY };
          dragMoved.current = false;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!gesture.current) return;
          const distance = Math.max(0, event.clientY - gesture.current.y);
          if (distance > 6 || Math.abs(event.clientX - gesture.current.x) > 6)
            dragMoved.current = true;
          setDragOffset(distance);
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          gesture.current = null;
          setDragOffset(0);
          if (
            start &&
            event.clientY - start.y > 60 &&
            Math.abs(event.clientX - start.x) < 40
          )
            onClose();
        }}
        onPointerCancel={() => {
          gesture.current = null;
          setDragOffset(0);
        }}
      >
        <span />
      </button>
      <header className="app-modal-header">
        {onBack && (
          <button
            type="button"
            className="app-modal-back"
            onClick={onBack}
            aria-label={backLabel}
          >
            <Icon name="arrow" />
          </button>
        )}
        <div className="app-modal-header-copy">
          <h2 id={titleId} ref={titleRef} tabIndex={-1}>
            {onTitleClick ? (
              <button
                type="button"
                className="app-modal-title-trigger"
                onClick={onTitleClick}
                onKeyDown={(event) => {
                  if (event.repeat) event.preventDefault();
                }}
              >
                {title}
              </button>
            ) : (
              title
            )}
          </h2>
          {description && <p id={descriptionId}>{description}</p>}
        </div>
        <button
          ref={closeRef}
          type="button"
          className="app-modal-close"
          onClick={onClose}
          aria-label={ui.close}
          autoFocus
        >
          <Icon name="close" />
        </button>
      </header>
      <div ref={bodyRef} className="app-modal-body">
        {children}
      </div>
    </dialog>
  );
}
