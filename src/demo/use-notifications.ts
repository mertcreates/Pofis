"use client";

import { ui } from "../lib/ui-text.js";

import { useState } from "react";
import type { NotificationSettingsSource } from "@/components/notifications/settings";
import type { NotificationSettingsActions, NotificationStatus } from "@/desktop/notification-contract";
import { defaultNotificationPreferences, readNotificationPreferences } from "@/domain/rules/notifications";

export function useDemoNotifications(): NotificationSettingsSource {
  const [status, setStatus] = useState<NotificationStatus>(() => ({
    active: true,
    preferences: defaultNotificationPreferences(),
    telegram: { connected: false, label: "" },
    nativeSupported: true,
    secureStorageAvailable: true,
    lastRefreshAt: null,
    refreshError: "",
    recordError: "",
    deliveryErrors: {},
  }));

  const actions: NotificationSettingsActions = {
    async save(preferences) {
      const next = { ...status, preferences: readNotificationPreferences(preferences) };
      setStatus(next);
      return next;
    },
    async telegramChats() {
      return [{ id: "123456789", name: ui.demoMessages.person }];
    },
    async connectTelegram() {
      const next = { ...status, telegram: { connected: true, label: ui.demoMessages.bot } };
      setStatus(next);
      return next;
    },
    async disconnectTelegram() {
      const next = { ...status, telegram: { connected: false, label: "" } };
      setStatus(next);
      return next;
    },
    async test() {
      // Demo delivery succeeds locally without contacting a provider.
    },
  };

  return { mode: "desktop", status, actions, error: "" };
}
