"use client";

import { useCallback, useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { api, ApiError, createLatestRequest } from "@/lib/api-client.js";
import { startSessionHeartbeat } from "@/lib/session-heartbeat.js";
import { toRequestFailure, type PdksOperation } from "@/lib/pdks-failure";
import { addDays } from "@/domain/rules/calendar";
import { readReportResponse } from "./report-response";
import { initialPdksState, pdksReducer } from "./pdks-state";
import { ui } from "@/lib/ui-text.js";

export type { RequestFailure } from "@/lib/pdks-failure";

function connectionState(result: unknown): boolean {
  if (!result || typeof result !== "object" || !("connected" in result)
    || typeof result.connected !== "boolean")
    throw new ApiError(ui.apiErrors.responseUnreadable, 200, "INVALID_RESPONSE", {
      apiPath: "/api/session", diagnostic: "Oturum yanıtında connected alanı okunamadı.",
    });
  return result.connected;
}

export function usePdks(week: string) {
  const [state, dispatch] = useReducer(pdksReducer, initialPdksState);
  const { connected, report } = state;
  const [requests] = useState(createLatestRequest);
  const generation = useRef(0);
  const mutationInFlight = useRef(false);

  const fail = useCallback((error: unknown, operation: PdksOperation) => {
    const failure = toRequestFailure(error, operation);
    if (failure.kind === "session-expired") {
      requests.cancel();
      generation.current++;
    }
    dispatch({ type: "failed", failure });
  }, [requests]);

  const onExpired = useEffectEvent((error: unknown) => fail(error, "session"));
  useEffect(() => {
    if (!connected) return;
    return startSessionHeartbeat(onExpired);
  }, [connected]);

  const checkSession = useCallback(async (signal?: AbortSignal) => {
    const id = ++generation.current;
    dispatch({ type: "started", operation: "session" });
    try {
      const result = await api("/api/session", { signal });
      if (signal?.aborted || id !== generation.current) return;
      dispatch({ type: "session-checked", connected: connectionState(result) });
    } catch (error) {
      if (!signal?.aborted && id === generation.current) fail(error, "session");
    }
  }, [fail]);

  useEffect(() => {
    const controller = new AbortController();
    void checkSession(controller.signal);
    return () => {
      controller.abort();
      requests.cancel();
      generation.current++;
    };
  }, [checkSession, requests]);

  const load = useCallback(async () => {
    if (!connected) return;
    const id = ++generation.current;
    dispatch({ type: "started", operation: "report" });
    try {
      const result = await requests.run(
        `/api/report?${new URLSearchParams({ person: "self", from: week, to: addDays(week, 6) })}`,
      );
      if (!result || id !== generation.current) return;
      dispatch({ type: "report-loaded", report: readReportResponse(result, week, addDays(week, 6)) });
    } catch (error) {
      if (id === generation.current) fail(error, "report");
    }
  }, [connected, week, requests, fail]);

  useEffect(() => {
    void load();
    return () => {
      requests.cancel();
      generation.current++;
    };
  }, [load, requests]);

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
      if (!connectionState(result))
        throw new ApiError(ui.apiErrors.requestFailed, 200, "INVALID_RESPONSE", {
          apiPath: "/api/session", apiMethod: "POST",
          diagnostic: "Başarılı giriş yanıtı bağlantıyı doğrulamadı.",
        });
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
    dispatch({ type: "started", operation: "disconnect" });
    try {
      await api("/api/session", { method: "DELETE" });
      if (id === generation.current) dispatch({ type: "disconnected" });
    } catch (error) {
      if (id === generation.current) fail(error, "disconnect");
    } finally {
      mutationInFlight.current = false;
    }
  }, [fail, requests]);

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
