"use client";

import { useEffect, useRef, useState } from "react";
import { product, ui } from "@/lib/ui-text.js";
import Modal from "../modal.js";
import { version } from "../../../package.json";
import { POFI_SURPRISES } from "@/domain/rules/pofi-surprises";
import { CHANGELOG_SEEN_KEY } from "@/domain/changelog";

export default function AppFooter({ updateAvailable = false, onOpenUpdate, onOpenChangelog }) {
  const sequence = useRef(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CHANGELOG_SEEN_KEY) !== version) {
        setIsNew(true);
      }
    } catch {
      // Tarayıcı depolaması kapalıysa veya erişilemiyorsa sessizce devam edilir.
    }
  }, []);

  function tapVersion() {
    if (isNew) {
      try {
        localStorage.setItem(CHANGELOG_SEEN_KEY, version);
      } catch {
        // Tarayıcı depolaması kapalıysa sessizce devam edilir.
      }
      setIsNew(false);
    }
    onOpenChangelog?.(version);
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
          data-new={isNew || undefined}
          aria-label={ui.changelog.openVersion(version)}
          onClick={tapVersion}
          onBlur={(event) => {
            // Opening history focuses this version's heading without ending the tap sequence.
            if (event.relatedTarget?.getAttribute("data-changelog-version") !== version)
              sequence.current = null;
          }}
          onKeyDown={(event) => {
            if (event.repeat) event.preventDefault();
          }}
        >
          v{version}
        </button>
        {updateAvailable && <button type="button" className="text-button desktop-update-trigger"
          aria-haspopup="dialog" onClick={onOpenUpdate}>{ui.desktopUpdate.available}</button>}
        <span aria-hidden="true">·</span>
        <a href={product.creditUrl} target="_blank" rel="noopener noreferrer">
          {product.creditLabel}
        </a>
      </span>
      {noteOpen && (
        <Modal
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
