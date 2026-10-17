"use client";

import { useState } from "react";
import { POFI_ASSETS } from "@/domain/rules/pofi.js";
import { product, ui } from "@/lib/ui-text.js";
import Icon from "./ui-icon.js";

export function NotFoundState({ returnHref = "/" }: { returnHref?: string }) {
  const [revealed, setRevealed] = useState(false);
  return <section className="request-error request-error-page" aria-labelledby="not-found-title">
    <div className="request-error-hero">
      <div className="request-error-message">
        <div className="request-error-heading">
          <h1 id="not-found-title">{ui.notFound}</h1>
          <p>{ui.notFoundHelp}</p>
        </div>
        <div className="request-error-actions">
          <a className="button-link primary" href={returnHref}>{ui.returnSelf}<Icon name="arrow" /></a>
        </div>
        {revealed && <p role="status" className="pofi-room-note">{ui.pofiWrongDoor}</p>}
      </div>
      <button type="button" className="pofi-trigger not-found-art" aria-label={product.mascotName}
        onClick={() => setRevealed(true)}>
        <img src={POFI_ASSETS.tired} className="request-error-art" width="320" height="320" alt="" />
      </button>
    </div>
  </section>;
}
