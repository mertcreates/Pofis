"use client";

import { ui } from "../../lib/ui-text.js";

import { useEffect, useId, useRef, useState } from "react";
import { TelegramSetup } from "./telegram-setup";
import type { NotificationSettingsActions, NotificationStatus } from "@/desktop/notification-contract";
import { defaultNotificationPreferences, NOTIFICATION_POLICY, type NotificationChannel, type NotificationPreferences } from "@/domain/rules/notifications";
import "./settings.css";

export type NotificationSettingsSource = {
  mode: "desktop" | "web";
  status: NotificationStatus | null;
  actions: NotificationSettingsActions | null;
  error: string;
};

const webStatus: NotificationStatus = {
  active: true, preferences: defaultNotificationPreferences(),
  telegram: { connected: false, label: "" }, nativeSupported: false,
  secureStorageAvailable: false, lastRefreshAt: null, refreshError: "", deliveryErrors: {},
};

type FeedbackTarget = "save" | NotificationChannel;
type Feedback = { kind: "success" | "error"; message: string };

export function NotificationSettings({ source, visible }: {
  source: NotificationSettingsSource; visible: boolean;
}) {
  const { status, error: connectionError, mode, actions } = source;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (visible) heading.current?.focus(); }, [visible]);
  return <section className="notification-page" hidden={!visible} aria-labelledby="notifications-title">
    <h1 id="notifications-title" ref={heading} tabIndex={-1}>{ui.notifications.title}</h1>
    {mode === "web" && <p className="notification-context">{ui.notifications.desktopRequired}</p>}
    {(mode === "web" || status?.active) ? <NotificationForm key={mode} status={status ?? webStatus} actions={actions} mode={mode} visible={visible} connectionError={connectionError} />
      : <p role="status">{connectionError || ui.notifications.preparing}</p>}
  </section>;
}

