"use client";

import { useId } from "react";
import { DiagnosticCopyButton } from "@/components/request-error.js";
import { pdksDiagnosticRows } from "@/components/pdks-error-presentation";
import { formatDateTime } from "@/domain/time";
import type { RequestFailure } from "@/lib/pdks-failure";
import { ui } from "@/lib/ui-text.js";

const summaryKeys = new Set(["code", "diagnostic", "occurredAt"]);
const applicationKeys = new Set(["status", "apiMethod", "apiPath", "type"]);

export function DemoErrorTrace({ error }: { error: RequestFailure }) {
  const headingId = useId();
  const text = ui.demo.errors.trace;
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
    <section className="demo-trace" aria-labelledby={headingId}>
      <div className="demo-trace-heading">
        <h2 id={headingId}>{text.heading}</h2>
        <DiagnosticCopyButton error={error} label={text.copy} />
      </div>
      <div className="demo-trace-rail">
        <section className="demo-trace-cause" aria-labelledby={`${headingId}-cause`}>
          <h3 id={`${headingId}-cause`}>{text.cause}</h3>
          {diagnostic && <p className="demo-trace-explanation">{diagnostic.value}</p>}
          <dl className="demo-trace-meta">
            <div><dt>{ui.errorCode}</dt><dd><code>{error.code}</code></dd></div>
            {timestamp && <div><dt>{ui.occurredAt}</dt><dd>{Number.isFinite(date)
              ? <time dateTime={timestamp.raw}>{formatDateTime(date, {
                day: "numeric", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              })}</time> : timestamp.value}</dd></div>}
          </dl>
        </section>
        <section className="demo-trace-requests" aria-labelledby={`${headingId}-requests`}>
          <h3 id={`${headingId}-requests`}>{text.requests}</h3>
          <div className="demo-trace-request-groups">
            {groups.map(group => {
              const methodKey = group.key === "application" ? "apiMethod" : "method";
              const pathKey = group.key === "application" ? "apiPath" : "path";
              const route = group.rows.filter(row => row.key === methodKey || row.key === pathKey);
              const fields = group.rows.filter(row => row.key !== methodKey && row.key !== pathKey);
              return <dl className="demo-trace-meta demo-trace-request-fields" key={group.key} aria-label={group.label}>
                {route.length > 0 && <div className="demo-trace-request-route">
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
