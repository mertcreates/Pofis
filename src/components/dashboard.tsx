"use client";

import { useEffect, useState } from "react";
import { usePdks } from "@/data/use-pdks";
import { useWorkPlans } from "@/data/use-work-plans";
import { dateKey, weekStart } from "@/domain/rules/calendar";
import { DashboardView } from "./dashboard/view";

export function Dashboard({ initialNow }: { initialNow: number }) {
  const [now, setNow] = useState(initialNow);
  const [week, setWeek] = useState(() => weekStart(dateKey(initialNow)));
  const pdks = usePdks(week);
  const workPlans = useWorkPlans(week);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") update();
    }, 1000);
    const wake = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", wake);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

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
