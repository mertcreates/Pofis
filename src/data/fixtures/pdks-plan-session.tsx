import { createRoot } from "react-dom/client";
import { usePdks } from "../use-pdks";
import type { NotificationReport } from "@/desktop/notification-contract";

const first = "a".repeat(64), second = "b".repeat(64);
const week = "2026-10-19";
let serverSession = first;
let reportSession: string | undefined = first;
const listeners = new Set<(report: NotificationReport) => void>();
const report = (name: string, session: string | undefined, at: number): NotificationReport => ({
  person: { id: "self", name, title: "", unit: "" }, from: week, to: "2026-10-25",
  fetchedAt: new Date(at).toISOString(), passages: [],
  notificationSession: { accountId: "d".repeat(64), expiresAt: Date.now() + 60_000,
    ...(session ? { workPlanSession: session } : {}) },
});
window.pofisRememberedSession = {
  onRecovered: () => () => {}, onInvalid: () => () => {},
  recover: async () => ({ ok: true, value: false }),
} as unknown as typeof window.pofisRememberedSession;
window.pofisNotifications = {
  onReport: (fn: (report: NotificationReport) => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
  onExpired: () => () => {}, refresh: async () => {},
} as unknown as typeof window.pofisNotifications;
window.fetch = (async (input: RequestInfo | URL) => {
  if (String(input) === "/api/session") return Response.json({ connected: true, workPlanSession: serverSession });
  if (String(input).startsWith("/api/report?"))
    return Response.json(report(serverSession === first ? "A" : "B", reportSession, 1000));
  throw new Error("Unexpected fixture request");
}) as typeof window.fetch;
let state!: ReturnType<typeof usePdks>;
function Harness() {
  state = usePdks(week);
  return <div>{state.report?.person.name ?? "pending"}</div>;
}
const root = createRoot(document.getElementById("root")!);
root.render(<Harness />);
const wait = async (condition: () => boolean) => {
  const start = performance.now();
  while (!condition()) {
    if (performance.now() - start > 4000) throw new Error(`Timed out: ${condition}`);
    await new Promise(resolve => setTimeout(resolve, 5));
  }
};
const check = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
const push = (value: NotificationReport) => { for (const listener of listeners) listener(value); };

(window as unknown as { runLifecycle(): Promise<object> }).runLifecycle = async () => {
  await wait(() => state.workPlanSession === first && state.report?.person.name === "A");
  serverSession = reportSession = second;
  await state.checkSession();
  await wait(() => state.workPlanSession === second && state.report?.person.name === "B");
  push(report("stale A", first, 2000));
  push(report("missing session", undefined, 3000));
  await new Promise(resolve => setTimeout(resolve, 30));
  check(state.report?.person.name === "B", "An old or unbound desktop report reached the current session");
  reportSession = first;
  await state.refresh();
  await wait(() => state.failure?.code === "INVALID_RESPONSE");
  check(state.report?.person.name === "B" && state.stale, "A mismatched HTTP report replaced B's report");
  root.unmount();
  return { switched: true, stalePushRejected: true, unboundPushRejected: true, mismatchedHttpRejected: true };
};
