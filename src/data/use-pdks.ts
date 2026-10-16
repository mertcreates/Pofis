"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { api, createLatestRequest } from "@/lib/api-client.js";
import { startSessionHeartbeat } from "@/lib/session-heartbeat.js";
import { addDays } from "@/domain/rules/calendar";
import type { Report } from "@/domain/report";
import { readReportResponse } from "./report-response";

export type RequestFailure = {
  message: string;
  status: number;
  code?: string;
  details?: Record<string, unknown>;
};
type Busy = "" | "session" | "report" | "connect" | "disconnect";

function requestFailure(error: unknown): RequestFailure {
  if (!(error instanceof Error))
    return { message: "İstek tamamlanamadı.", status: 0 };
  return {
    message: error.message,
    status:
      "status" in error && typeof error.status === "number" ? error.status : 0,
    code:
      "code" in error && typeof error.code === "string"
        ? error.code
        : undefined,
  };
}

function connectionState(result: unknown): boolean {
  if (
    !result ||
    typeof result !== "object" ||
    !("connected" in result) ||
    typeof result.connected !== "boolean"
  )
    throw new Error("Oturum yanıtı okunamadı.");
  return result.connected;
}
export function usePdks(week: string) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<Busy>("session");
  const [failure, setFailure] = useState<RequestFailure | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [stale, setStale] = useState(false);
  const [requests] = useState(createLatestRequest);
  const generation = useRef(0);

  const fail = useCallback(
    (error: RequestFailure) => {
      setFailure(error);
      if (error.status === 401) {
        requests.cancel();
        generation.current++;
        setConnected(false);
        setReport(null);
        setStale(false);
        setBusy("");
      }
    },
    [requests],
  );
  const onExpired = useEffectEvent(fail);
  useEffect(() => {
    if (!connected) return;
    return startSessionHeartbeat(onExpired);
  }, [connected]);

  const checkSession = useCallback(
    async (signal?: AbortSignal) => {
      setBusy("session");
      try {
        const result = await api("/api/session", { signal });
        if (signal?.aborted) return;
        setConnected(connectionState(result));
        setFailure(null);
      } catch (error) {
        if (!signal?.aborted) {
          setConnected(false);
          fail(requestFailure(error));
        }
      } finally {
        if (!signal?.aborted) setBusy("");
      }
    },
    [fail],
  );
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
    setBusy("report");
    setFailure(null);
    try {
      const result = await requests.run(
        `/api/report?${new URLSearchParams({ person: "self", from: week, to: addDays(week, 6) })}`,
      );
      if (!result || id !== generation.current) return;
      setReport(readReportResponse(result, week, addDays(week, 6)));
      setStale(false);
    } catch (error) {
      if (id !== generation.current) return;
      setStale(true);
      fail(requestFailure(error));
    } finally {
      if (id === generation.current) setBusy("");
    }
  }, [connected, week, requests, fail]);
  useEffect(() => {
    void load();
    return () => {
      requests.cancel();
      generation.current++;
    };
  }, [load, requests]);

  async function connect(form: HTMLFormElement) {
    const values = new FormData(form);
    setBusy("connect");
    setFailure(null);
    try {
      const result = await api("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.get("username"),
          password: values.get("password"),
        }),
      });
      if (!connectionState(result))
        throw new Error("PDKS bağlantısı kurulamadı.");
      setConnected(true);
    } catch (error) {
      fail(requestFailure(error));
    } finally {
      form.reset();
      setBusy("");
    }
  }
  async function disconnect() {
    setBusy("disconnect");
    try {
      await api("/api/session", { method: "DELETE" });
      requests.cancel();
      generation.current++;
      setConnected(false);
      setReport(null);
      setStale(false);
      setFailure(null);
    } catch (error) {
      fail(requestFailure(error));
    } finally {
      setBusy("");
    }
  }
  return {
    connected,
    busy,
    failure,
    stale,
    report: connected && report?.from === week ? report : null,
    connect,
    disconnect,
    refresh: load,
    checkSession,
  };
}
