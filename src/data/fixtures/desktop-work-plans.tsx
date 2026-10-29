import { createRoot } from "react-dom/client";
import { PlanTimePlanner } from "@/components/plan-time-planner";
import { useWorkPlans } from "../use-work-plans";
import { emptyWorkPlans, readDayPlan, type WorkPlans } from "@/domain/rules/work-plan";
import { ui } from "@/lib/ui-text.js";

const firstA = "a".repeat(64), secondA = "c".repeat(64), accountB = "b".repeat(64);
const revision1 = "1".repeat(64), revision2 = "2".repeat(64);
const week = "2026-10-19";
const adjusted = readDayPlan([420, 420, 420, 420, 420, 0, 0])!;
const accounts: Record<string, { plans: WorkPlans; revision: string }> = {
  A: { plans: emptyWorkPlans(), revision: revision1 },
  B: { plans: emptyWorkPlans(), revision: revision1 },
};
const accountFor = (session: string) => session === accountB ? "B" : "A";
let serverSession = firstA;
let selectedSession = firstA;
let holdReads = false;
let failReads = false;
let failWrites = false;
const heldReads: (() => void)[] = [];
const trace: { binding: string; ready: boolean; session: string | null }[] = [];
let puts = 0;

window.pofisRememberedSession = {} as typeof window.pofisRememberedSession;
Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
localStorage.setItem("pofis:work-plans:v1", JSON.stringify({ ...emptyWorkPlans(), defaultPlan: [300, 300, 300, 300, 300, 0, 0] }));
window.fetch = (async (input: RequestInfo | URL, options?: RequestInit) => {
  if (String(input) !== "/api/work-plans") throw new Error("Unexpected fixture request");
  const session = serverSession;
  const account = accounts[accountFor(session)];
  if (!options?.method && failReads)
    return Response.json({ code: "PLAN_READ_FAILED", error: "fixture" }, { status: 500 });
  if (options?.method === "PUT") {
    puts++;
    if (failWrites) return Response.json({ code: "PLAN_WRITE_FAILED", error: "fixture" }, { status: 500 });
    const body = JSON.parse(String(options.body));
    if (body.session !== session) return Response.json({ code: "PLAN_SESSION_CHANGED", error: "fixture" }, { status: 409 });
    if (body.revision !== account.revision) return Response.json({ code: "PLAN_CONFLICT", error: "fixture" }, { status: 409 });
    account.plans = body.plans;
    account.revision = revision2;
  }
  const value = { ...account, session };
  // An old read can return even when its AbortSignal is cancelled.
  if (!options?.method && holdReads && session === firstA)
    await new Promise<void>(resolve => heldReads.push(resolve));
  return Response.json(value);
}) as typeof window.fetch;

const checkSession = async () => true;
let main!: ReturnType<typeof useWorkPlans>;
let mini!: ReturnType<typeof useWorkPlans>;
let demo!: ReturnType<typeof useWorkPlans>;
function Harness() {
  const session = { connected: true, busy: "", workPlanSession: selectedSession, sessionFailed: false, checkSession };
  main = useWorkPlans(week, "live", session);
  mini = useWorkPlans(week, "live", session);
  demo = useWorkPlans(week, "demo");
  trace.push({ binding: selectedSession, ready: main.ready, session: main.session });
  trace.push({ binding: selectedSession, ready: mini.ready, session: mini.session });
  return <div>
    <div>{main.ready ? main.plan[0] : "pending"} / {mini.ready ? mini.plan[0] : "pending"}</div>
    <button id="outside">Outside</button>
    {main.ready && <PlanTimePlanner id="clock" day={0} seconds={8 * 3600} time={main.times[0]}
      disabled={main.saving} onCommit={value => main.setTime(0, value)} />}
  </div>;
}
const root = createRoot(document.getElementById("root")!);
const render = () => root.render(<Harness />);
render();
const wait = async (condition: () => boolean) => {
  const start = performance.now();
  while (!condition()) {
    if (performance.now() - start > 4000) throw new Error(`Timed out: ${condition}`);
    await new Promise(resolve => setTimeout(resolve, 5));
  }
};
const check = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };

