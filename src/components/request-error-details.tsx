"use client";

import { useId, useState } from "react";
import { pdksDiagnosticRows, pdksDiagnosticText } from "./pdks-error-presentation";
import { formatDateTime } from "@/domain/time";
import type { RequestFailure } from "@/lib/pdks-failure";
import { ui } from "@/lib/ui-text.js";

const summaryKeys = new Set(["code", "diagnostic", "occurredAt"]);
const applicationKeys = new Set(["status", "apiMethod", "apiPath", "type"]);

function DiagnosticCopyButton({ error }: { error: RequestFailure }) {
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
  return <div className="request-error-copy">
    <button type="button" onClick={copyDetails} disabled={status === "copying"}>
      {status === "copying" ? ui.copyingDiagnostics : ui.copyDiagnostics}
    </button>
    <p role="status">{status === "copied" ? ui.diagnosticsCopied : status === "failed" ? ui.diagnosticsCopyFailed : ""}</p>
  </div>;
}

export function RequestErrorDetails({ error, inline = false }: { error: RequestFailure; inline?: boolean }) {
  const headingId = useId();
  const text = ui.errorTrace;
  const Heading = inline ? "h3" : "h2";
  const GroupHeading = inline ? "h4" : "h3";
  const rows = pdksDiagnosticRows(error);
  const diagnostic = rows.find(row => row.key === "diagnostic");
  const timestamp = rows.find(row => row.key === "occurredAt");
  const date = timestamp ? Date.parse(timestamp.raw) : NaN;
  const details = rows.filter(row => !summaryKeys.has(row.key));
  const groups = [
    { key: "application", label: text.application, rows: details.filter(row => applicationKeys.has(row.key)) },
    { key: "source", label: text.source, rows: details.filter(row => !applicationKeys.has(row.key)) },
  ].filter(group => group.rows.length > 0);

  return (
    <section className="request-trace" aria-labelledby={headingId}>
      <div className="request-trace-heading">
        <Heading id={headingId}>{text.heading}</Heading>
        <DiagnosticCopyButton error={error} />
      </div>
      <div className="request-trace-rail">
        <section className="request-trace-cause" aria-labelledby={`${headingId}-cause`}>
          <GroupHeading id={`${headingId}-cause`}>{text.cause}</GroupHeading>
          {diagnostic && <p className="request-trace-explanation">{diagnostic.value}</p>}
          <dl className="request-trace-meta">
            <div><dt>{ui.errorCode}</dt><dd><code>{error.code}</code></dd></div>
            {timestamp && <div><dt>{ui.occurredAt}</dt><dd>{Number.isFinite(date)
              ? <time dateTime={timestamp.raw}>{formatDateTime(date, {
                day: "numeric", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              })}</time> : timestamp.value}</dd></div>}
          </dl>
        </section>
        <section className="request-trace-requests" aria-labelledby={`${headingId}-requests`}>
          <GroupHeading id={`${headingId}-requests`}>{text.requests}</GroupHeading>
          <div className="request-trace-request-groups">
            {groups.map(group => {
              const methodKey = group.key === "application" ? "apiMethod" : "method";
              const pathKey = group.key === "application" ? "apiPath" : "path";
              const route = group.rows.filter(row => row.key === methodKey || row.key === pathKey);
              const fields = group.rows.filter(row => row.key !== methodKey && row.key !== pathKey);
              return <dl className="request-trace-meta request-trace-request-fields" key={group.key} aria-label={group.label}>
                {route.length > 0 && <div className="request-trace-request-route">
                  <dt>{group.label}</dt>
                  <dd><code>{[methodKey, pathKey].map(key => route.find(row => row.key === key)?.value).filter(Boolean).join(" ")}</code></dd>
                </div>}
                {fields.map(row => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
              </dl>;
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
