import { useEffect, useState } from "react";
import { advanceDemoClock } from "./navigation";

export function useDemoClock(baseNow: number, running: boolean) {
  const [clock, setClock] = useState({ baseNow, now: baseNow });
  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now();
    const update = () => setClock({
      baseNow,
      now: advanceDemoClock(baseNow, Date.now() - startedAt),
    });
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
  }, [baseNow, running]);
  return running && clock.baseNow === baseNow ? clock.now : baseNow;
}
