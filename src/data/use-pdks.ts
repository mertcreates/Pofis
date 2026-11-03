"use client";
import { ui } from "../lib/ui-text.js";

import { useCallback, useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api-client.js";
import { readSessionResponse } from "@/lib/session-response.js";
import { startSessionHeartbeat } from "@/lib/session-heartbeat.js";
import { toRequestFailure, type PdksOperation } from "@/lib/pdks-failure";
import { createPdksLifecycle, readRememberedResult, readWorkPlanSession } from "./pdks-lifecycle";
import { initialPdksState, pdksReducer } from "./pdks-state";
import { setAnalyticsUserId } from "@/lib/analytics";
import { readAnalyticsUserId } from "@/lib/analytics-identity";
import type { NotificationReport, NotificationStatus } from "@/desktop/notification-contract";

export function usePdks(week: string, { observeDesktopSession = false } = {}) {
  const [state, dispatch] = useReducer(pdksReducer, initialPdksState);
  const { connected, report } = state;
  const [lifecycle] = useState(createPdksLifecycle);
  const { cancelReport, invalidate } = lifecycle;
  const desktopActive = useRef<boolean | null>(null);
  const [refreshVersion, requestRefresh] = useReducer((value: number) => value + 1, 0);
  const [rememberWarning, setRememberWarning] = useState("");

  const fail = useCallback((error: unknown, operation: PdksOperation) => {
    const failure = toRequestFailure(error, operation);
    if (failure.kind === "session-expired") {
      setAnalyticsUserId(null);
      invalidate();
    }
    dispatch({ type: "failed", failure });
    if (!lifecycle.isMutating() && (failure.kind === "session-expired" ||
        (failure.kind === "unavailable" && operation === "report"))) {
      void window.pofisRememberedSession?.recover(failure.kind === "unavailable").then(readRememberedResult).catch(() => {});
    }
  }, [invalidate, lifecycle]);

  const verifySessionAfterExpiry = useCallback(async (error: unknown) => {
    await lifecycle.verifySessionAfterExpiry(
      () => fail(error, "session"),
      // The menu keeps its error; the regular heartbeat will check the session again.
      checkError => console.warn(ui.serverDiagnostics.sessionRecheckFailed, toRequestFailure(checkError, "session").code),
    );
  }, [fail, lifecycle]);

  const onExpired = useEffectEvent((error: unknown) => fail(error, "session"));
  const onDesktopReport = useEffectEvent((value: NotificationReport) => {
    try {
      const next = lifecycle.acceptDesktopReport(value, week, state, observeDesktopSession && desktopActive.current === false);
      if (!next) return;
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
    return lifecycle.checkSession(externalSignal, {
      started: () => dispatch({ type: "started", operation: "session" }),
      checked: (sessionConnected, workPlanSession, interruptedReport) => {
        if (!sessionConnected) setAnalyticsUserId(null);
        dispatch({ type: "session-checked", connected: sessionConnected, workPlanSession });
        if (sessionConnected && interruptedReport) requestRefresh();
      },
      failed: error => fail(error, toRequestFailure(error, "connect").kind === "credentials" ? "connect" : "session"),
    });
  }, [fail, lifecycle]);

  const onRememberedRecovered = useEffectEvent(() => {
    if (lifecycle.isMutating()) return;
    invalidate();
    setRememberWarning("");
    void checkSession().then(active => { if (active) requestRefresh(); });
  });
  const onRememberedInvalid = useEffectEvent((cleanupFailed: boolean) => {
    if (lifecycle.isMutating()) return;
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
    if (document.visibilityState !== "visible" || lifecycle.isMutating() || lifecycle.hasPendingRequests() ||
        (state.busy && connected !== null)) return;
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
    if (!connected) return Promise.resolve();
    return lifecycle.loadReport(week, state.workPlanSession, {
      started: () => dispatch({ type: "started", operation: "report" }),
      loaded: (nextReport, result) => {
        setAnalyticsUserId(readAnalyticsUserId(result));
        dispatch({ type: "report-loaded", report: nextReport });
        if (!observeDesktopSession) void window.pofisNotifications?.refresh().catch(() => console.warn(ui.serverDiagnostics.backgroundRefreshFailed));
      },
      failed: error => fail(error, "report"),
    });
  }, [connected, week, lifecycle, fail, observeDesktopSession, state.workPlanSession]);

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
    const mutation = lifecycle.beginMutation();
    if (!mutation) return;
    const values = new FormData(form);
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
      if (!mutation.isCurrent()) return;
      sessionEstablished = true;
      if (desktop) {
        const saved = result as { remembered: boolean; cleanupFailed?: boolean };
        setRememberWarning(saved.cleanupFailed ? ui.connectionFields.rememberCleanupFailed
          : remember && !saved.remembered ? ui.connectionFields.rememberSaveFailed : "");
      }
      else readSessionResponse(result, "/api/session", "POST");
      const session = desktop ? await api("/api/session") : result;
      if (!mutation.isCurrent()) return;
      if (desktop && !readSessionResponse(session, "/api/session", "GET"))
        throw new ApiError(ui.apiErrors.responseUnreadable, 200, "INVALID_RESPONSE", {
          apiPath: "/api/session", apiMethod: "GET", diagnostic: ui.apiErrors.invalidSessionResponse,
        });
      const workPlanSession = readWorkPlanSession(session);
      setAnalyticsUserId(null);
      dispatch({ type: "connected", workPlanSession });
    } catch (error) {
      if (mutation.isCurrent()) {
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
      mutation.finish();
    }
  }, [fail, lifecycle]);

  const disconnect = useCallback(async () => {
    const mutation = lifecycle.beginMutation();
    if (!mutation) return;
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
      if (mutation.isCurrent()) dispatch({ type: "disconnected" });
    } catch (error) {
      if (mutation.isCurrent()) {
        fail(error, "disconnect");
        if (toRequestFailure(error, "disconnect").kind !== "session-expired") {
          setAnalyticsUserId(previousUserId);
        }
      }
    } finally {
      mutation.finish();
    }
  }, [fail, lifecycle, report]);

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
