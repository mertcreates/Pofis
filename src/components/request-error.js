"use client";

import { useEffect, useRef } from "react";
import { POFI_ASSETS } from "@/domain/rules/pofi.js";
import { ui } from "@/lib/ui-text.js";

const fields = {
  apiPath: ui.apiPath,
  apiMethod: ui.apiMethod,
  sourceStatus: ui.sourceStatus,
  sessionCheck: ui.sessionCheck,
  sessionCheckStatus: ui.sessionCheckStatus,
  sessionCheckCode: ui.sessionCheckCode,
  recoveryAttempts: ui.recoveryAttempts,
  stage: ui.stage,
  method: ui.method,
  path: ui.path,
  type: ui.type,
  diagnostic: ui.diagnostic,
  causeCode: ui.causeCode,
  occurredAt: ui.occurredAt,
};

export default function RequestError({ error, onRetry, busy }) {
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, [error]);
  const expired = error.status === 401;
  let title = ui.requestFailed;
  if (expired && error.code !== "AUTH_FAILED") title = ui.expired;
  let retryLabel = ui.retry;
  if (expired) retryLabel = ui.reconnect;
  if (busy) retryLabel = ui.retrying;
  return (
    <section
      className="empty request-error"
      aria-labelledby="request-error-title"
    >
      <img
        src={POFI_ASSETS.error}
        className="request-error-mascot"
        width="180"
        height="180"
        alt=""
      />
      <div className="request-error-heading">
        <h1 id="request-error-title" ref={heading} tabIndex={-1}>
          {title}
        </h1>
        <p role="alert">{error.message}</p>
      </div>
      {onRetry && (
        <div className="request-error-actions">
          <button
            className="primary"
            type="button"
            onClick={onRetry}
            disabled={!!busy}
          >
            {retryLabel}
          </button>
        </div>
      )}
      <details className="request-error-disclosure">
        <summary>{ui.diagnostic}</summary>
        <dl className="request-error-details">
          <div>
            <dt>{ui.errorCode}</dt>
            <dd>{error.code || "UNKNOWN_ERROR"}</dd>
          </div>
          <div>
            <dt>{ui.apiStatus}</dt>
            <dd>{error.status || ui.noResponse}</dd>
          </div>
          {Object.entries(fields).map(([key, label]) => {
            let value = error.details?.[key];
            if (typeof value !== "string" && typeof value !== "number")
              return null;
            if (
              key === "sessionCheck" &&
              Object.hasOwn(ui.sessionChecks, value)
            )
              value = ui.sessionChecks[value];
            return (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{String(value)}</dd>
              </div>
            );
          })}
        </dl>
      </details>
    </section>
  );
}
