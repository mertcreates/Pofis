import { ui } from "../../lib/ui-text.js";
import { TIME_ZONE } from "./calendar";
export const NOTIFICATION_POLICY = Object.freeze({
  minLeadMinutes: 1,
  maxLeadMinutes: 120,
  defaultLeadMinutes: 10,
  refreshMs: 30 * 60_000,
  tickMs: 15_000,
  lateMs: 60_000,
  maxAttempts: 3,
});

export type NotificationChannel = "native" | "telegram";
export type NotificationKind = "approaching" | "reached";
export type NotificationPreferences = {
  leadMinutes: number;
  approaching: Record<NotificationChannel, boolean>;
  reached: Record<NotificationChannel, boolean>;
};
export type NotificationGoal = { date: string; at: number };
export type MesaiNotification = {
  key: string;
  kind: NotificationKind;
  title: string;
  body: string;
  dueAt: number;
  expiresAt: number;
};

export function defaultNotificationPreferences(): NotificationPreferences {
  return { leadMinutes: NOTIFICATION_POLICY.defaultLeadMinutes, approaching: { native: false, telegram: false }, reached: { native: false, telegram: false } };
}

export function readNotificationPreferences(value: unknown): NotificationPreferences {
  const input = value as NotificationPreferences | null;
  if (!input || !Number.isInteger(input.leadMinutes) || input.leadMinutes < NOTIFICATION_POLICY.minLeadMinutes || input.leadMinutes > NOTIFICATION_POLICY.maxLeadMinutes ||
      [input.approaching, input.reached].some(channels => !channels ||
        typeof channels.native !== "boolean" || typeof channels.telegram !== "boolean")) {
    throw new Error(ui.notificationErrors.invalidPreferences(NOTIFICATION_POLICY.minLeadMinutes, NOTIFICATION_POLICY.maxLeadMinutes));
  }
  return { leadMinutes: input.leadMinutes,
    approaching: { native: input.approaching.native, telegram: input.approaching.telegram },
    reached: { native: input.reached.native, telegram: input.reached.telegram } };
}

// The host supplies Istanbul's current date and a target computed by the work-plan owner.
export function mesaiNotifications(goal: NotificationGoal | null, preferences: NotificationPreferences,
  today: string, now: number, eligibleSince: number): MesaiNotification[] {
  if (!goal || goal.date !== today || !Number.isFinite(goal.at)) return [];
  const clock = new Intl.DateTimeFormat("tr-TR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(goal.at);
  return (["approaching", "reached"] as const).flatMap(kind => {
    const dueAt = kind === "approaching" ? goal.at - preferences.leadMinutes * 60_000 : goal.at;
    const expiresAt = Math.min(dueAt + NOTIFICATION_POLICY.lateMs, kind === "approaching" ? goal.at : Infinity);
    if (dueAt < eligibleSince || now < dueAt || now >= expiresAt) return [];
    return [{ key: `${goal.date}:${kind}`, kind, dueAt, expiresAt,
      title: kind === "approaching" ? ui.notificationMessages.approachingTitle : ui.notificationMessages.reachedTitle,
      body: kind === "approaching"
        ? ui.notificationMessages.approachingBody(clock, preferences.leadMinutes)
        : ui.notificationMessages.reachedBody(clock) }];
  });
}