function NotificationForm({ status, connectionError, actions, mode, visible }: {
  status: NotificationStatus; connectionError: string; actions: NotificationSettingsActions | null;
  mode: NotificationSettingsSource["mode"];
  visible: boolean;
}) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => structuredClone(status.preferences ?? defaultNotificationPreferences()));
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState<Partial<Record<FeedbackTarget, Feedback>>>({});
  const [setupOpen, setSetupOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(false);
  const [leadDraft, setLeadDraft] = useState(String(preferences.leadMinutes));
  const [leadError, setLeadError] = useState(false);
  const leadErrorId = useId();
  const leadPopover = useRef<HTMLDivElement>(null);
  const leadInput = useRef<HTMLInputElement>(null);
  const leadTrigger = useRef<HTMLButtonElement>(null);
  const cancelLeadEdit = useRef(false);
  const restoreLeadFocus = useRef(false);
  const changed = JSON.stringify(preferences) !== JSON.stringify(status.preferences);
  const disabled = !!busy || !status.active || !actions;
  async function perform(target: FeedbackTarget, name: string, operation: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(name);
    setFeedback(current => ({ ...current, [target]: undefined }));
    try {
      await operation();
      setFeedback(current => ({ ...current, [target]: { kind: "success", message: success } }));
    } catch (error) {
      const message = error instanceof Error ? error.message : ui.notifications.actionFailed;
      setFeedback(current => ({ ...current, [target]: { kind: "error", message } }));
    }
    finally { setBusy(""); }
  }
  function bridge() {
    if (!actions) throw new Error(ui.notifications.desktopRequired);
    return actions;
  }
  function test(channel: NotificationChannel) {
    return perform(channel, `test-${channel}`, () => bridge().test(channel), channel === "native"
      ? ui.notifications.nativeTestSent
      : ui.notifications.telegramTestSent);
  }
  const leadMinutes = preferences.leadMinutes;
  const leadOptions = [5, 10, 15, 30].filter(minutes =>
    minutes >= NOTIFICATION_POLICY.minLeadMinutes && minutes <= NOTIFICATION_POLICY.maxLeadMinutes);
  const customLead = !leadOptions.includes(leadMinutes);
  useEffect(() => {
    if (editingLead) {
      leadPopover.current?.showPopover();
      leadInput.current?.focus();
      leadInput.current?.select();
    } else {
      leadPopover.current?.hidePopover();
      if (restoreLeadFocus.current) {
        restoreLeadFocus.current = false;
        leadTrigger.current?.focus({ preventScroll: true });
      }
    }
  }, [editingLead]);
  function selectLead(minutes: number) {
    setPreferences(current => ({ ...current, leadMinutes: minutes }));
    setLeadError(false);
    setEditingLead(false);
  }
  function commitLead(field: HTMLInputElement) {
    if (!field.validity.valid) {
      setLeadError(true);
      return false;
    }
    selectLead(field.valueAsNumber);
    return true;
  }
  function openTelegramSetup() {
    setSetupOpen(true);
    setFeedback(current => ({ ...current, telegram: undefined }));
  }
  async function savePreferences(next = preferences) {
    await perform("save", "save", () => bridge().save(next), ui.notifications.saved);
  }
  return <div className="notification-settings" aria-busy={!!busy}>
    <p className="notification-error notification-connection-feedback" role="status">{connectionError}</p>
    <div className="notification-layout">
      <form className="notification-reminders-form" onSubmit={event => {
        event.preventDefault();
        if (editingLead && leadInput.current) {
          if (!leadInput.current.validity.valid) {
            setLeadError(true);
            leadPopover.current?.showPopover();
            leadInput.current.focus();
            return;
          }
          const next = { ...preferences, leadMinutes: leadInput.current.valueAsNumber };
          setPreferences(next);
          setEditingLead(false);
          void savePreferences(next);
          return;
        }
        void savePreferences();
      }}>
        <section className="notification-reminders" aria-label={ui.notifications.reminders}>
          <fieldset disabled={disabled}>
            <legend className="notification-sr-only">{ui.notifications.reminders}</legend>
            {([ ["approaching", ui.notifications.approachingTitle, ui.notifications.approachingDescription],
              ["reached", ui.notifications.reachedTitle, ui.notifications.reachedDescription] ] as const).map(([kind, label, description]) =>
              <section className="notification-event" key={kind} aria-labelledby={`notification-${kind}`}>
                <div className="notification-event-heading">
                  <h2 id={`notification-${kind}`}>{label}</h2>
                  <p>{description}</p>
                </div>
                {kind === "approaching" && <div className="notification-lead">
                  <span>{ui.notifications.leadQuestion}</span>
                  <div className="notification-segments" role="group" aria-label={ui.notifications.leadLabel}>
                    {leadOptions.map(minutes => <button key={minutes} type="button" data-lead-preset
                      aria-label={ui.notifications.minutesBefore(minutes)} aria-pressed={!editingLead && leadMinutes === minutes}
                      disabled={!!busy} onClick={() => selectLead(minutes)}>{ui.notifications.minutes(minutes)}</button>)}
                    <button ref={leadTrigger} type="button" className="notification-custom-toggle"
                      aria-expanded={editingLead} aria-controls="notification-custom-lead" aria-haspopup="dialog"
                      aria-pressed={customLead || editingLead} disabled={!!busy}
                      onClick={() => {
                        if (editingLead) { setEditingLead(false); return; }
                        setLeadDraft(String(leadMinutes));
                        setLeadError(false);
                        setEditingLead(true);
                      }}>
                      {customLead ? ui.notifications.minutes(leadMinutes) : ui.notifications.custom}
                    </button>
                  </div>
                  <div id="notification-custom-lead" ref={leadPopover} className="notification-custom-popover" popover="auto"
                    role="dialog" aria-label={ui.notifications.customLeadLabel}
                    onToggle={event => {
                      if (event.newState === "closed" && editingLead) {
                        if (!cancelLeadEdit.current && leadInput.current && !leadInput.current.validity.valid) {
                          window.requestAnimationFrame(() => {
                            leadPopover.current?.showPopover();
                            leadInput.current?.focus({ preventScroll: true });
                          });
                          return;
                        }
                        cancelLeadEdit.current = false;
                        setEditingLead(false);
                        setLeadDraft(String(leadMinutes));
                        setLeadError(false);
                      }
                    }}
                    onKeyDown={event => {
                      if (event.key !== "Escape") return;
                      event.preventDefault();
                      event.stopPropagation();
                      cancelLeadEdit.current = true;
                      restoreLeadFocus.current = true;
                      setEditingLead(false);
                      setLeadDraft(String(leadMinutes));
                      setLeadError(false);
                    }}>
                    <label htmlFor="notification-custom-minutes">{ui.notifications.customLeadQuestion}</label>
                    <div className="notification-custom-field" data-invalid={leadError}>
                      <input ref={leadInput} id="notification-custom-minutes" type="number" inputMode="numeric"
                        min={NOTIFICATION_POLICY.minLeadMinutes} max={NOTIFICATION_POLICY.maxLeadMinutes} step="1" required value={leadDraft}
                        aria-invalid={leadError} aria-describedby={leadError ? leadErrorId : undefined} disabled={!!busy}
                        onChange={event => { setLeadDraft(event.target.value); setLeadError(false); }}
                        onInvalid={event => { event.preventDefault(); setLeadError(true); }}
                        onBlur={event => {
                          if (cancelLeadEdit.current) {
                            cancelLeadEdit.current = false;
                            return;
                          }
                          if (event.relatedTarget instanceof Element && event.relatedTarget.closest("[data-lead-preset]")) return;
                          commitLead(event.currentTarget);
                        }}
                        onKeyDown={event => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            if (commitLead(event.currentTarget)) restoreLeadFocus.current = true;
                          }
                        }} />
                      <span aria-hidden="true">{ui.units.minute}</span>
                    </div>
                    {leadError && <p id={leadErrorId} className="notification-error" role="alert">{ui.notifications.leadValidation(NOTIFICATION_POLICY.minLeadMinutes, NOTIFICATION_POLICY.maxLeadMinutes)}</p>}
                  </div>
                </div>}
                <div className="notification-event-footer" role="group" aria-label={ui.notifications.eventChannels(label)}>
                  {(["native", "telegram"] as const).map(channel => <NotificationTarget key={channel} channel={channel}
                    kind={kind} status={status} preferences={preferences}
                    onChange={value => setPreferences(current => ({ ...current, [kind]: { ...current[kind], [channel]: value } }))} />)}
                </div>
              </section>)}
            <div className="notification-actions">
              <button className="primary" type="submit" disabled={!changed || disabled} aria-describedby="notification-save-feedback">
                {busy === "save" ? ui.notifications.saving : ui.notifications.save}
              </button>
              {changed && <span className="notification-help">{ui.notifications.unsaved}</span>}
              <ActionFeedback id="notification-save-feedback" result={changed && feedback.save?.kind === "success" ? undefined : feedback.save} />
            </div>
          </fieldset>
        </section>
      </form>
      <section className="notification-channels" aria-labelledby="channels-title">
        <h2 id="channels-title">{ui.notifications.channelsTitle}</h2>
        <div className="notification-channel notification-native-channel">
          <div className="notification-channel-info"><h3>{ui.notifications.native}</h3><span>{status.nativeSupported ? ui.notifications.thisDevice : ui.notifications.unsupported}</span></div>
          <button className="text-button" type="button" disabled={disabled || !status.nativeSupported}
            aria-busy={busy === "test-native"} aria-describedby="notification-native-feedback"
            onClick={() => void test("native")}>{busy === "test-native" ? ui.notifications.sending : ui.notifications.testNative}</button>
          <ActionFeedback id="notification-native-feedback" result={feedback.native}
            deliveryError={busy === "test-native" ? undefined : status.deliveryErrors.native} />
        </div>
        <div className="notification-channel notification-telegram-channel">
          <div className="notification-channel-info"><h3>{ui.notifications.telegram}</h3><span>{status.telegram.connected ? status.telegram.label : ui.notifications.disconnected}</span></div>
          {status.telegram.connected ? <div className="notification-channel-actions">
            <button className="text-button" type="button" disabled={disabled} aria-busy={busy === "test-telegram"} aria-describedby="notification-telegram-feedback"
              onClick={() => void test("telegram")}>{busy === "test-telegram" ? ui.notifications.sending : ui.notifications.testTelegram}</button>
            <button className="text-button" type="button" disabled={disabled} aria-describedby="notification-telegram-feedback"
              onClick={() => void perform("telegram", "disconnect", () => bridge().disconnectTelegram(), ui.notifications.telegramDisconnected)}>{busy === "disconnect" ? ui.notifications.disconnecting : ui.notifications.disconnect}</button>
          </div> : <button className="text-button notification-setup-toggle" type="button" aria-haspopup="dialog"
            disabled={disabled || !status.secureStorageAvailable} onClick={openTelegramSetup}>{ui.notifications.connectTelegram}</button>}
          <ActionFeedback id="notification-telegram-feedback" result={feedback.telegram}
            deliveryError={busy === "test-telegram" || busy === "disconnect" ? undefined : status.deliveryErrors.telegram} />
        </div>
        {visible && setupOpen && actions && <TelegramSetup actions={actions}
          disabled={disabled || !status.secureStorageAvailable}
          connectionError={connectionError || (!status.active ? ui.notifications.sessionRequired : "")}
          onClose={() => setSetupOpen(false)} onConnected={() => {
            setSetupOpen(false);
            setFeedback(current => ({ ...current, telegram: { kind: "success", message: ui.notifications.telegramConnected } }));
          }} />}
        {mode !== "web" && !status.secureStorageAvailable && <p className="notification-error">{ui.notifications.secureStorageUnavailable}</p>}
      </section>
    </div>
  </div>;
}

