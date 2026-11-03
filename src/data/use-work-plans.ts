"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { savePlans, serializePlans } from "@/lib/plan-storage.js";
import { subscribeWorkPlans, workPlanStorage, type PlanScope } from "./work-plans";
import { createDesktopWorkPlans } from "./desktop-work-plans";
import {
  emptyWorkPlans, hasSpecialWeek, resolveStoredPlan, resolveStoredTarget, resolveLeaveDays, resolveZeroOpenDays, resolveUserLockedDays, resolveWeekTimes, changeWeekTime, changeWeekLockedDays, changeWeekPlan, changeDefaultPlan,
  type WorkPlan, type WorkPlans, type PlanTime,
} from "@/domain/rules/work-plan";
import { ui } from "@/lib/ui-text.js";

type PlanSession = {
  connected: boolean | null;
  busy: string;
  workPlanSession: string | null;
  sessionFailed: boolean;
  checkSession(): Promise<boolean | undefined>;
};
type PlanState = {
  mode: "local" | "desktop" | null;
  scope: PlanScope;
  session: string | null;
  plans: WorkPlans;
  ready: boolean;
  saving: boolean;
  error: string;
};

export function useWorkPlans(week: string, scope: PlanScope = "live", session?: PlanSession) {
  const [mode, setMode] = useState<PlanState["mode"]>(null);
  const [state, setState] = useState<PlanState>(() => ({
    mode: null, scope, session: null, plans: emptyWorkPlans(), ready: false, saving: false, error: "",
  }));
  const latest = useRef(state.plans);
  const desktop = useRef<{ session: string; client: ReturnType<typeof createDesktopWorkPlans> } | null>(null);
  const binding = session?.connected && !["session", "connect", "disconnect"].includes(session.busy) && !session.sessionFailed
    ? session.workPlanSession : null;
  const checkSession = session?.checkSession;

  useEffect(() => {
    setMode(scope === "live" && window.pofisRememberedSession && !window.pofisScenario ? "desktop" : "local");
  }, [scope]);

  useEffect(() => {
    if (mode !== "local") return;
    setState(current => ({ ...current, mode, scope, session: null, ready: false, saving: false, error: "" }));
    return subscribeWorkPlans(scope, plans => {
      latest.current = plans;
      setState({ mode, scope, session: null, plans, ready: true, saving: false, error: "" });
    }, error => {
      setState(current => ({ ...current, mode, scope, session: null, ready: false, saving: false,
        error: error instanceof Error && error.message.includes("korunuyor") ? error.message : ui.storageReadError }));
    });
  }, [mode, scope]);

  useEffect(() => {
    if (mode !== "desktop" || !binding) return;
    let active = true;
    let channel: BroadcastChannel | null = null;
    try { channel = new BroadcastChannel("pofis:work-plans:changed"); }
    catch { console.warn(ui.desktopPlanReadError); }
    const current = createDesktopWorkPlans({
      session: binding,
      receive(next) {
        if (!active) return;
        const plans = next.snapshot?.plans ?? emptyWorkPlans();
        latest.current = plans;
        setState({ mode, scope, session: binding, plans, ready: next.snapshot !== null, saving: next.saving, error: next.error });
      },
      onSaved() {
        try { channel?.postMessage("changed"); }
        catch { console.warn(ui.desktopPlanReadError); }
      },
      onSessionChanged() { void checkSession?.(); },
    });
    desktop.current = { session: binding, client: current };
    if (channel) channel.onmessage = event => { if (event.data === "changed") void current.reload(); };
    const onVisible = () => { if (document.visibilityState === "visible") void current.reload(); };
    document.addEventListener("visibilitychange", onVisible);
    void current.reload();
    return () => {
      active = false;
      current.stop();
      if (desktop.current?.client === current) desktop.current = null;
      channel?.close();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mode, scope, binding, checkSession]);

  // A render for a new session must never expose the previous session's plan.
  const matches = state.mode === mode && state.scope === scope &&
    (mode === "local" || (mode === "desktop" && binding !== null && state.session === binding));
  const ready = matches && state.ready;
  const plans = ready ? state.plans : emptyWorkPlans();
  const serialized = useMemo(() => ready ? serializePlans(state.plans) : null, [ready, state.plans]);
  const saving = matches && state.saving;
  const error = matches ? state.error : "";

  function retryRead() {
    const current = desktop.current;
    if (mode === "desktop" && current && current.session === binding)
      return current.client.reload();
  }

  async function persist(update: (current: WorkPlans) => WorkPlans): Promise<boolean> {
    if (!ready || saving) return false;
    if (mode === "desktop") {
      const current = desktop.current;
      if (!current || current.session !== binding) return false;
      return current.client.save(update);
    }
    if (mode !== "local") return false;
    const next = update(latest.current);
    try {
      savePlans(workPlanStorage(localStorage, scope), next);
      latest.current = next;
      setState({ mode, scope, session: null, plans: next, ready: true, saving: false, error: "" });
      return true;
    } catch {
      setState(current => ({ ...current, error: ui.storageWriteError }));
      return false;
    }
  }

  return {
    plan: resolveStoredPlan(plans, week),
    serialized,
    session: mode === "desktop" && ready ? binding : null,
    targetSeconds: resolveStoredTarget(plans, week),
    defaultPlan: plans.defaultPlan,
    leaveDays: resolveLeaveDays(plans, week),
    zeroOpenDays: resolveZeroOpenDays(plans, week),
    userLockedDays: resolveUserLockedDays(plans, week),
    times: resolveWeekTimes(plans, week),
    special: hasSpecialWeek(plans, week),
    ready,
    saving,
    error,
    retryRead: mode === "desktop" && binding ? retryRead : undefined,
    save: (plan: WorkPlan, completed: readonly (number | null)[], targetSeconds?: number, leaveDays?: readonly number[]) => persist(current => changeWeekPlan(current, week, plan, completed, targetSeconds, leaveDays)),
    saveDefault: (plan: WorkPlan, completed: readonly (number | null)[] = []) => persist(current => changeDefaultPlan(current, plan, week, completed)),
    reset: (completed: readonly (number | null)[] = []) => persist(current => changeWeekPlan(current, week, null, completed)),
    setLockedDays: (days: readonly number[], plan: WorkPlan) => persist(current => changeWeekLockedDays(current, week, days, plan)),
    setTime: (day: number, time: PlanTime | null) => persist(current => changeWeekTime(current, week, day, time)),
  };
}
