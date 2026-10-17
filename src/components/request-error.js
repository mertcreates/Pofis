"use client";

import { memo, useEffect, useId, useRef, useState } from "react";
import { POFI_ASSETS } from "@/domain/rules/pofi.js";
import { ui } from "@/lib/ui-text.js";
import { pdksDiagnosticRows, pdksDiagnosticText, presentPdksFailure } from "./pdks-error-presentation";

function RequestErrorDetails({ error }) {
  const [copy, setCopy] = useState({ error, status: "idle" });
  const status = copy.error === error ? copy.status : "idle";
  async function copyDetails() {
    setCopy({ error, status: "copying" });
    try {
      await navigator.clipboard.writeText(pdksDiagnosticText(error));
      setCopy({ error, status: "copied" });
    } catch {
      // Clipboard access can be denied; keep the selectable details available.
      setCopy({ error, status: "failed" });
    }
  }
  return (
    <details className="request-error-disclosure">
      <summary>{ui.diagnosticDisclosure}</summary>
      <dl className="request-error-details">
        {pdksDiagnosticRows(error).map(({ key, label, value, raw }) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{key === "occurredAt" && value !== raw ? <time dateTime={raw}>{value}</time> : value}</dd>
          </div>
        ))}
      </dl>
      <div className="request-error-copy">
        <button type="button" onClick={copyDetails} disabled={status === "copying"}>
          {status === "copying" ? ui.copyingDiagnostics : ui.copyDiagnostics}
        </button>
        <p role="status">{status === "copied" ? ui.diagnosticsCopied : status === "failed" ? ui.diagnosticsCopyFailed : ""}</p>
      </div>
    </details>
  );
}

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
  return (
    <section
      className={inline ? `request-error-inline request-error-notice${presentation.tone === 'neutral' ? ' request-error-neutral' : ''}` : "empty request-error"}
      aria-labelledby={titleId}
    >
      {!inline && (
        <img
          src={POFI_ASSETS.error}
          className="request-error-mascot"
          width="180"
          height="180"
          alt=""
        />
      )}
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
          </button>
        </div>
      )}
      {presentation.showDiagnostics && <RequestErrorDetails error={error} />}
    </section>
  );
}

export default memo(RequestError);
