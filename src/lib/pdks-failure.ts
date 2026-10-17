export type PdksOperation = "session" | "connect" | "report" | "disconnect" | "runtime";
export type FailureKind =
  | "credentials" | "validation" | "session-expired" | "network"
  | "unavailable" | "rate-limit" | "permission" | "source" | "limit" | "unexpected";

const diagnosticFields = [
  "apiPath", "apiMethod", "sourceStatus", "sessionCheck", "sessionCheckStatus",
  "sessionCheckCode", "recoveryAttempts", "retryAfterMs", "stage", "method",
  "path", "type", "diagnostic", "causeCode", "occurredAt",
] as const;
export type DiagnosticDetails = Partial<Record<typeof diagnosticFields[number], string | number>>;

/** Diagnostics are an explicit, bounded projection; never copy bodies, credentials or arbitrary fields. */
export function readDiagnosticDetails(value: unknown): DiagnosticDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: DiagnosticDetails = {};
  for (const key of diagnosticFields) {
    const item = (value as Record<string, unknown>)[key];
    if (typeof item === "string") result[key] = item.slice(0, 1000);
    else if (typeof item === "number" && Number.isFinite(item)) result[key] = item;
  }
  return result;
}

export type RequestFailure = {
  kind: FailureKind;
  operation: PdksOperation;
  recovery: "submit" | "retry" | "none";
  status: number;
  code: string;
  details: DiagnosticDetails;
};

function classify(code: string, status: number, details: DiagnosticDetails): FailureKind {
  switch (code) {
    case "AUTH_FAILED": return status === 401 ? "credentials" : "unexpected";
    case "INVALID_INPUT": return "validation";
    case "SESSION_EXPIRED": return status === 401 ? "session-expired" : "unexpected";
    case "NETWORK_ERROR": return "network";
    case "CONNECTION_FAILED": return "unavailable";
    case "SOURCE_CHANGED": return "source";
    case "TOO_MANY_RESULTS": return "limit";
    case "SOURCE_ERROR":
      if (details.sourceStatus === 429) return "rate-limit";
      if (details.sourceStatus === 403) return "permission";
      return "unavailable";
    default: return "unexpected";
  }
}

/** HTTP status alone never proves that an existing PDKS session expired. */
export function toRequestFailure(error: unknown, operation: PdksOperation): RequestFailure {
  const source = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const status = typeof source.status === "number" && Number.isInteger(source.status)
    && source.status >= 0 && source.status <= 599 ? source.status : 0;
  const code = typeof source.code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(source.code)
    ? source.code : "INTERNAL_ERROR";
  const details = readDiagnosticDetails(source.details);
  const kind = classify(code, status, details);
  let recovery: RequestFailure["recovery"] = "retry";
  if (kind === "credentials" || kind === "session-expired") recovery = "submit";
  else if (kind === "validation") recovery = operation === "connect" ? "submit" : "none";
  else if (kind === "permission" || kind === "limit") recovery = "none";
  if (operation === "connect" && recovery === "retry") recovery = "submit";
  return { kind, operation, recovery, status, code, details };
}
