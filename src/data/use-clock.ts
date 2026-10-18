"use client";

import { useEffect, useState } from "react";
import { dateKey } from "@/domain/rules/calendar";
import { startClock, type ClockCadence } from "./clock";

export function useClock(initialNow: number, cadence: ClockCadence | false) {
  const [now, setNow] = useState(() => cadence === "second" ? Date.now() : initialNow);
  useEffect(() => {
    if (!cadence) return;
    const clock = startClock(at => setNow(current =>
      cadence === "day" && dateKey(current) === dateKey(at) ? current : at), cadence);
    document.addEventListener("visibilitychange", clock.wake);
    return () => {
      clock.stop();
      document.removeEventListener("visibilitychange", clock.wake);
    };
  }, [cadence]);
  return cadence ? now : initialNow;
}
