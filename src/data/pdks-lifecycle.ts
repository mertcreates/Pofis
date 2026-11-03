import { api, ApiError, createLatestRequest } from "@/lib/api-client.js";
import { readSessionResponse } from "@/lib/session-response.js";
import { ui } from "@/lib/ui-text.js";
import { addDays } from "@/domain/rules/calendar";
import { REPORT_ACCESS } from "@/domain/rules/report-access";
import { SESSION_POLICY } from "@/domain/rules/session-policy";
import type { Report } from "@/domain/report";
import type { NotificationReport } from "@/desktop/notification-contract";
import type { RememberedResult } from "@/desktop/remembered-contract";
import type { PdksState } from "./pdks-state";
import { readReportResponse } from "./report-response";

export function readRememberedResult<T>(result: RememberedResult<T>): T {
  if (!result.ok) throw result.error;
  return result.value;
}

function desktopWorkPlansEnabled() {
  return Boolean(window.pofisRememberedSession && !window.pofisScenario);
}

export function readWorkPlanSession(value: unknown): string | null {
  const session = value && typeof value === "object" && "workPlanSession" in value
    ? value.workPlanSession : undefined;
  if (session === undefined && !desktopWorkPlansEnabled()) return null;
  if (typeof session === "string" && /^[a-f0-9]{64}$/.test(session)) return session;
  throw new ApiError(ui.apiErrors.responseUnreadable, 200, "INVALID_RESPONSE", {
    apiPath: "/api/session", apiMethod: "GET", diagnostic: ui.apiErrors.invalidSessionResponse,
  });
}

function reportBelongsToSession(value: unknown, expected: string | null): boolean {
  if (!desktopWorkPlansEnabled()) return true;
  if (!expected || !value || typeof value !== "object" || !("notificationSession" in value)) return false;
  const session = value.notificationSession;
  return Boolean(session && typeof session === "object" && "workPlanSession" in session && session.workPlanSession === expected);
}

type SessionHandlers = {
  started(): void;
  checked(connected: boolean, workPlanSession: string | null, interruptedReport: boolean): void;
  failed(error: unknown): void;
};

type ReportHandlers = {
  started(): void;
  loaded(report: Report, response: unknown): void;
  failed(error: unknown): void;
};

export function createPdksLifecycle() {
  const requests = createLatestRequest();
  let generation = 0;
  let pendingSession: { id: number; signal: AbortSignal; controller: AbortController; promise: Promise<boolean | undefined> } | null = null;
  let pendingReport: { id: number; week: string; promise: Promise<void> } | null = null;
  // A failed session check must retain the interrupted report until a later successful check.
  let interruptedReport = false;
  let mutationInFlight = false;

  function cancelReport() {
    requests.cancel();
    pendingReport = null;
  }

  function invalidate() {
    cancelReport();
    pendingSession?.controller.abort();
    pendingSession = null;
    interruptedReport = false;
    generation++;
  }

  function beginMutation() {
    if (mutationInFlight) return null;
    mutationInFlight = true;
    invalidate();
    const id = generation;
    return {
      isCurrent: () => id === generation,
      finish: () => { mutationInFlight = false; },
    };
  }

  function checkSession(externalSignal: AbortSignal | undefined, handlers: SessionHandlers) {
    if (pendingSession?.id === generation && !pendingSession.signal.aborted) return pendingSession.promise;
    const controller = new AbortController();
    const signal = externalSignal ? AbortSignal.any([externalSignal, controller.signal]) : controller.signal;
    if (pendingReport?.id === generation) interruptedReport = true;
    const id = ++generation;
    handlers.started();
    const promise = (async () => {
      try {
        let result = await api("/api/session", { signal });
        if (signal.aborted || id !== generation) return;
        let connected = readSessionResponse(result, "/api/session", "GET");
        if (!connected && window.pofisRememberedSession) {
          connected = readRememberedResult(await window.pofisRememberedSession.recover(false));
          if (signal.aborted || id !== generation) return;
          if (connected) {
            result = await api("/api/session", { signal });
            if (signal.aborted || id !== generation) return;
            connected = readSessionResponse(result, "/api/session", "GET");
          }
        }
        const workPlanSession = connected ? readWorkPlanSession(result) : null;
        const resumeReport = interruptedReport;
        interruptedReport = false;
        handlers.checked(connected, workPlanSession, resumeReport);
        return connected;
      } catch (error) {
        if (!signal.aborted && id === generation) handlers.failed(error);
      } finally {
        if (pendingSession?.id === id) pendingSession = null;
      }
    })();
    pendingSession = { id, signal, controller, promise };
    return promise;
  }

  function loadReport(week: string, workPlanSession: string | null, handlers: ReportHandlers) {
    if (mutationInFlight) return Promise.resolve();
    if (pendingReport?.id === generation && pendingReport.week === week) return pendingReport.promise;
    interruptedReport = false;
    const id = ++generation;
    handlers.started();
    const promise = (async () => {
      try {
        const result = await requests.run(
          `/api/report?${new URLSearchParams({ person: REPORT_ACCESS.person, from: week, to: addDays(week, 6) })}`,
        );
        if (!result || id !== generation) return;
        if (!reportBelongsToSession(result, workPlanSession))
          throw new ApiError(ui.apiErrors.responseUnreadable, 200, "INVALID_RESPONSE", {
            apiPath: "/api/report", apiMethod: "GET", diagnostic: ui.sourceErrors.reportContractMismatch,
          });
        handlers.loaded(readReportResponse(result, week, addDays(week, 6)), result);
      } catch (error) {
        if (id === generation) handlers.failed(error);
      } finally {
        if (pendingReport?.id === id) pendingReport = null;
      }
    })();
    pendingReport = { id, week, promise };
    return promise;
  }

  function acceptDesktopReport(value: NotificationReport, week: string, state: PdksState, inactive: boolean): Report | null {
    if (inactive || !state.connected || (state.busy && state.busy !== "report") || mutationInFlight || value.from !== week) return null;
    if (!reportBelongsToSession(value, state.workPlanSession)) return null;
    const next = readReportResponse(value, week, addDays(week, 6));
    if (state.report?.from === next.from && state.report.to === next.to) {
      const difference = Date.parse(next.fetchedAt) - Date.parse(state.report.fetchedAt);
      if (difference < 0 || (difference === 0 && state.busy === "report")) return null;
    }
    invalidate();
    return next;
  }

  async function verifySessionAfterExpiry(onExpired: () => void, onError: (error: unknown) => void) {
    if (mutationInFlight) return;
    const id = generation;
    try {
      const result = await api("/api/session", { signal: AbortSignal.timeout(SESSION_POLICY.heartbeatTimeoutMs) });
      if (id !== generation || mutationInFlight) return;
      if (!readSessionResponse(result, "/api/session", "GET")) onExpired();
    } catch (error) {
      if (id === generation && !mutationInFlight) onError(error);
    }
  }

  return {
    cancelReport, invalidate, beginMutation, checkSession, loadReport, acceptDesktopReport, verifySessionAfterExpiry,
    isMutating: () => mutationInFlight,
    hasPendingRequests: () => Boolean(pendingSession || pendingReport),
  };
}