(window as unknown as { runLifecycle(): Promise<object> }).runLifecycle = async () => {
  await wait(() => main.ready && mini.ready && demo.ready);
  check(main.plan[0] === 480 && mini.plan[0] === 480, "Legacy local plan was applied to the account");

  const exitChoice = Array.from(document.querySelectorAll<HTMLButtonElement>("#clock button"))
    .find(button => button.textContent === ui.planner.toExit)!;
  exitChoice.click();
  await wait(() => exitChoice.getAttribute("aria-pressed") === "true");
  check(await mini.setTime(0, { anchor: "entry", minute: 540 }), "Other window did not save the time");
  await wait(() => main.times[0]?.minute === 540);
  const hour = () => document.querySelector<HTMLInputElement>("#clock input[aria-label$=', Saat']")!;
  const minute = () => document.querySelector<HTMLInputElement>("#clock input[aria-label$=', Dakika']")!;
  await wait(() => hour()?.value === "09" && minute()?.value === "00");
  const putsAfterExternalSave = puts;
  document.querySelector<HTMLButtonElement>("#outside")!.focus();
  await new Promise(resolve => setTimeout(resolve, 40));
  check(puts === putsAfterExternalSave && accounts.A.plans.weekTimes?.[week]?.[0]?.minute === 540,
    "Leaving the untouched planner overwrote the other window's time");

  hour().focus();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(hour(), "10");
  hour().dispatchEvent(new Event("input", { bubbles: true }));
  await wait(() => hour().value === "10");
  check(await mini.setTime(0, { anchor: "exit", minute: 1110 }), "Other window did not update the time");
  await wait(() => main.times[0]?.minute === 1110);
  check(hour().value === "10" && minute().value === "00", "External update replaced an unfinished draft");
  hour().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await wait(() => hour().value === "18" && minute().value === "30");

  failWrites = true;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(hour(), "19");
  hour().dispatchEvent(new Event("input", { bubbles: true }));
  await wait(() => hour().value === "19");
  minute().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await wait(() => main.error === ui.desktopPlanWriteError);
  check(hour().value === "19" && minute().value === "30" && main.times[0]?.minute === 1110,
    "Failed time save lost the draft or changed the saved time");
  failWrites = false;
  hour().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await wait(() => hour().value === "18" && minute().value === "30");

  check(await main.saveDefault(adjusted), "A's plan was not saved");
  await wait(() => main.plan[0] === 420 && mini.plan[0] === 420);

  failReads = true;
  document.dispatchEvent(new Event("visibilitychange"));
  await wait(() => main.error === ui.desktopPlanReadError && mini.error === ui.desktopPlanReadError);
  check(!main.ready && !mini.ready, "A failed read left the old plan active");
  failReads = false;
  check(Boolean(main.retryRead && mini.retryRead), "Plan retry is unavailable");
  await main.retryRead?.(); await mini.retryRead?.();
  await wait(() => main.ready && mini.ready && !main.error && !mini.error);
  check(main.plan[0] === 420 && mini.plan[0] === 420, "Retry did not restore the saved plan");

  const putsBeforeDemo = puts;
  check(await demo.saveDefault(readDayPlan([360, 360, 360, 360, 360, 0, 0])!), "Demo save failed");
  check(puts === putsBeforeDemo, "Demo was written to the desktop server");

  failWrites = true;
  check(!(await main.saveDefault(readDayPlan([300, 300, 300, 300, 300, 0, 0])!)), "Failed write was reported as successful");
  await wait(() => main.error === ui.desktopPlanWriteError);
  check(main.ready && main.plan[0] === 420, "Failed write replaced the last successful plan");
  failWrites = false;

  holdReads = true;
  document.dispatchEvent(new Event("visibilitychange"));
  await wait(() => heldReads.length >= 2);
  selectedSession = serverSession = accountB;
  holdReads = false;
  render();
  await wait(() => main.ready && mini.ready && main.session === accountB && mini.session === accountB);
  check(main.plan[0] === 480 && mini.plan[0] === 480, "B received A's plan");
  for (const release of heldReads) release();
  await new Promise(resolve => setTimeout(resolve, 40));
  check(main.plan[0] === 480 && mini.plan[0] === 480, "Late A read replaced B's plan");
  check(trace.every(value => !value.ready || value.binding === value.session), "A previous session was rendered ready");

  selectedSession = serverSession = secondA;
  render();
  await wait(() => main.ready && mini.ready && main.session === secondA && mini.session === secondA);
  check(main.plan[0] === 420 && mini.plan[0] === 420, "A's saved plan was not restored");
  check(demo.plan[0] === 360, "Account switching changed the demo plan");
  root.unmount();
  return { accountSwitch: true, legacyIgnored: true, crossWindow: true, failedWrite: true, delayedRead: true, demoIsolated: true, retryRead: true, timeDraftSync: true, timeFailedWrite: true };
};
