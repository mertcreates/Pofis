import { expect, test } from "bun:test";
import { startSessionHeartbeat } from "./session-heartbeat.js";

test.each([
  ["expired", 401, { error: "fixture", code: "SESSION_EXPIRED" }, true],
  ["wrong-status", 500, { error: "fixture", code: "SESSION_EXPIRED" }, false],
  ["credentials", 401, { error: "fixture", code: "AUTH_FAILED" }, false],
  ["malformed", 401, {}, false],
  ["invalid-success", 200, { connected: false }, false],
  ["success", 200, { connected: true }, false],
  ["network", 0, {}, false],
])("heartbeat %s yalnız doğrulanmış oturum bitişini bildirir", async (scenario, status, body, expired) => {
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const document = new EventTarget();
  const window = new EventTarget();
  Object.defineProperty(globalThis, "document", { value: document, configurable: true });
  Object.defineProperty(globalThis, "window", { value: window, configurable: true });
  let stop;
  let calls = 0;
  const failures = [];
  try {
    stop = startSessionHeartbeat(error => failures.push(error), async () => {
      calls++;
      if (scenario === "network") throw new TypeError("fixture offline");
      return Response.json(body, { status });
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(failures).toHaveLength(expired ? 1 : 0);
    window.dispatchEvent(new Event("pageshow"));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(calls).toBe(expired ? 1 : 2);
  } finally {
    stop?.();
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor); else delete globalThis.document;
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor); else delete globalThis.window;
  }
});
