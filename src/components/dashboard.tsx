"use client";

import { useState } from "react";
import { useClock } from "@/data/use-clock";
import { usePdks } from "@/data/use-pdks";
import { useWorkPlans } from "@/data/use-work-plans";
import { dateKey, weekStart } from "@/domain/rules/calendar";
import { DashboardView } from "./dashboard/view";

export function Dashboard({ initialNow }: { initialNow: number }) {
  const now = useClock(initialNow, "day");
  const [week, setWeek] = useState(() => weekStart(dateKey(initialNow)));
  const pdks = usePdks(week);
  const workPlans = useWorkPlans(week, "live", {
    connected: pdks.connected, busy: pdks.busy, workPlanSession: pdks.workPlanSession,
    sessionFailed: pdks.failure?.operation === "session", checkSession: pdks.checkSession,
  });

  return (
    <DashboardView
      now={now}
      week={week}
      onWeekChange={setWeek}
      data={{ kind: "pdks", state: pdks }}
      workPlans={workPlans}
    />
  );
}
