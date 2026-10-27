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

function nextMatch(word, matched, key) {
  return key === word[matched] ? matched + 1 : Number(key === word[0]);
}

export default function PofiCall() {
  const messageRef = useRef(null);
  const [lines, setLines] = useState(null);

  useEffect(() => {
    const message = messageRef.current;
    let callMatched = 0;
    let meowMatched = 0;
    let nextCall = 0;
    let activeMessage = null;
    let timer;
    const reset = () => {
      callMatched = 0;
      meowMatched = 0;
    };
    function closeMessage() {
      clearTimeout(timer);
      message.hidePopover();
      activeMessage = null;
      setLines(null);
    }
    function showMessage(nextLines, source) {
      if (activeMessage === null) message.showPopover();
      activeMessage = source;
      setLines(nextLines);
      clearTimeout(timer);
      timer = setTimeout(closeMessage, POFI_SURPRISES.callVisibleMs);
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
      callMatched = nextMatch(POFI_SURPRISES.callWord, callMatched, key);
      meowMatched = nextMatch(POFI_SURPRISES.meowWord, meowMatched, key);
      if (callMatched === POFI_SURPRISES.callWord.length) {
        reset();
        showMessage(ui.pofiCall[nextCall], "call");
        nextCall = Math.min(nextCall + 1, ui.pofiCall.length - 1);
      } else if (meowMatched === POFI_SURPRISES.meowWord.length) {
        reset();
        showMessage(
          [activeMessage === "call" ? ui.pofiMeow.afterCall : ui.pofiMeow.standalone],
          "meow",
        );
      }
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
      {lines?.map((line) => <p key={line}>{line}</p>)}
    </div>
  );
}
