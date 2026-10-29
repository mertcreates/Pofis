"use client";
import { ui } from "../lib/ui-text.js";

import { useCallback, useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { api, ApiError, createLatestRequest } from "@/lib/api-client.js";
import { readSessionResponse } from "@/lib/session-response.js";
import { startSessionHeartbeat } from "@/lib/session-heartbeat.js";
import { toRequestFailure, type PdksOperation } from "@/lib/pdks-failure";
import { addDays } from "@/domain/rules/calendar";
import { REPORT_ACCESS } from "@/domain/rules/report-access";
import { SESSION_POLICY } from "@/domain/rules/session-policy";
import { readReportResponse } from "./report-response";
import { initialPdksState, pdksReducer } from "./pdks-state";
import { setAnalyticsUserId } from "@/lib/analytics";
import { readAnalyticsUserId } from "@/lib/analytics-identity";
import type { NotificationReport, NotificationStatus } from "@/desktop/notification-contract";
import type { RememberedResult } from "@/desktop/remembered-contract";

function readRememberedResult<T>(result: RememberedResult<T>): T {
  if (!result.ok) throw result.error;
  return result.value;
}

function readWorkPlanSession(value: unknown, required: boolean): string | null {
  const session = value && typeof value === "object" && "workPlanSession" in value
    ? value.workPlanSession : undefined;
  if (session === undefined && !required) return null;
  if (typeof session === "string" && /^[a-f0-9]{64}$/.test(session)) return session;
  throw new ApiError(ui.apiErrors.responseUnreadable, 200, "INVALID_RESPONSE", {
    apiPath: "/api/session", apiMethod: "GET", diagnostic: ui.apiErrors.invalidSessionResponse,
  });
}

function desktopWorkPlansEnabled() {
  return Boolean(window.pofisRememberedSession && !window.pofisScenario);
}

function reportBelongsToSession(value: unknown, expected: string | null): boolean {
  if (!desktopWorkPlansEnabled()) return true;
  if (!expected || !value || typeof value !== "object" || !("notificationSession" in value)) return false;
  const session = value.notificationSession;
  return Boolean(session && typeof session === "object" && "workPlanSession" in session && session.workPlanSession === expected);
}

export function usePdks(week: string, { observeDesktopSession = false } = {}) {
  const [state, dispatch] = useReducer(pdksReducer, initialPdksState);
  const { connected, report } = state;
  const [requests] = useState(createLatestRequest);
  const generation = useRef(0);
  const pendingSession = useRef<{ id: number; signal: AbortSignal; controller: AbortController; promise: Promise<boolean | undefined> } | null>(null);
  const pendingReport = useRef<{ id: number; week: string; promise: Promise<void> } | null>(null);
  const mutationInFlight = useRef(false);
  const desktopActive = useRef<boolean | null>(null);
  const [refreshVersion, requestRefresh] = useReducer((value: number) => value + 1, 0);
  const [rememberWarning, setRememberWarning] = useState("");

  const cancelReport = useCallback(() => {
    requests.cancel();
    pendingReport.current = null;
  }, [requests]);
  const invalidate = useCallback(() => {
    cancelReport();
    pendingSession.current?.controller.abort();
    pendingSession.current = null;
    generation.current++;
  }, [cancelReport]);

  const fail = useCallback((error: unknown, operation: PdksOperation) => {
    const failure = toRequestFailure(error, operation);
    if (failure.kind === "session-expired") {
      setAnalyticsUserId(null);
      invalidate();
    }
    dispatch({ type: "failed", failure });
    if (!mutationInFlight.current && (failure.kind === "session-expired" ||
        (failure.kind === "unavailable" && operation === "report"))) {
      void window.pofisRememberedSession?.recover(failure.kind === "unavailable").then(readRememberedResult).catch(() => {});
    }
  }, [invalidate]);

  const verifySessionAfterExpiry = useCallback(async (error: unknown) => {
    if (mutationInFlight.current) return;
    const id = generation.current;
    try {
      const result = await api("/api/session", { signal: AbortSignal.timeout(SESSION_POLICY.heartbeatTimeoutMs) });
      if (id !== generation.current || mutationInFlight.current) return;
      if (!readSessionResponse(result, "/api/session", "GET")) fail(error, "session");
    } catch (checkError) {
      if (id === generation.current && !mutationInFlight.current)
        console.warn(ui.serverDiagnostics.sessionRecheckFailed, toRequestFailure(checkError, "session").code);
      // The menu keeps its error; the regular heartbeat will check the session again.
    }
  }, [fail]);

  const onExpired = useEffectEvent((error: unknown) => fail(error, "session"));
  const onDesktopReport = useEffectEvent((value: NotificationReport) => {
    if (observeDesktopSession && desktopActive.current === false) return;
    if (!connected || (state.busy && state.busy !== "report") || mutationInFlight.current || value.from !== week) return;
    if (!reportBelongsToSession(value, state.workPlanSession)) return;
    try {
      const next = readReportResponse(value, week, addDays(week, 6));
      if (report?.from === next.from && report.to === next.to) {
        const difference = Date.parse(next.fetchedAt) - Date.parse(report.fetchedAt);
        if (difference < 0 || (difference === 0 && state.busy === "report")) return;
      }
      invalidate();
      setAnalyticsUserId(readAnalyticsUserId(value));
      dispatch({ type: "report-loaded", report: next });
    } catch (error) { fail(error, "report"); }
  });
  useEffect(() => {
    const bridge = window.pofisNotifications;
    if (!bridge) return;
    const stopReport = bridge.onReport(onDesktopReport);
    const stopExpiry = bridge.onExpired(() => {
      desktopActive.current = false;
      setAnalyticsUserId(null); invalidate();
      dispatch({ type: "session-checked", connected: false });
    });
    return () => { stopReport(); stopExpiry(); };
  }, [invalidate]);
  useEffect(() => {
    if (!connected) return;
    if (window.pofisNotifications) return;
    return startSessionHeartbeat(onExpired);
  }, [connected]);

  const checkSession = useCallback((externalSignal?: AbortSignal) => {
    const current = pendingSession.current;
    if (current?.id === generation.current && !current.signal.aborted) return current.promise;
    const controller = new AbortController();
    const signal = externalSignal ? AbortSignal.any([externalSignal, controller.signal]) : controller.signal;
    const id = ++generation.current;
    dispatch({ type: "started", operation: "session" });
    const promise = (async () => {
      try {
        let result = await api("/api/session", { signal });
        if (signal.aborted || id !== generation.current) return;
        let sessionConnected = readSessionResponse(result, "/api/session", "GET");
        if (!sessionConnected && window.pofisRememberedSession) {
          sessionConnected = readRememberedResult(await window.pofisRememberedSession.recover(false));
          if (signal.aborted || id !== generation.current) return;
          if (sessionConnected) {
            result = await api("/api/session", { signal });
            if (signal.aborted || id !== generation.current) return;
            sessionConnected = readSessionResponse(result, "/api/session", "GET");
          }
        }
        const workPlanSession = sessionConnected ? readWorkPlanSession(result, desktopWorkPlansEnabled()) : null;
        if (!sessionConnected) setAnalyticsUserId(null);
        dispatch({ type: "session-checked", connected: sessionConnected, workPlanSession });
        return sessionConnected;
      } catch (error) {
        if (!signal.aborted && id === generation.current)
          fail(error, toRequestFailure(error, "connect").kind === "credentials" ? "connect" : "session");
      } finally {
        if (pendingSession.current?.id === id) pendingSession.current = null;
      }
    })();
    pendingSession.current = { id, signal, controller, promise };
    return promise;
  }, [fail]);

  const onRememberedRecovered = useEffectEvent(() => {
    if (mutationInFlight.current) return;
    invalidate();
    setRememberWarning("");
    void checkSession().then(active => { if (active) requestRefresh(); });
  });
  const onRememberedInvalid = useEffectEvent((cleanupFailed: boolean) => {
    if (mutationInFlight.current) return;
    if (connected || cleanupFailed) setRememberWarning(cleanupFailed
      ? ui.connectionFields.rememberInvalidCleanupFailed : ui.connectionFields.rememberInvalid);
    if (!connected) fail({ code: "AUTH_FAILED", status: 401 }, "connect");
  });
  useEffect(() => {
    const bridge = window.pofisRememberedSession;
    if (!bridge) return;
    const stopRecovered = bridge.onRecovered(onRememberedRecovered);
    const stopInvalid = bridge.onInvalid(onRememberedInvalid);
    return () => { stopRecovered(); stopInvalid(); };
  }, []);

  const onDesktopStatus = useEffectEvent((status: NotificationStatus) => {
    if (desktopActive.current === status.active) {
      if (status.active && status.refreshError) fail(new Error(status.refreshError), "report");
      return;
    }
    desktopActive.current = status.active;
    invalidate();
    // Clear the previous account before checking the shared session again.
    dispatch({ type: "disconnected" });
    setAnalyticsUserId(null);
    if (status.active && document.visibilityState === "visible") void checkSession();
  });
  useEffect(() => {
    if (!observeDesktopSession || !window.pofisNotifications) return;
    return window.pofisNotifications.subscribe(onDesktopStatus);
  }, [observeDesktopSession]);

  const onVisible = useEffectEvent(async () => {
    if (document.visibilityState !== "visible" || mutationInFlight.current || pendingSession.current ||
        pendingReport.current || (state.busy && connected !== null)) return;
    const wasConnected = connected;
    if (await checkSession() && wasConnected) requestRefresh();
  });
  useEffect(() => {
    if (!observeDesktopSession || !window.pofisNotifications) return;
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [observeDesktopSession]);

  useEffect(() => {
    const controller = new AbortController();
    if (!observeDesktopSession || document.visibilityState === "visible") void checkSession(controller.signal);
    return () => {
      controller.abort();
      invalidate();
      setAnalyticsUserId(null);
    };
  }, [checkSession, invalidate, observeDesktopSession]);

  const load = useCallback(() => {
    if (!connected || mutationInFlight.current) return Promise.resolve();
    const current = pendingReport.current;
    if (current?.id === generation.current && current.week === week) return current.promise;
    const id = ++generation.current;
    dispatch({ type: "started", operation: "report" });
    const promise = (async () => {
      try {
        const result = await requests.run(
          `/api/report?${new URLSearchParams({ person: REPORT_ACCESS.person, from: week, to: addDays(week, 6) })}`,
        );
        if (!result || id !== generation.current) return;
        if (!reportBelongsToSession(result, state.workPlanSession))
          throw new ApiError(ui.apiErrors.responseUnreadable, 200, "INVALID_RESPONSE", {
            apiPath: "/api/report", apiMethod: "GET", diagnostic: ui.sourceErrors.reportContractMismatch,
          });
        const nextReport = readReportResponse(result, week, addDays(week, 6));
        setAnalyticsUserId(readAnalyticsUserId(result));
        dispatch({ type: "report-loaded", report: nextReport });
        if (!observeDesktopSession) void window.pofisNotifications?.refresh().catch(() => console.warn(ui.serverDiagnostics.backgroundRefreshFailed));
      } catch (error) {
        if (id === generation.current) fail(error, "report");
      } finally {
        if (pendingReport.current?.id === id) pendingReport.current = null;
      }
    })();
    pendingReport.current = { id, week, promise };
    return promise;
  }, [connected, week, requests, fail, observeDesktopSession, state.workPlanSession]);

  useEffect(() => {
    void load();
    return cancelReport;
  }, [load, cancelReport, refreshVersion]);

  const refreshScenario = useEffectEvent(async () => {
    // Mini follows the shared desktop runtime; only the main window drives fixture refreshes.
    if (connected) await load();
    else await checkSession();
  });
  useEffect(() => {
    if (!observeDesktopSession) return window.pofisScenario?.onRefresh(refreshScenario);
  }, [observeDesktopSession]);

  const connect = useCallback(async (form: HTMLFormElement) => {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    const values = new FormData(form);
    invalidate();
    const id = generation.current;
    dispatch({ type: "started", operation: "connect" });
    let sessionEstablished = false;
    try {
      const remember = values.has("remember");
      const desktop = window.pofisRememberedSession;
      const result = desktop ? readRememberedResult(await desktop.connect({ username: values.get("username"), password: values.get("password"), remember }))
        : await api("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: values.get("username"), password: values.get("password") }),
        });
      if (id !== generation.current) return;
      sessionEstablished = true;
      if (desktop) {
        const saved = result as { remembered: boolean; cleanupFailed?: boolean };
        setRememberWarning(saved.cleanupFailed ? ui.connectionFields.rememberCleanupFailed
          : remember && !saved.remembered ? ui.connectionFields.rememberSaveFailed : "");
      }
      else readSessionResponse(result, "/api/session", "POST");
      const session = desktop ? await api("/api/session") : result;
      if (id !== generation.current) return;
      if (desktop && !readSessionResponse(session, "/api/session", "GET"))
        throw new ApiError(ui.apiErrors.responseUnreadable, 200, "INVALID_RESPONSE", {
          apiPath: "/api/session", apiMethod: "GET", diagnostic: ui.apiErrors.invalidSessionResponse,
        });
      const workPlanSession = readWorkPlanSession(session, desktopWorkPlansEnabled());
      setAnalyticsUserId(null);
      dispatch({ type: "connected", workPlanSession });
    } catch (error) {
      if (id === generation.current) {
        if (sessionEstablished) {
          setAnalyticsUserId(null);
          dispatch({ type: "disconnected" });
        }
        fail(error, sessionEstablished ? "session" : "connect");
      }
    } finally {
      values.delete("username");
      values.delete("password");
      (form.elements.namedItem("password") as HTMLInputElement).value = "";
      mutationInFlight.current = false;
    }
  }, [fail, invalidate]);

  const disconnect = useCallback(async () => {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    invalidate();
    const id = generation.current;
    const previousUserId = readAnalyticsUserId(report);
    setAnalyticsUserId(null);
    dispatch({ type: "started", operation: "disconnect" });
    try {
      if (window.pofisRememberedSession) readRememberedResult(await window.pofisRememberedSession.disconnect());
      else {
        const result = await api("/api/session", { method: "DELETE" });
        readSessionResponse(result, "/api/session", "DELETE");
      }
      setRememberWarning("");
      if (id === generation.current) dispatch({ type: "disconnected" });
    } catch (error) {
      if (id === generation.current) {
        fail(error, "disconnect");
        if (toRequestFailure(error, "disconnect").kind !== "session-expired") {
          setAnalyticsUserId(previousUserId);
        }
      }
    } finally {
      mutationInFlight.current = false;
    }
  }, [fail, invalidate, report]);

  const retryFailure = useCallback(() => {
    if (!state.failure || state.failure.recovery !== "retry") return;
    switch (state.failure.operation) {
      case "session": return checkSession();
      case "report": return load();
      case "disconnect": return disconnect();
      case "connect":
      case "runtime": return;
    }
  }, [state.failure, checkSession, load, disconnect]);

  const returnToLogin = useCallback(() => dispatch({ type: "returned-to-login" }), []);

  return {
    ...state,
    report: connected && report?.from === week ? report : null,
    connect, disconnect, refresh: load, checkSession, verifySessionAfterExpiry, retryFailure, returnToLogin, rememberWarning,
  };
}
