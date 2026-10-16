"use client";

import { useEffect, useRef, useState } from "react";
import { POFI_SURPRISES } from "@/domain/rules/pofi-surprises";
import { ui } from "@/lib/ui-text.js";

function isEditable(element) {
  return (
    element instanceof HTMLElement &&
    (element.isContentEditable ||
      element.matches(
        'input, textarea, select, [role="textbox"], [role="searchbox"], [role="combobox"]',
      ))
  );
}

export default function PofiCall() {
  const messageRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const message = messageRef.current;
    let matched = 0;
    let timer;
    const reset = () => {
      matched = 0;
    };
    function closeMessage() {
      clearTimeout(timer);
      message.hidePopover();
      setVisible(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") {
        reset();
        closeMessage();
        return;
      }
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        document.designMode === "on" ||
        isEditable(document.activeElement) ||
        event.composedPath().some(isEditable)
      ) {
        reset();
        return;
      }
      const key = event.key.toLowerCase();
      if (key === POFI_SURPRISES.callWord[matched]) matched++;
      else matched = key === POFI_SURPRISES.callWord[0] ? 1 : 0;
      if (matched !== POFI_SURPRISES.callWord.length) return;
      reset();
      message.showPopover();
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(closeMessage, POFI_SURPRISES.callVisibleMs);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", reset);
    document.addEventListener("visibilitychange", reset);
    window.addEventListener("blur", reset);
    return () => {
      clearTimeout(timer);
      message.hidePopover();
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", reset);
      document.removeEventListener("visibilitychange", reset);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return (
    <div
      ref={messageRef}
      className="pofi-call"
      popover="manual"
      role="status"
      aria-atomic="true"
    >
      {visible && ui.pofiCall.map((line) => <p key={line}>{line}</p>)}
    </div>
  );
}
