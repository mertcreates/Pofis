import type { NotificationPreferences, NotificationChannel } from "@/domain/rules/notifications";
import type { Report } from "@/domain/report";

export type NotificationSession = { accountId: string; expiresAt: number };
export type NotificationReport = Report & { notificationSession: NotificationSession };
export type NotificationStatus = {
  active: boolean;
  preferences: NotificationPreferences;
  telegram: { connected: boolean; label: string };
  nativeSupported: boolean;
  secureStorageAvailable: boolean;
  lastRefreshAt: number | null;
  refreshError: string;
  deliveryErrors: Partial<Record<NotificationChannel, string>>;
};
export type DesktopNotificationBridge = {
  get(): Promise<NotificationStatus>;
  sync(plans: string): Promise<NotificationStatus>;
  pause(): Promise<void>;
  refresh(): Promise<void>;
  save(preferences: NotificationPreferences): Promise<NotificationStatus>;
  connectTelegram(input: { token: string; chatId: string }): Promise<NotificationStatus>;
  telegramChats(token: string): Promise<{ id: string; name: string }[]>;
  disconnectTelegram(): Promise<NotificationStatus>;
  test(channel: NotificationChannel): Promise<void>;
  subscribe(callback: (status: NotificationStatus) => void): () => void;
  onReport(callback: (report: NotificationReport) => void): () => void;
  onExpired(callback: () => void): () => void;
};

declare global { interface Window { pofisNotifications?: DesktopNotificationBridge } }

export type NotificationSettingsActions = Pick<DesktopNotificationBridge,
  "save" | "connectTelegram" | "disconnectTelegram" | "telegramChats" | "test">;
