import { api } from "@/lib/api-client.js";
import { readStoredPlans } from "@/lib/plan-storage.js";
import { isSessionExpired } from "@/lib/pdks-failure";
import { ui } from "@/lib/ui-text.js";
import { changeIndependentWeek, type IndependentWeekPlan, type WorkPlans } from "@/domain/rules/work-plan";

export type DesktopPlanSnapshot = { plans: WorkPlans; revision: string; session: string };
export type DesktopPlanState = { snapshot: DesktopPlanSnapshot | null; saving: boolean; error: string };
type Request = (path: string, options?: RequestInit) => Promise<unknown>;

class PlanSessionChanged extends Error {}

export function readDesktopPlanSnapshot(value: unknown, expectedSession: string): DesktopPlanSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(ui.desktopPlanReadError);
  const { plans, revision, session } = value as Record<string, unknown>;
  if (typeof session !== "string" || !/^[a-f0-9]{64}$/.test(session) ||
      typeof revision !== "string" || !/^[a-f0-9]{64}$/.test(revision))
    throw new Error(ui.desktopPlanReadError);
  if (session !== expectedSession) throw new PlanSessionChanged();
  return { plans: readStoredPlans(JSON.stringify(plans)), revision, session };
}

/** One instance belongs to one authenticated session and one renderer. */
export function createDesktopWorkPlans({ session, receive, onSaved, onSessionChanged, request = api }: {
  session: string;
  receive(state: DesktopPlanState): void;
  onSaved(): void;
  onSessionChanged(): void;
  request?: Request;
}) {
  let state: DesktopPlanState = { snapshot: null, saving: false, error: "" };
  let active = true;
  let readVersion = 0;
  let reloadAfterSave = false;
  let readController: AbortController | null = null;
  let independentWeek: IndependentWeekPlan | undefined;
  let independentDirty = false;
  let independentWriting = false;

  async function flushIndependentWeek() {
    if (!active || independentWriting || state.saving || !state.snapshot || !independentDirty) return;
    independentWriting = true;
    independentDirty = false;
    const value = independentWeek!;
    const saved = await save(plans => changeIndependentWeek(plans, value));
    independentWriting = false;
    if (saved) {
      if (independentDirty) void flushIndependentWeek();
      else independentWeek = undefined;
    }
  }

  function publish(next: DesktopPlanState) {
    state = next;
    if (active) receive(next);
  }

  async function reload(keepError = false) {
    if (!active) return;
    if (state.saving) { reloadAfterSave = true; return; }
    const version = ++readVersion;
    readController?.abort();
    const controller = new AbortController();
    readController = controller;
    if (!state.snapshot && state.error) publish({ ...state, error: "" });
    try {
      const value = await request("/api/work-plans", { signal: controller.signal });
      if (!active || version !== readVersion || controller.signal.aborted) return;
      const snapshot = readDesktopPlanSnapshot(value, session);
      publish({ snapshot, saving: false, error: keepError ? state.error : "" });
    } catch (error) {
      if (!active || version !== readVersion || controller.signal.aborted) return;
      publish({ snapshot: null, saving: false, error: ui.desktopPlanReadError });
      if (error instanceof PlanSessionChanged || isSessionExpired(error))
        onSessionChanged();
    } finally {
      if (readController === controller) readController = null;
    }
  }

  async function save(update: (plans: WorkPlans) => WorkPlans): Promise<boolean> {
    if (!active || state.saving || !state.snapshot) return false;
    const previous = state.snapshot;
    ++readVersion;
    readController?.abort();
    publish({ ...state, saving: true });
    try {
      const plans = update(previous.plans);
      const value = await request("/api/work-plans", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans, revision: previous.revision, session: previous.session }),
      });
      if (!active) return false;
      const snapshot = readDesktopPlanSnapshot(value, session);
      publish({ snapshot, saving: false, error: "" });
      try { onSaved(); }
      catch { console.warn(ui.desktopPlanReadError); }
      return true;
    } catch (error) {
      if (!active) return false;
      const code = (error as { code?: string })?.code;
      if (error instanceof PlanSessionChanged || code === "PLAN_SESSION_CHANGED" || isSessionExpired(error)) {
        publish({ snapshot: null, saving: false, error: ui.desktopPlanReadError });
        onSessionChanged();
      } else {
        publish({ snapshot: previous, saving: false,
          error: code === "PLAN_CONFLICT" ? ui.desktopPlanConflict : ui.desktopPlanWriteError });
        if (code === "PLAN_CONFLICT") reloadAfterSave = true;
      }
      return false;
    } finally {
      if (active && reloadAfterSave) {
        reloadAfterSave = false;
        void reload(Boolean(state.error));
      }
      if (!independentWriting) void flushIndependentWeek();
    }
  }

  return {
    reload,
    save,
    independentWeek: () => independentWeek ?? state.snapshot?.plans.independentWeek,
    setIndependentWeek(value: IndependentWeekPlan) {
      if (!active || !state.snapshot) return;
      independentWeek = value;
      independentDirty = true;
      publish({ ...state });
      void flushIndependentWeek();
    },
    stop() {
      active = false;
      ++readVersion;
      readController?.abort();
      readController = null;
    },
  };
}
