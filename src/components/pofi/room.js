"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "../modal.js";
import Icon from "../ui-icon.js";
import { POFI_SURPRISES, nextSurpriseTap } from "@/domain/rules/pofi-surprises";
import { POFI_ASSETS } from "@/domain/rules/pofi.js";
import { product, ui } from "@/lib/ui-text.js";

export default function PofiRoom({ onClose, children }) {
  const [section, setSection] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [laptopTaps, setLaptopTaps] = useState(0);
  const [missingPhotoRevealed, setMissingPhotoRevealed] = useState(false);
  const [signatureTaps, setSignatureTaps] = useState(0);
  const [workTaps, setWorkTaps] = useState(0);
  const [idleNoteVisible, setIdleNoteVisible] = useState(false);
  const tiles = useRef({});
  const photos = useRef({});
  const laptopCaption = useRef(null);
  const previousView = useRef({ section: null, photo: null });
  const copy = ui.pofiRoom;
  const selected = copy.sections.find((item) => item.id === section);
  let title = copy.title;
  let description = copy.description;
  if (selected) {
    title = selected.heading || selected.title;
    description = selected.subtitle || selected.description;
  }
  if (photo) title = copy.album[photo];
  let laptopNote = copy.brokenLaptopNote;
  if (laptopTaps === POFI_SURPRISES.revealTaps) laptopNote = copy.extraPawNote;

  useEffect(() => {
    if (section || idleNoteVisible) return;
    let timer;
    function resetTimer() {
      clearTimeout(timer);
      if (document.visibilityState === "hidden") return;
      timer = setTimeout(() => {
        setIdleNoteVisible(true);
      }, POFI_SURPRISES.idleMs);
    }
    const events = [
      "pointerdown",
      "pointermove",
      "keydown",
      "wheel",
      "visibilitychange",
    ];
    for (const event of events)
      document.addEventListener(event, resetTimer, {
        capture: true,
        passive: true,
      });
    resetTimer();
    return () => {
      clearTimeout(timer);
      for (const event of events)
        document.removeEventListener(event, resetTimer, true);
    };
  }, [section, idleNoteVisible]);

  useEffect(() => {
    const previous = previousView.current;
    if (!section && previous.section) tiles.current[previous.section]?.focus();
    else if (section === "album" && !photo && previous.photo)
      photos.current[previous.photo]?.focus();
    previousView.current = { section, photo };
  }, [section, photo]);

  useEffect(() => {
    laptopCaption.current?.scrollIntoView({ block: "nearest" });
  }, [photo, laptopNote]);

  function goBack() {
    if (photo) {
      setPhoto(null);
      setLaptopTaps(0);
      setMissingPhotoRevealed(false);
    } else {
      setSection(null);
      setSignatureTaps(0);
      setWorkTaps(0);
    }
  }

  function openPhoto(state) {
    setLaptopTaps(0);
    setMissingPhotoRevealed(false);
    setPhoto(state);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      onTitleClick={
        section === "work" ? () => setWorkTaps(nextSurpriseTap) : undefined
      }
      description={description}
      className="pofi-room-modal"
      onBack={selected ? goBack : undefined}
      backLabel={photo ? copy.backToAlbum : copy.back}
    >
      {!section && (
        <>
          <div className="pofi-room-welcome">
            <img src="/pofi/pofi-full.webp" width="112" height="112" alt="" />
            <div
              role="status"
              aria-atomic="true"
              className="pofi-room-welcome-copy"
            >
              <h3>{idleNoteVisible ? copy.idleTitle : copy.welcomeTitle}</h3>
              <p>{idleNoteVisible ? copy.idleNote : copy.welcome}</p>
            </div>
          </div>
          <div className="pofi-room-sections">
            {copy.sections.map((item) => (
              <button
                key={item.id}
                type="button"
                className="pofi-room-tile"
                ref={(node) => {
                  tiles.current[item.id] = node;
                }}
                onClick={() => setSection(item.id)}
              >
                <Icon name={item.icon} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                <Icon name="arrow" className="pofi-room-arrow" />
              </button>
            ))}
          </div>
        </>
      )}
      {section === "album" && !photo && (
        <div className="pofi-room-album">
          {Object.entries(POFI_ASSETS).map(([state, asset]) => (
            <button
              key={state}
              type="button"
              className="pofi-album-photo"
              aria-label={copy.album[state]}
              ref={(node) => {
                photos.current[state] = node;
              }}
              onClick={() => openPhoto(state)}
            >
              <img
                src={asset}
                width="180"
                height="180"
                alt={`${product.mascotName}: ${copy.album[state]}`}
              />
              <span>{copy.album[state]}</span>
            </button>
          ))}
          <button
            type="button"
            className="pofi-album-photo"
            aria-label={copy.album.missing}
            ref={(node) => {
              photos.current.missing = node;
            }}
            onClick={() => openPhoto("missing")}
          >
            <span className="pofi-missing-placeholder">
              <Icon name="image-missing" />
            </span>
            <span className="pofi-missing-title">{copy.album.missing}</span>
          </button>
        </div>
      )}
      {photo === "missing" && (
        <figure className="pofi-room-photo pofi-room-missing">
          <button
            type="button"
            className="pofi-room-photo-trigger"
            aria-label={copy.album.missing}
            onClick={() => setMissingPhotoRevealed(true)}
          >
            <span className="pofi-missing-placeholder">
              <Icon name="image-missing" />
            </span>
          </button>
          <figcaption aria-live="polite">
            {missingPhotoRevealed
              ? copy.missingPhotoNote
              : copy.missingPhotoDescription}
          </figcaption>
        </figure>
      )}
      {photo && photo !== "missing" && (
        <figure className="pofi-room-photo">
          {photo === "error" ? (
            <>
              <button
                type="button"
                className="pofi-room-photo-trigger"
                aria-label={copy.album[photo]}
                onClick={() => setLaptopTaps(nextSurpriseTap)}
                onKeyDown={(event) => {
                  if (event.repeat) event.preventDefault();
                }}
              >
                <img
                  src={POFI_ASSETS[photo]}
                  width="420"
                  height="420"
                  alt={`${product.mascotName}: ${copy.album[photo]}`}
                />
              </button>
              <figcaption ref={laptopCaption} aria-live="polite">
                {laptopNote}
              </figcaption>
            </>
          ) : (
            <img
              src={POFI_ASSETS[photo]}
              width="420"
              height="420"
              alt={`${product.mascotName}: ${copy.album[photo]}`}
            />
          )}
        </figure>
      )}
      {section === "notes" && children}
      {section === "identity" && (
        <div className="pofi-room-identity">
          <img
            src="/pofi/pofi-full.webp"
            width="160"
            height="160"
            alt={product.mascotName}
          />
          <dl>
            {copy.identity.map(([label, value, field]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {field === "signature" ? (
                    <>
                      <button
                        type="button"
                        className="pofi-text-trigger"
                        onClick={() => setSignatureTaps(nextSurpriseTap)}
                        onKeyDown={(event) => {
                          if (event.repeat) event.preventDefault();
                        }}
                      >
                        {value}
                      </button>
                      {signatureTaps === POFI_SURPRISES.revealTaps && (
                        <p role="status" className="pofi-room-note">
                          {copy.signatureNote}
                        </p>
                      )}
                    </>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {section === "work" && (
        <>
          <dl className="pofi-room-work">
            {copy.work.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="pofi-room-fiction">{copy.workIntro}</p>
          {workTaps === POFI_SURPRISES.revealTaps && (
            <p role="status" className="pofi-room-note pofi-room-work-note">
              {copy.performanceNote}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
