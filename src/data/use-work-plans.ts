"use client";
import { useEffect, useState } from "react";
import { savePlans } from "@/lib/plan-storage.js";
import { readWorkPlans, workPlanStorage, type PlanScope } from "./work-plans";
import { DEFAULT_WORK_PLAN, type WorkPlan } from "@/domain/rules/work-plan";

export function useWorkPlans(week: string, scope: PlanScope = "live") {
  const [plans, setPlans] = useState<Record<string, WorkPlan>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      setPlans(readWorkPlans(workPlanStorage(localStorage, scope)));
      setReady(true);
    } catch {
      setError("Planlar okunamadı. Tarayıcı depolama ayarlarını kontrol et.");
    }
  }, [scope]);
  function save(plan: WorkPlan) {
    if (!ready) return false;
    const next = { ...plans, [week]: plan };
    try {
      savePlans(workPlanStorage(localStorage, scope), next);
      setPlans(next);
      setError("");
      return true;
    } catch {
      setError("Plan kaydedilemedi. Tarayıcı depolama ayarlarını kontrol et.");
      return false;
    }
  }
  return {
    plan: plans[week] ?? DEFAULT_WORK_PLAN,
    special: Boolean(plans[week]),
    ready,
    error,
    save,
  };
}
