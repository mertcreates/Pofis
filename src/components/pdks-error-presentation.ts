import type { RequestFailure, FailureKind, PdksOperation } from "@/lib/pdks-failure";
import { ui } from "@/lib/ui-text.js";
import { formatDateTime } from "@/domain/time";

const diagnosticLabels = {
  apiPath: ui.apiPath, apiMethod: ui.apiMethod, sourceStatus: ui.sourceStatus,
  sessionCheck: ui.sessionCheck, sessionCheckStatus: ui.sessionCheckStatus,
  sessionCheckCode: ui.sessionCheckCode, recoveryAttempts: ui.recoveryAttempts,
  stage: ui.stage, method: ui.method, path: ui.path, type: ui.type,
  diagnostic: ui.diagnostic, causeCode: ui.causeCode, occurredAt: ui.occurredAt,
};
const diagnosticTimeOptions: Intl.DateTimeFormatOptions = {
  day: "numeric", month: "long", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "shortOffset",
};

export function pdksDiagnosticRows(failure: RequestFailure) {
  const rows = [
    { key: "code", label: ui.errorCode, value: failure.code, raw: failure.code },
    { key: "status", label: ui.apiStatus, value: String(failure.status || ui.noResponse), raw: String(failure.status || ui.noResponse) },
  ];
  for (const [key, label] of Object.entries(diagnosticLabels)) {
    const raw = failure.details[key as keyof typeof diagnosticLabels];
    if (typeof raw !== "string" && typeof raw !== "number") continue;
    let value = String(raw);
    if (key === "sessionCheck" && Object.hasOwn(ui.sessionChecks, value)) {
      value = ui.sessionChecks[value as keyof typeof ui.sessionChecks];
    }
    if (key === "occurredAt" && typeof raw === "string") {
      const timestamp = Date.parse(raw);
      if (Number.isFinite(timestamp))
        value = formatDateTime(timestamp, diagnosticTimeOptions);
    }
    rows.push({ key, label, value, raw: String(raw) });
  }
  return rows;
}

export function pdksDiagnosticText(failure: RequestFailure) {
  return pdksDiagnosticRows(failure).map(({ label, raw }) => `${label}: ${raw}`).join("\n");
}

const diagnosticGroupByKey = {
  code: "error", status: "error", type: "error", diagnostic: "error",
  causeCode: "error", occurredAt: "error",
  apiPath: "application", apiMethod: "application",
  path: "source", method: "source", sourceStatus: "source", stage: "source",
  sessionCheck: "source", sessionCheckStatus: "source", sessionCheckCode: "source",
  recoveryAttempts: "source",
} as const satisfies Record<keyof typeof diagnosticLabels | "code" | "status", string>;

export function pdksDiagnosticGroups(failure: RequestFailure) {
  const rows = pdksDiagnosticRows(failure);
  return [
    { key: "error", label: ui.diagnosticGroups.error },
    { key: "application", label: ui.diagnosticGroups.application },
    { key: "source", label: ui.diagnosticGroups.source },
  ].map(group => ({
    ...group,
    rows: rows.filter(row => diagnosticGroupByKey[row.key as keyof typeof diagnosticGroupByKey] === group.key),
  })).filter(group => group.rows.length > 0);
}

const operationTitles: Record<PdksOperation, string> = ui.pdksFailureTitles;
const actionLabels: Record<PdksOperation, string> = ui.pdksFailureActions;
const technical: Record<FailureKind, boolean> = {
  credentials: false, validation: false, "session-expired": false,
  network: true, unavailable: true, upstream: true, "rate-limit": true, permission: false,
  source: true, limit: false, unexpected: true,
};

export function presentPdksFailure(failure: RequestFailure) {
  const content = ui.pdksFailures[failure.kind];
  return {
    title: content.title || operationTitles[failure.operation],
    message: failure.code === "CONNECTION_FAILED" ? ui.pdksConnectionUnavailable
      : failure.kind === "validation"
      ? failure.operation === "connect" ? ui.pdksCredentialsInvalid
        : failure.operation === "report" ? ui.pdksReportRangeInvalid : content.message
      : content.message,
    actionLabel: actionLabels[failure.operation],
    canRetry: failure.recovery === "retry" && failure.operation !== "connect",
    showDiagnostics: technical[failure.kind],
    tone: failure.kind === "session-expired" ? "neutral" : "error",
  };
}
