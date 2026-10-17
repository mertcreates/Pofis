"use client";

import { memo, useEffect, useId, useRef, useState } from "react";
import { POFI_ASSETS } from "@/domain/rules/pofi.js";
import { ui } from "@/lib/ui-text.js";
import { pdksDiagnosticGroups, pdksDiagnosticText, presentPdksFailure } from "./pdks-error-presentation";

const routeKeys = new Set(["apiMethod", "apiPath", "method", "path"]);
const proseKeys = new Set(["diagnostic", "occurredAt", "sessionCheck"]);

export function DiagnosticCopyButton({ error, label = ui.copyDiagnostics }) {
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
      <div className="request-error-copy">
        <button type="button" onClick={copyDetails} disabled={status === "copying"}>
          {status === "copying" ? ui.copyingDiagnostics : label}
        </button>
        <p role="status">{status === "copied" ? ui.diagnosticsCopied : status === "failed" ? ui.diagnosticsCopyFailed : ""}</p>
      </div>
  );
}

export function RequestErrorDetails({ error, inline = false, initiallyOpen = false }) {
  const groupId = useId();
  const GroupHeading = inline ? "h3" : "h2";
  return (
    <details className="request-error-disclosure" open={initiallyOpen}>
      <summary>{ui.diagnosticDisclosure}</summary>
      <DiagnosticCopyButton error={error} />
      <div className="request-error-groups">
      {pdksDiagnosticGroups(error).map(group => {
        const route = ["apiMethod", "method", "apiPath", "path"]
          .map(key => group.rows.find(row => row.key === key)).filter(row => row !== undefined);
        const fields = group.rows.filter(row => !routeKeys.has(row.key));
        return (
          <section className="request-error-group" key={group.key} aria-labelledby={`${groupId}-${group.key}`}>
            <GroupHeading id={`${groupId}-${group.key}`}>{group.label}</GroupHeading>
            {route.length > 0 && <dl className="request-error-route">
              {route.map(({ key, label, value }) => <div key={key} className={key === "method" || key === "apiMethod" ? "request-error-method" : undefined}>
                <dt className="visually-hidden">{label}</dt>
                <dd><code>{value}</code></dd>
              </div>)}
            </dl>}
            {fields.length > 0 && <dl className="request-error-details">
              {fields.map(({ key, label, value, raw }) => (
                <div key={key} className={key === "diagnostic" || key === "occurredAt" ? "request-error-detail-wide" : undefined}>
                  <dt>{label}</dt>
                  <dd>{key === "occurredAt" && value !== raw ? <time dateTime={raw}>{value}</time>
                    : proseKeys.has(key) ? value : <code>{value}</code>}</dd>
                </div>
              ))}
            </dl>}
          </section>
        );
      })}
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
      {presentation.showDiagnostics && <RequestErrorDetails error={error} inline={inline} />}
    </section>
  );
}

export default memo(RequestError);
