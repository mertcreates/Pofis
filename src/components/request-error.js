"use client";

import { memo, useEffect, useId, useRef } from "react";
import { POFI_ASSETS } from "@/domain/rules/pofi.js";
import { ui } from "@/lib/ui-text.js";
import { presentPdksFailure } from "./pdks-error-presentation";
import { RequestErrorDetails } from "./request-error-details";
import Icon from "./ui-icon.js";

/**
 * @param {{
 *   error: import('@/lib/pdks-failure').RequestFailure,
 *   onRetry?: () => void,
 *   onReturnToLogin?: () => void,
 *   busy?: boolean,
 *   variant?: 'field' | 'notice' | 'page',
 * }} props
 */
function RequestError({ error, onRetry, onReturnToLogin, busy = false, variant = 'page' }) {
  const titleId = useId();
  const heading = useRef(null);
  useEffect(() => {
    if (variant !== 'field') heading.current?.focus();
  }, [error, variant]);
  const presentation = presentPdksFailure(error);
  if (variant === 'field') {
    return <p className="connection-field-error" role="alert">{presentation.message}</p>;
  }
  const inline = variant !== 'page';
  const message = <div className="request-error-message">
      <div className="request-error-heading">
        {inline ? (
          <h2 id={titleId} ref={heading} tabIndex={-1}>
            {presentation.title}
          </h2>
        ) : (
          <h1 id={titleId} ref={heading} tabIndex={-1}>
            {presentation.title}
          </h1>
        )}
        <p role={presentation.tone === 'neutral' ? 'status' : 'alert'}>{presentation.message}</p>
      </div>
      {presentation.canRetry && onRetry && (
        <div className="request-error-actions">
          <button
            className="primary"
            type="button"
            onClick={onRetry}
            disabled={!!busy}
          >
            {busy ? ui.retrying : presentation.actionLabel}
          </button>
        </div>
      )}
      {onReturnToLogin && (
        <div className="request-error-actions">
          <button className="primary" type="button" onClick={onReturnToLogin} disabled={busy}>
            {ui.returnToLogin}
            {!inline && <Icon name="arrow" />}
          </button>
        </div>
      )}
    </div>;
  return (
    <section
      className={inline ? "request-error-inline request-error-notice" : "request-error request-error-page"}
      aria-labelledby={titleId}
    >
      <div className={inline ? "request-error-notice-scene" : "request-error-hero"}>
        {message}
        <img src={POFI_ASSETS.error} className="request-error-art" width={inline ? 140 : 320} height={inline ? 140 : 320} alt="" />
      </div>
      {presentation.showDiagnostics && <RequestErrorDetails error={error} inline={inline} />}
    </section>
  );
}

export default memo(RequestError);
