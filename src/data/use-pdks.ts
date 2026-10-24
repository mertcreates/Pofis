"use client";
import { ui } from "../lib/ui-text.js";

import { useCallback, useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { api, createLatestRequest } from "@/lib/api-client.js";
import { readSessionResponse } from "@/lib/session-response.js";
import { startSessionHeartbeat } from "@/lib/session-heartbeat.js";
import { toRequestFailure, type PdksOperation } from "@/lib/pdks-failure";
import { addDays } from "@/domain/rules/calendar";
import { REPORT_ACCESS } from "@/domain/rules/report-access";
import { readReportResponse } from "./report-response";
import { initialPdksState, pdksReducer } from "./pdks-state";
import { setAnalyticsUserId } from "@/lib/analytics";
import { readAnalyticsUserId } from "@/lib/analytics-identity";
import type { NotificationReport, NotificationStatus } from "@/desktop/notification-contract";

export function usePdks(week: string, { observeDesktopSession = false } = {}) {
  const [state, dispatch] = useReducer(pdksReducer, initialPdksState);
  const { connected, report } = state;
  const [requests] = useState(createLatestRequest);
  const generation = useRef(0);
  const mutationInFlight = useRef(false);
  const desktopActive = useRef<boolean | null>(null);
  const [refreshVersion, requestRefresh] = useReducer((value: number) => value + 1, 0);

  const fail = useCallback((error: unknown, operation: PdksOperation) => {
    const failure = toRequestFailure(error, operation);
    if (failure.kind === "session-expired") {
      setAnalyticsUserId(null);
      requests.cancel();
      generation.current++;
    }
    dispatch({ type: "failed", failure });
  }, [requests]);

  const onExpired = useEffectEvent((error: unknown) => fail(error, "session"));
  const onDesktopReport = useEffectEvent((value: NotificationReport) => {
    if (observeDesktopSession && desktopActive.current === false) return;
    if (!connected || (state.busy && state.busy !== "report") || mutationInFlight.current || value.from !== week) return;
    try {
      const next = readReportResponse(value, week, addDays(week, 6));
      if (report?.from === next.from && report.to === next.to) {
        const difference = Date.parse(next.fetchedAt) - Date.parse(report.fetchedAt);
        if (difference < 0 || (difference === 0 && state.busy === "report")) return;
      }
      requests.cancel();
      generation.current++;
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
      setAnalyticsUserId(null); requests.cancel(); generation.current++;
      dispatch({ type: "session-checked", connected: false });
    });
    return () => { stopReport(); stopExpiry(); };
  }, [requests]);
  useEffect(() => {
    if (!connected) return;
    if (window.pofisNotifications) return;
    return startSessionHeartbeat(onExpired);
  }, [connected]);

  const checkSession = useCallback(async (signal?: AbortSignal) => {
    const id = ++generation.current;
    dispatch({ type: "started", operation: "session" });
    try {
      const result = await api("/api/session", { signal });
      if (signal?.aborted || id !== generation.current) return;
      const sessionConnected = readSessionResponse(result, "/api/session", "GET");
      if (!sessionConnected) setAnalyticsUserId(null);
      dispatch({ type: "session-checked", connected: sessionConnected });
      return sessionConnected;
    } catch (error) {
      if (!signal?.aborted && id === generation.current) fail(error, "session");
    }
  }, [fail]);

  const onDesktopStatus = useEffectEvent((status: NotificationStatus) => {
    if (desktopActive.current === status.active) {
      if (status.active && status.refreshError) fail(new Error(status.refreshError), "report");
      return;
    }
    desktopActive.current = status.active;
    requests.cancel();
    generation.current++;
    // Clear the previous account before checking the shared session again.
    dispatch({ type: "disconnected" });
    setAnalyticsUserId(null);
    if (status.active) void checkSession();
  });
  useEffect(() => {
    if (!observeDesktopSession || !window.pofisNotifications) return;
    return window.pofisNotifications.subscribe(onDesktopStatus);
  }, [observeDesktopSession]);

  const onVisible = useEffectEvent(async () => {
    if (document.visibilityState !== "visible" || state.busy || mutationInFlight.current) return;
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
    void checkSession(controller.signal);
    return () => {
      controller.abort();
      requests.cancel();
      generation.current++;
      setAnalyticsUserId(null);
    };
  }, [checkSession, requests]);

  const load = useCallback(async () => {
    if (!connected || mutationInFlight.current) return;
    const id = ++generation.current;
    dispatch({ type: "started", operation: "report" });
    try {
      const result = await requests.run(
        `/api/report?${new URLSearchParams({ person: REPORT_ACCESS.person, from: week, to: addDays(week, 6) })}`,
      );
      if (!result || id !== generation.current) return;
      const nextReport = readReportResponse(result, week, addDays(week, 6));
      setAnalyticsUserId(readAnalyticsUserId(result));
      dispatch({ type: "report-loaded", report: nextReport });
      if (!observeDesktopSession) void window.pofisNotifications?.refresh().catch(() => console.warn(ui.serverDiagnostics.backgroundRefreshFailed));
    } catch (error) {
      if (id === generation.current) fail(error, "report");
    }
  }, [connected, week, requests, fail, observeDesktopSession]);

  useEffect(() => {
    void load();
    return () => {
      requests.cancel();
    };
  }, [load, requests, refreshVersion]);

  const connect = useCallback(async (form: HTMLFormElement) => {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    const values = new FormData(form);
    const id = ++generation.current;
    requests.cancel();
    dispatch({ type: "started", operation: "connect" });
    try {
      const result = await api("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: values.get("username"), password: values.get("password") }),
      });
      if (id !== generation.current) return;
      readSessionResponse(result, "/api/session", "POST");
      setAnalyticsUserId(null);
      dispatch({ type: "connected" });
    } catch (error) {
      if (id === generation.current) fail(error, "connect");
    } finally {
      values.delete("username");
      values.delete("password");
      (form.elements.namedItem("password") as HTMLInputElement).value = "";
      mutationInFlight.current = false;
    }
  }, [fail, requests]);

  const disconnect = useCallback(async () => {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    const id = ++generation.current;
    requests.cancel();
    const previousUserId = readAnalyticsUserId(report);
    setAnalyticsUserId(null);
    dispatch({ type: "started", operation: "disconnect" });
    try {
      const result = await api("/api/session", { method: "DELETE" });
      readSessionResponse(result, "/api/session", "DELETE");
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
  }, [fail, requests, report]);

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
    connect, disconnect, refresh: load, checkSession, retryFailure, returnToLogin,
  };
}
