"use client";
import { useEffect, useRef, useState } from "react";
import { savePlans } from "@/lib/plan-storage.js";
import { readWorkPlans, workPlanStorage, type PlanScope } from "./work-plans";
import {
  emptyWorkPlans, resolveStoredPlan, resolveStoredTarget, changeWeekPlan, changeDefaultPlan,
  type WorkPlan, type WorkPlans,
} from "@/domain/rules/work-plan";
import { ui } from "@/lib/ui-text.js";

export function useWorkPlans(week: string, scope: PlanScope = "live") {
  const [plans, setPlans] = useState<WorkPlans>(emptyWorkPlans);
  const latest = useRef(plans);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setReady(false);
    try {
      const loaded = readWorkPlans(workPlanStorage(localStorage, scope));
      latest.current = loaded;
      setPlans(loaded);
      setReady(true);
      setError("");
    } catch (error) {
      setError(error instanceof Error && error.message.includes("korunuyor") ? error.message : ui.storageReadError);
    }
  }, [scope]);
  function persist(update: (current: WorkPlans) => WorkPlans) {
    if (!ready) return false;
    const next = update(latest.current);
    try {
      savePlans(workPlanStorage(localStorage, scope), next);
      latest.current = next;
      setPlans(next);
      setError("");
      return true;
    } catch {
      setError(ui.storageWriteError);
      return false;
    }
  }
  return {
    plan: resolveStoredPlan(plans, week),
    targetSeconds: resolveStoredTarget(plans, week),
    defaultPlan: plans.defaultPlan,
    special: Boolean(plans.weekOverrides[week] || plans.weekTargets?.[week] !== undefined),
    ready,
    error,
    save: (plan: WorkPlan, completed: readonly (number | null)[], targetSeconds?: number) => persist(current => changeWeekPlan(current, week, plan, completed, targetSeconds)),
    saveDefault: (plan: WorkPlan, completed: readonly (number | null)[] = []) => persist(current => changeDefaultPlan(current, plan, week, completed)),
    reset: (completed: readonly (number | null)[] = []) => persist(current => changeWeekPlan(current, week, null, completed)),
  };
}
