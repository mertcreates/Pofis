"use client";

import { useRef, useState } from "react";
import { product, ui } from "@/lib/ui-text.js";
import Modal from "../modal.js";
import { version } from "../../../package.json";
import { POFI_SURPRISES } from "@/domain/rules/pofi-surprises";

export default function AppFooter() {
  const sequence = useRef(null);
  const [noteOpen, setNoteOpen] = useState(false);

  function tapVersion() {
    const now = performance.now();
    if (
      !sequence.current ||
      now - sequence.current.startedAt >= POFI_SURPRISES.versionWindowMs
    ) {
      sequence.current = { count: 1, startedAt: now };
    } else {
      sequence.current.count++;
    }
    if (sequence.current.count === POFI_SURPRISES.versionRevealTaps) {
      sequence.current = null;
      setNoteOpen(true);
    }
  }

  return (
    <footer className="app-footer">
      <span>
        {product.name} · {product.tagline}
      </span>
      <span className="app-footer-meta">
        <button
          type="button"
          className="app-version"
          aria-label={ui.about.version(version)}
          aria-haspopup="dialog"
          onClick={tapVersion}
          onBlur={() => {
            sequence.current = null;
          }}
          onKeyDown={(event) => {
            if (event.repeat) event.preventDefault();
          }}
        >
          v{version}
        </button>
        <span aria-hidden="true">·</span>
        <a href={product.creditUrl} target="_blank" rel="noopener noreferrer">
          {product.creditLabel}
        </a>
      </span>
      {noteOpen && (
        <Modal
          open
          onClose={() => setNoteOpen(false)}
          title={ui.about.title}
          description={ui.about.version(version)}
        >
          <section className="build-note">
            <h3>{ui.about.noteTitle}</h3>
            {ui.about.note.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        </Modal>
      )}
    </footer>
  );
}
