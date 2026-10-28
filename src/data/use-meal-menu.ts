"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client.js";
import { readMealApiResponse, type MealMenuResponse } from "@/lib/meals/response";
import { isSessionExpired } from "@/lib/pdks-failure";

type MealMenuState =
  | { date: string; kind: "loading" }
  | ({ date: string; kind: "loaded" } & MealMenuResponse)
  | { date: string; kind: "error" };

export function useMealMenu(date: string, onSessionExpired: (error: unknown) => Promise<void>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<MealMenuState>({ date, kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ date, kind: "loading" });
    void api(`/api/meals?${new URLSearchParams({ date })}`, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setState({ date, kind: "loaded", ...readMealApiResponse(result, date) });
        }
      })
      .catch(async (error) => {
        if (controller.signal.aborted) return;
        if (isSessionExpired(error)) await onSessionExpired(error);
        if (!controller.signal.aborted) setState({ date, kind: "error" });
      });
    return () => controller.abort();
  }, [date, attempt, onSessionExpired]);

  return {
    state: state.date === date ? state : { date, kind: "loading" } as const,
    retry: () => setAttempt((current) => current + 1),
  };
}
