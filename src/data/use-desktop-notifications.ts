"use client";

import { ui } from "../lib/ui-text.js";

import { useEffect, useState } from "react";
import type { NotificationSettingsActions, NotificationStatus } from "@/desktop/notification-contract";

export function useDesktopNotifications(enabled: boolean, connected: boolean | null, mutating: boolean, plans: string | null, session: string | null = null) {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState(false);
  const [actions, setActions] = useState<NotificationSettingsActions | null>(null);
  useEffect(() => {
    const bridge = window.pofisNotifications;
    if (!enabled || !bridge) return;
    let active = true;
    let receivedStatus = false;
    setAvailable(true);
    setActions(bridge);
    const receive = (next: NotificationStatus) => {
      if (!active) return;
      setStatus(next);
      if (next.active) setError("");
    };
    const unsubscribe = bridge.subscribe(next => {
      receivedStatus = true;
      receive(next);
    });
    bridge.get().then(next => {
      if (!receivedStatus) receive(next);
    }).catch(() => {
      if (active && !receivedStatus) setError(ui.notificationErrors.loadFailed);
    });
    return () => { active = false; unsubscribe(); };
  }, [enabled]);
  useEffect(() => {
    const bridge = window.pofisNotifications;
    if (!enabled || !bridge) return;
    let active = true;
    const sync = () => {
      const run = !connected || mutating || !plans || (!session && !window.pofisScenario)
        ? bridge.pause() : bridge.sync(plans, session);
      void run.then(() => { if (active) setError(""); }).catch((error: unknown) => {
        if (active) setError(error instanceof Error ? error.message : ui.notificationErrors.syncFailed);
      });
    };
    sync();
    return () => { active = false; };
  }, [enabled, connected, mutating, plans, session]);
  return { available, status, error, actions };
}
