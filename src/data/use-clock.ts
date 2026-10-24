"use client";

import { useEffect, useState } from "react";
import { dateKey } from "@/domain/rules/calendar";
import { startClock, type ClockCadence } from "./clock";
import { applicationNow } from "./application-clock";

export function useClock(initialNow: number, cadence: ClockCadence | false) {
  const [now, setNow] = useState(() => cadence === "second" ? applicationNow() : initialNow);
  useEffect(() => {
    if (!cadence) return;
    const clock = startClock(at => setNow(current =>
      cadence === "day" && dateKey(current) === dateKey(at) ? current : at), cadence, { now: applicationNow });
    document.addEventListener("visibilitychange", clock.wake);
    return () => {
      clock.stop();
      document.removeEventListener("visibilitychange", clock.wake);
    };
  }, [cadence]);
  return cadence ? now : initialNow;
}
