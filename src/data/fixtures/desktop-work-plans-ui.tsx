import { createRoot } from "react-dom/client";
import { Dashboard } from "@/components/dashboard";
import { MiniDashboard } from "@/components/mini/mini-dashboard";
import { defaultNotificationPreferences } from "@/domain/rules/notifications";
import { emptyWorkPlans } from "@/domain/rules/work-plan";
import { ui } from "@/lib/ui-text.js";

const session = "a".repeat(64);
const revision = "b".repeat(64);
let failReads = true;
let holdReads = false;
let releaseRead: (() => void) | undefined;

Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
window.pofisRememberedSession = {
  onRecovered: () => () => {}, onInvalid: () => () => {},
  recover: async () => ({ ok: true, value: false }),
} as unknown as typeof window.pofisRememberedSession;
window.pofisNotifications = {
  get: async () => ({
    active: false, preferences: defaultNotificationPreferences(),
    telegram: { connected: false, label: "" }, nativeSupported: true,
    secureStorageAvailable: true, lastRefreshAt: null, refreshError: "", recordError: "", deliveryErrors: {},
  }),
  subscribe: () => () => {}, onReport: () => () => {}, onExpired: () => () => {},
  pause: async () => {}, sync: async () => {}, refresh: async () => {},
} as unknown as typeof window.pofisNotifications;
window.pofisMini = {
  get: async () => ({ pinned: false }), pin: async () => ({ pinned: true }),
  openMain: async () => {}, resize: async () => {},
};
window.fetch = (async (input: RequestInfo | URL) => {
  const path = String(input);
  if (path === "/api/session") return Response.json({ connected: true, workPlanSession: session });
  if (path.startsWith("/api/report?")) {
    const query = new URL(path, "http://localhost").searchParams;
    return Response.json({
      person: { id: "self", name: "Fixture", title: "", unit: "" },
      from: query.get("from"), to: query.get("to"), fetchedAt: new Date().toISOString(), passages: [],
      notificationSession: { accountId: "c".repeat(64), expiresAt: Date.now() + 60_000, workPlanSession: session },
    });
  }
  if (path === "/api/work-plans") {
    if (failReads) return Response.json({ code: "PLAN_READ_FAILED", error: "fixture" }, { status: 500 });
    if (holdReads) await new Promise<void>(resolve => { releaseRead = resolve; });
    return Response.json({ plans: emptyWorkPlans(), revision, session });
  }
  throw new Error(`Unexpected fixture request: ${path}`);
}) as typeof window.fetch;

const mainElement = document.getElementById("main")!;
const miniElement = document.getElementById("mini")!;
const main = createRoot(mainElement);
const mini = createRoot(miniElement);
main.render(<Dashboard initialNow={Date.now()} />);
mini.render(<MiniDashboard initialNow={Date.now()} />);

const wait = async (condition: () => boolean) => {
  const start = performance.now();
  while (!condition()) {
    if (performance.now() - start > 4000) throw new Error(`Timed out: ${condition}`);
    await new Promise(resolve => setTimeout(resolve, 5));
  }
};
const retry = (element: HTMLElement) => Array.from(element.querySelectorAll("button"))
  .find(button => button.textContent === ui.desktopPlanRetry);
const hasError = (element: HTMLElement) => element.textContent?.includes(ui.desktopPlanReadError) === true;

(window as unknown as { runLifecycle(): Promise<object> }).runLifecycle = async () => {
  await wait(() => hasError(mainElement) && hasError(miniElement) && !!retry(mainElement) && !!retry(miniElement));
  failReads = false;
  holdReads = true;
  retry(mainElement)!.click();
  await wait(() => !!releaseRead && !hasError(mainElement) && !!mainElement.querySelector(".loading-state"));
  if (!hasError(miniElement)) throw new Error("Main retry changed Mini before its own retry");
  holdReads = false;
  releaseRead!();
  releaseRead = undefined;
  await wait(() => !!mainElement.querySelector(".dashboard") && !hasError(mainElement));

  holdReads = true;
  retry(miniElement)!.click();
  await wait(() => !!releaseRead && !hasError(miniElement) &&
    miniElement.querySelector('[role="status"]')?.textContent === ui.desktop.miniLoading);
  holdReads = false;
  releaseRead!();
  await wait(() => !!miniElement.querySelector(".pofi-mini-today, .pofi-mini-summary") && !hasError(miniElement));
  main.unmount();
  mini.unmount();
  return { mainRetry: true, miniRetry: true };
};
