import { createRoot } from "react-dom/client";
import { usePdks } from "../use-pdks";
import { useMealMenu } from "../use-meal-menu";
import { useDesktopNotifications } from "../use-desktop-notifications";
import type { NotificationStatus, NotificationReport } from "@/desktop/notification-contract";
import { defaultNotificationPreferences } from "@/domain/rules/notifications";
import { emptyWorkPlans } from "@/domain/rules/work-plan";
import { NotificationSettings } from "@/components/notifications/settings";

const week = "2026-10-19";
const report = (name: string, at: number): NotificationReport => ({
  person: { id: "self", name, title: "", unit: "" }, from: week, to: "2026-10-25",
  fetchedAt: new Date(at).toISOString(), passages: [],
  notificationSession: { accountId: "a".repeat(64), expiresAt: Date.now() + 60_000 },
});
let source = report("initial", 1000);
let connected = true;
let hold = true;
let release: (() => void) | undefined;
let sessions = 0, reports = 0, refreshes = 0;
let mealRequests = 0, mealStatus = 502, mealCode = "MEAL_SOURCE_UNAVAILABLE";
let mealOpen = false;
let visible = false;
let holdSession = false;
let failSessionCheck = false;
let failedSessionSignal: AbortSignal | undefined;
const sessionReleases: (() => void)[] = [];
Object.defineProperty(document, "visibilityState", { get: () => visible ? "visible" : "hidden" });
const statusListeners = new Set<(value: NotificationStatus) => void>();
const reportListeners = new Set<(value: NotificationReport) => void>();
const expiryListeners = new Set<() => void>();
const scenarioListeners = new Set<() => void>();
window.pofisScenario = {
  seed: { revision: "fixture", clock: { at: 0, end: 1, startedAt: 0 }, plans: emptyWorkPlans() },
  onRefresh: fn => { scenarioListeners.add(fn); return () => { scenarioListeners.delete(fn); }; },
};
const bridge = {
  refresh: async () => { refreshes++; },
  subscribe: (fn: (value: NotificationStatus) => void) => { statusListeners.add(fn); return () => { statusListeners.delete(fn); }; },
  onReport: (fn: (value: NotificationReport) => void) => { reportListeners.add(fn); return () => { reportListeners.delete(fn); }; },
  onExpired: (fn: () => void) => { expiryListeners.add(fn); return () => { expiryListeners.delete(fn); }; },
};
window.pofisNotifications = bridge as typeof window.pofisNotifications;
window.fetch = (async (input: RequestInfo | URL, options?: RequestInit) => {
  if (String(input).startsWith("/api/meals?")) {
    mealRequests++;
    return Response.json({ error: "fixture", code: mealCode }, { status: mealStatus });
  }
  if (String(input).startsWith("/api/session")) {
    sessions++;
    if (failSessionCheck && !options?.method) {
      failSessionCheck = false;
      failedSessionSignal = options?.signal ?? undefined;
      throw new TypeError("fixture session check unavailable");
    }
    if (options?.method === "POST") connected = true;
    if (options?.method === "DELETE") connected = false;
    const snapshot = connected;
    if (holdSession) await new Promise<void>(resolve => { sessionReleases.push(resolve); });
    return Response.json({ connected: snapshot });
  }
  reports++;
  const snapshot = source;
  // Deliberately ignore AbortSignal to prove generation/cancellation also rejects a late response.
  if (hold) await new Promise<void>(resolve => { release = resolve; });
  return Response.json(snapshot);
}) as typeof window.fetch;
let state: ReturnType<typeof usePdks>;
let selectedWeek = week;
let notificationStatus: NotificationStatus | null = null;
let notificationConnectionError = "";
function MealProbe({ onSessionExpired }: { onSessionExpired: (error: unknown) => Promise<void> }) {
  const { state: meal } = useMealMenu("2026-10-20", onSessionExpired);
  return <span id="meal-probe" data-kind={meal.kind} />;
}
function Harness() {
  state = usePdks(selectedWeek, { observeDesktopSession: true });
  return <>
    <NotificationSettings visible source={{ mode: "desktop", status: notificationStatus, actions: null, error: notificationConnectionError }} />
    {mealOpen && state.connected && <MealProbe onSessionExpired={state.verifySessionAfterExpiry} />}
  </>;
}
function NotificationStateHarness() {
  const source = useDesktopNotifications(true, true, false, null);
  return <div data-notification-active={source.status ? String(source.status.active) : "pending"} data-notification-error={source.error}>
    <NotificationSettings visible source={{ ...source, mode: "desktop" }} />
  </div>;
}
const root = createRoot(document.getElementById("root")!);
root.render(<Harness />);
const wait = async (condition: () => boolean) => {
  const start = performance.now();
  while (!condition()) {
    if (performance.now() - start > 3000) throw new Error(`Timed out: ${condition}`);
    await new Promise(resolve => setTimeout(resolve, 5));
  }
};
const check = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
const emitStatus = (active: boolean, refreshError = "", recordError = "") => {
  notificationStatus = { active, refreshError, preferences: defaultNotificationPreferences(),
    telegram: { connected: false, label: "" }, nativeSupported: true, secureStorageAvailable: true,
    lastRefreshAt: null, recordError, deliveryErrors: {} };
  for (const fn of statusListeners) fn(notificationStatus);
  root.render(<Harness />);
};
const push = (value: NotificationReport) => { for (const fn of reportListeners) fn(value); };
const settle = () => new Promise(resolve => setTimeout(resolve, 30));

