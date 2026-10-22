"use client";

import { ui } from "../lib/ui-text.js";

import { useEffect, useState } from "react";
import type { NotificationSettingsActions, NotificationStatus } from "@/desktop/notification-contract";

export function useDesktopNotifications(enabled: boolean, connected: boolean | null, mutating: boolean, plans: string | null) {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState(false);
  const [actions, setActions] = useState<NotificationSettingsActions | null>(null);
  useEffect(() => {
    const bridge = window.pofisNotifications;
    if (!enabled || !bridge) return;
    let active = true;
    setAvailable(true);
    setActions(bridge);
    const receive = (next: NotificationStatus) => {
      if (!active) return;
      setStatus(next);
      if (next.active) setError("");
    };
    const unsubscribe = bridge.subscribe(receive);
    bridge.get().then(receive).catch(() => { if (active) setError(ui.notificationErrors.loadFailed); });
    return () => { active = false; unsubscribe(); };
  }, [enabled]);
  useEffect(() => {
    const bridge = window.pofisNotifications;
    if (!enabled || !bridge) return;
    let active = true;
    const run = !connected || mutating ? bridge.pause() : plans ? bridge.sync(plans) : Promise.resolve();
    void run.then(() => { if (active) setError(""); }).catch((error: unknown) => {
      if (active) setError(error instanceof Error ? error.message : ui.notificationErrors.syncFailed);
    });
    return () => { active = false; };
  }, [enabled, connected, mutating, plans]);
  return { available, status, error, actions };
}