function ActionFeedback({ id, result, deliveryError }: { id: string; result?: Feedback; deliveryError?: string }) {
  const [dismissed, setDismissed] = useState<Feedback | null>(null);
  useEffect(() => {
    if (result?.kind !== "success") return;
    const timer = window.setTimeout(() => setDismissed(result), 5000);
    return () => window.clearTimeout(timer);
  }, [result]);
  const activeResult = result === dismissed ? undefined : result;
  const message = deliveryError || activeResult?.message || "";
  const isError = !!deliveryError || activeResult?.kind === "error";
  return <p id={id} className={`notification-feedback ${isError ? "notification-error" : "notification-message"}`}
    role="status" aria-live="polite" aria-atomic="true">{message}</p>;
}

function NotificationTarget({ kind, channel, status, preferences, onChange }: {
  kind: "approaching" | "reached"; channel: NotificationChannel;
  status: NotificationStatus; preferences: NotificationPreferences; onChange: (value: boolean) => void;
}) {
  const name = channel === "native" ? ui.notifications.native : ui.notifications.telegram;
  const available = channel === "native" ? status.nativeSupported : status.telegram.connected;
  const checked = preferences[kind][channel];
  return <label className="notification-channel-switch">
    <input type="checkbox" role="switch"
      aria-label={ui.notifications.targetLabel(kind === "approaching" ? ui.notifications.approachingTitle : ui.notifications.reachedTitle, name)}
      checked={checked} disabled={!checked && !available} onChange={event => onChange(event.target.checked)} />
    <span className="notification-switch-label">{name}</span>
    <span className="notification-switch-track" aria-hidden="true" />
  </label>;
}
