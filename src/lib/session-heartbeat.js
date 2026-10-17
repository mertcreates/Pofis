import { SESSION_POLICY } from "../domain/rules/session-policy";
import { api } from "./api-client.js";
import { toRequestFailure } from "./pdks-failure";
import { readSessionResponse } from "./session-response.js";

export function startSessionHeartbeat(onExpired, fetchImpl = fetch) {
  let stopped = false;
  let inFlight = false;
  let controller;

  async function send() {
    if (stopped || inFlight) return;
    inFlight = true;
    controller = new AbortController();
    try {
      const result = await api(
        "/api/session/heartbeat",
        {
          method: "POST",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(SESSION_POLICY.heartbeatTimeoutMs),
          ]),
        },
        fetchImpl,
      );
      readSessionResponse(result, "/api/session/heartbeat", "POST");
    } catch (error) {
      if (!stopped && toRequestFailure(error, "session").kind === "session-expired") {
        stop();
        onExpired(error);
      }
      // A temporary local connection failure leaves the report intact; the server lease expires.
    } finally {
      controller = undefined;
      inFlight = false;
    }
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    controller?.abort();
    document.removeEventListener("visibilitychange", send);
    window.removeEventListener("pageshow", send);
  }

  const timer = setInterval(send, SESSION_POLICY.heartbeatMs);
  document.addEventListener("visibilitychange", send);
  window.addEventListener("pageshow", send);
  send();
  return stop;
}