(window as any).runLifecycle = async () => {
  await wait(() => statusListeners.size === 1);
  emitStatus(true); await settle();
  check(sessions === 0 && reports === 0, "Hidden preload requested session/report data");
  visible = true; document.dispatchEvent(new Event("visibilitychange"));
  await wait(() => !!release && state?.busy === "report");
  push(report("pushed", 2000));
  await wait(() => state.report?.person.name === "pushed");
  release!(); hold = false;
  await settle();
  check(state.report?.person.name === "pushed", "Late HTTP response overwrote the pushed report");
  push(report("older", 1500)); await settle();
  check(state.report?.person.name === "pushed", "Older report event overwrote newer data");
  check(refreshes === 0, "Mini triggered a redundant background report request");

  const beforeScenario = { sessions, reports };
  for (const fn of scenarioListeners) fn();
  await settle();
  check(sessions === beforeScenario.sessions && reports === beforeScenario.reports,
    "Mini started an independent scenario refresh instead of following the desktop runtime");

  source = report("current", 3000);
  emitStatus(false);
  emitStatus(true);
  await wait(() => state.report?.person.name === "current");
  const recordWarning = "Bildirim kaydı yazılamadı. Dosya erişimini kontrol edip yeniden dene.";
  notificationConnectionError = "Bağlantı hatası örneği";
  emitStatus(true, "", recordWarning);
  await wait(() => document.body.textContent?.includes(recordWarning) === true);
  check(document.body.textContent?.includes(notificationConnectionError) === true, "Record error hid the connection error");
  check(!state.stale && !state.failure && state.report?.person.name === "current", "Record error changed the Mini report");
  notificationConnectionError = "";
  emitStatus(true);
  await wait(() => document.body.textContent?.includes(recordWarning) === false);
  emitStatus(true, "temporary network error");
  await wait(() => state.stale && !!state.failure);
  push(report("recovered", 4000));
  await wait(() => !state.stale && !state.failure);

  holdSession = true;
  const sessionsBefore = sessions;
  const checks = [state.checkSession(), state.checkSession()];
  await wait(() => sessionReleases.length === 1);
  visible = false; document.dispatchEvent(new Event("visibilitychange"));
  visible = true; document.dispatchEvent(new Event("visibilitychange"));
  document.dispatchEvent(new Event("visibilitychange"));
  await settle();
  check(sessions === sessionsBefore + 1, "Concurrent session checks did not share one request");
  sessionReleases.shift()!(); holdSession = false;
  await Promise.all(checks);
  await wait(() => !state.busy);
  check(state.report?.person.name === "recovered", "Session revalidation cleared the current report");

  source = report("manual refresh", 4500); hold = true; release = undefined;
  const reportsBefore = reports;
  const manual = state.refresh();
  const duplicate = state.refresh();
  await wait(() => !!release && state.busy === "report");
  check(reports === reportsBefore + 1, "Concurrent report refreshes did not share one request");
  push(report("same cached response", 4000)); await settle();
  check(state.busy === "report", "Equal cached report cancelled a newer refresh");
  release!(); hold = false; await Promise.all([manual, duplicate]);
  await wait(() => state.report?.person.name === "manual refresh");

  const before = { sessions, reports };
  visible = false; document.dispatchEvent(new Event("visibilitychange"));
  await settle();
  check(sessions === before.sessions && reports === before.reports, "Hiding requested data");
  source = report("reopened", 5000);
  visible = true; document.dispatchEvent(new Event("visibilitychange"));
  await wait(() => state.report?.person.name === "reopened");
  check(sessions === before.sessions + 1 && reports === before.reports + 1, "Reopening must revalidate once");

  hold = true; release = undefined;
  const previousWeekRequest = state.refresh();
  await wait(() => !!release);
  const releasePreviousWeek = release!;
  hold = false;
  selectedWeek = "2026-10-26";
  source = { ...report("next week", 5500), from: selectedWeek, to: "2026-11-01" };
  root.render(<Harness />);
  await wait(() => state.report?.person.name === "next week");
  releasePreviousWeek(); await previousWeekRequest;
  push(report("late previous week", 6000)); await settle();
  check(state.report?.from === selectedWeek && state.report.person.name === "next week", "Previous week response replaced the selected week");
  selectedWeek = week; source = report("current week", 6500);
  root.render(<Harness />);
  await wait(() => state.report?.person.name === "current week");

  connected = false; emitStatus(false);
  await wait(() => state.connected === false && state.report === null);
  push(report("old account", 6000)); await settle();
  check(state.report === null, "Disconnected account accepted a pushed report");
  connected = true; source = report("new account", 7000); emitStatus(true);
  await wait(() => state.report?.person.name === "new account");
  hold = true; release = undefined;
  const pending = state.refresh();
  await wait(() => !!release);
  for (const fn of expiryListeners) fn();
  await wait(() => state.connected === false);
  release!(); await pending; await settle();
  check(state.report === null, "Expired session revived a delayed report");

  holdSession = true;
  const lateSession = state.checkSession();
  await wait(() => sessionReleases.length === 1);
  for (const fn of expiryListeners) fn();
  sessionReleases.shift()!(); holdSession = false;
  await lateSession; await settle();
  check(state.connected === false && state.report === null, "Expired session revived a delayed session check");

  const form = document.createElement("form");
  hold = false;
  form.innerHTML = '<input name="username" value="fixture"><input name="password" value="fixture">';
  source = report("signed in", 8000);
  await state.connect(form);
  await wait(() => state.report?.person.name === "signed in");
  check((form.elements.namedItem("password") as HTMLInputElement).value === "", "Password was not cleared");

  const openMeal = async (status: number, code: string) => {
    mealStatus = status; mealCode = code; mealOpen = true;
    const previous = mealRequests;
    root.render(<Harness />);
    await wait(() => mealRequests > previous);
  };
  const closeMeal = async () => {
    mealOpen = false; root.render(<Harness />);
    await wait(() => !document.getElementById("meal-probe"));
  };
  const beforeSourceFailure = sessions;
  await openMeal(502, "MEAL_SOURCE_UNAVAILABLE");
  await wait(() => document.getElementById("meal-probe")?.dataset.kind === "error");
  check(sessions === beforeSourceFailure && state.connected === true, "Meal source failure changed the session");
  await closeMeal();

  failSessionCheck = true;
  await openMeal(401, "SESSION_EXPIRED");
  await wait(() => document.getElementById("meal-probe")?.dataset.kind === "error");
  check(failedSessionSignal instanceof AbortSignal && state.connected === true && state.report?.person.name === "signed in",
    "Failed meal session check did not keep the report and retryable error");
  await closeMeal();

  source = report("report during meal", 8100); hold = true; release = undefined;
  const reportDuringMeal = state.refresh();
  await wait(() => !!release && state.busy === "report");
  const beforeActiveCheck = sessions;
  await openMeal(401, "SESSION_EXPIRED");
  await wait(() => sessions === beforeActiveCheck + 1);
  await settle();
  check(state.busy === "report" && state.connected === true, "Meal session check interrupted the current report");
  release!(); hold = false; await reportDuringMeal;
  await wait(() => state.report?.person.name === "report during meal");
  await closeMeal();

  connected = false; holdSession = true;
  await openMeal(401, "SESSION_EXPIRED");
  await wait(() => sessionReleases.length === 1);
  holdSession = false;
  await state.disconnect();
  await wait(() => state.connected === false);
  await closeMeal();
  source = report("renewed after meal", 8200);
  (form.elements.namedItem("password") as HTMLInputElement).value = "fixture";
  await state.connect(form);
  await wait(() => state.report?.person.name === "renewed after meal");
  sessionReleases.shift()!(); await settle();
  check(state.connected === true && state.report?.person.name === "renewed after meal", "Old meal session check closed the new session");

  connected = false;
  await openMeal(401, "SESSION_EXPIRED");
  await wait(() => state.connected === false && state.failure?.kind === "session-expired");
  check(state.report === null, "Expired meal session retained the report");
  mealOpen = false;
  source = report("signed in again", 8300);
  (form.elements.namedItem("password") as HTMLInputElement).value = "fixture";
  await state.connect(form);
  await wait(() => state.report?.person.name === "signed in again");
  await state.disconnect();
  await wait(() => state.connected === false && state.report === null);
  root.unmount();
  check(statusListeners.size + reportListeners.size + expiryListeners.size + scenarioListeners.size === 0, "Bridge listeners leaked");

  const notificationStatus = (active: boolean): NotificationStatus => ({
    active, preferences: defaultNotificationPreferences(), telegram: { connected: false, label: "" },
    nativeSupported: true, secureStorageAvailable: true, lastRefreshAt: null,
    refreshError: "", recordError: "", deliveryErrors: {},
  });
  async function checkNotificationSnapshot(snapshot: boolean | "error", event?: boolean) {
    let listener: ((status: NotificationStatus) => void) | undefined;
    let resolveSnapshot: ((status: NotificationStatus) => void) | undefined;
    let rejectSnapshot: ((error: Error) => void) | undefined;
    window.pofisNotifications = {
      get: () => new Promise<NotificationStatus>((resolve, reject) => { resolveSnapshot = resolve; rejectSnapshot = reject; }),
      pause: async () => {},
      subscribe: (callback: (status: NotificationStatus) => void) => {
        listener = callback;
        return () => { listener = undefined; };
      },
    } as typeof window.pofisNotifications;
    const notificationRoot = createRoot(document.getElementById("root")!);
    notificationRoot.render(<NotificationStateHarness />);
    await wait(() => !!listener && !!resolveSnapshot);
    if (event !== undefined) {
      listener!(notificationStatus(event));
      await wait(() => document.querySelector("[data-notification-active]")?.getAttribute("data-notification-active") === String(event));
    }
    if (snapshot === "error") rejectSnapshot!(new Error("fixture unavailable"));
    else resolveSnapshot!(notificationStatus(snapshot));
    await settle();
    const expected = event ?? (typeof snapshot === "boolean" ? snapshot : null);
    check(document.querySelector("[data-notification-active]")?.getAttribute("data-notification-active") === (expected === null ? "pending" : String(expected)),
      "A delayed initial notification status replaced a newer event");
    check(!!document.querySelector(".notification-settings") === (expected === true), "Notification settings do not match the current status");
    if (snapshot === "error")
      check(!!document.querySelector("[data-notification-error]")?.getAttribute("data-notification-error") === (event === undefined),
        "Initial notification error visibility does not match the current status");
    notificationRoot.unmount();
    check(!listener, "Notification status listener leaked");
  }
  await checkNotificationSnapshot(true);
  await checkNotificationSnapshot(false, true);
  await checkNotificationSnapshot(true, false);
  await checkNotificationSnapshot("error", true);
  await checkNotificationSnapshot("error");
  return { reportRace: true, olderPush: true, backgroundFailureRecovery: true, revalidateOnShow: true,
    weekChange: true, accountSwitch: true, lateExpiry: true, cleanup: true, redundantRefreshes: refreshes,
    hiddenPreload: true, sharedRequests: true, lateSession: true, connectDisconnect: true, recordFailureIsolated: true,
    mealSessionRecovery: true, notificationStatusRace: true };
};
