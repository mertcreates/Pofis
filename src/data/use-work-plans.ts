"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadPlans, savePlans, serializePlans } from "@/lib/plan-storage.js";
import { workPlanStorage, type PlanScope } from "./work-plans";
import {
  emptyWorkPlans, resolveStoredPlan, resolveStoredTarget, resolveLeaveDays, resolveZeroOpenDays, resolveUserLockedDays, resolveWeekTimes, changeWeekTime, changeWeekLockedDays, changeWeekPlan, changeDefaultPlan,
  type WorkPlan, type WorkPlans, type PlanTime,
} from "@/domain/rules/work-plan";
import { ui } from "@/lib/ui-text.js";

export function useWorkPlans(week: string, scope: PlanScope = "live") {
  const [plans, setPlans] = useState<WorkPlans>(emptyWorkPlans);
  const latest = useRef(plans);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const plan = useMemo(() => resolveStoredPlan(plans, week), [plans, week]);
  const serialized = useMemo(() => serializePlans(plans), [plans]);
  useEffect(() => {
    setReady(false);
    try {
      const loaded = loadPlans(workPlanStorage(localStorage, scope));
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
    plan,
    serialized: ready ? serialized : null,
    targetSeconds: resolveStoredTarget(plans, week),
    defaultPlan: plans.defaultPlan,
    leaveDays: resolveLeaveDays(plans, week),
    zeroOpenDays: resolveZeroOpenDays(plans, week),
    userLockedDays: resolveUserLockedDays(plans, week),
    times: resolveWeekTimes(plans, week),
    special: Boolean(plans.weekOverrides[week] || plans.weekTargets?.[week] !== undefined || plans.weekLeaves?.[week]?.length || plans.weekZeroOpenDays?.[week]?.length || plans.weekLockedDays?.[week]?.length || plans.weekTimes?.[week]),
    ready,
    error,
    save: (plan: WorkPlan, completed: readonly (number | null)[], targetSeconds?: number, leaveDays?: readonly number[]) => persist(current => changeWeekPlan(current, week, plan, completed, targetSeconds, leaveDays)),
    saveDefault: (plan: WorkPlan, completed: readonly (number | null)[] = []) => persist(current => changeDefaultPlan(current, plan, week, completed)),
    reset: (completed: readonly (number | null)[] = []) => persist(current => changeWeekPlan(current, week, null, completed)),
    setLockedDays: (days: readonly number[], plan: WorkPlan) => persist(current => changeWeekLockedDays(current, week, days, plan)),
    setTime: (day: number, time: PlanTime | null) => persist(current => changeWeekTime(current, week, day, time)),
  };
}
