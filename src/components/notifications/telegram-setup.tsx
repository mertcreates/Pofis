"use client";

import { ui } from "../../lib/ui-text.js";
import { TELEGRAM_CHAT_ID_PATTERN } from "@/lib/telegram-input";

import { useEffect, useRef, useState } from "react";
import type { NotificationSettingsActions } from "@/desktop/notification-contract";
import Modal from "../modal.js";
import Icon from "../ui-icon.js";

export function TelegramSetup({ actions, disabled, connectionError, onClose, onConnected }: {
  actions: NotificationSettingsActions;
  disabled: boolean;
  connectionError: string;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [chats, setChats] = useState<{ id: string; name: string }[]>([]);
  const [manualChat, setManualChat] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState<"chats" | "connect" | null>(null);
  const [error, setError] = useState("");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const connecting = manualChat || chats.length > 0;

  async function submit() {
    if (busy || disabled) return;
    setError("");
    setBusy(connecting ? "connect" : "chats");
    try {
      if (connecting) {
        await actions.connectTelegram({ token, chatId });
        if (active.current) onConnected();
      } else {
        const found = await actions.telegramChats(token);
        if (!active.current) return;
        setSearched(true);
        setChats(found);
        setChatId(found.length === 1 ? found[0].id : "");
        if (!found.length) setError(ui.telegramSetup.noChats);
      }
    } catch (failure) {
      if (active.current) {
        if (!connecting) setSearched(true);
        setError(failure instanceof Error ? failure.message : ui.telegramSetup.failed);
      }
    } finally {
      if (active.current) setBusy(null);
    }
  }

  return <Modal title={ui.telegramSetup.title} className="notification-setup-modal" onClose={onClose}>
    <div id="telegram-setup" className="notification-settings notification-telegram-setup" aria-busy={!!busy}>
      <form onSubmit={event => { event.preventDefault(); void submit(); }}>
        <fieldset disabled={disabled || !!busy}>
          <div className="notification-setup-fields">
            <div className="notification-setup-field-group">
              <label htmlFor="telegram-token">{ui.telegramSetup.tokenLabel}
                <input id="telegram-token" type="password" autoComplete="off" spellCheck={false} required
                  value={token} placeholder={ui.telegramSetup.tokenPlaceholder}
                  onChange={event => {
                    setToken(event.target.value);
                    setChats([]); setChatId(""); setManualChat(false); setSearched(false); setError("");
                  }} />
              </label>
              <details className="notification-setup-guide">
                <summary>{ui.telegramSetup.guideTitle}</summary>
                <ol>
                  <li>{ui.telegramSetup.botFatherStep.before}<strong>{ui.telegramSetup.botFather}</strong>{ui.telegramSetup.botFatherStep.between}<code>{ui.telegramSetup.newBotCommand}</code>{ui.telegramSetup.botFatherStep.after}</li>
                  <li>{ui.telegramSetup.createBot}</li>
                  <li>{ui.telegramSetup.startStep.before}<strong>{ui.telegramSetup.start}</strong>{ui.telegramSetup.startStep.after}</li>
                </ol>
              </details>
            </div>
            {(manualChat || chats.length > 0 || !!token.trim()) && <div className="notification-setup-field-group">
              {manualChat ? <label htmlFor="telegram-chat">{ui.telegramSetup.chatLabel}
                <input id="telegram-chat" type="text" inputMode="numeric" autoComplete="off" required pattern={TELEGRAM_CHAT_ID_PATTERN}
                  value={chatId} onChange={event => { setChatId(event.target.value); setError(""); }} placeholder={ui.telegramSetup.chatPlaceholder} />
              </label> : chats.length > 0 ? <label htmlFor="telegram-chats">{ui.telegramSetup.destinationLabel}
                <span className="notification-chat-select">
                  <select id="telegram-chats" value={chatId} required
                    onChange={event => { setChatId(event.target.value); setError(""); }}>
                    {chats.length > 1 && <option value="">{ui.telegramSetup.chooseChat}</option>}
                    {chats.map(chat => <option key={chat.id} value={chat.id}>{ui.telegramSetup.chatOption(chat.name, chat.id)}</option>)}
                  </select>
                  <Icon name="chevron-down" />
                </span>
              </label> : null}
              {(token.trim() || manualChat) && <button type="button" className="notification-setup-link"
                aria-expanded={manualChat} aria-controls={manualChat ? "telegram-chat" : undefined}
                onClick={() => {
                  setManualChat(!manualChat);
                  setChatId(!manualChat ? "" : chats.length === 1 ? chats[0].id : "");
                  setError("");
                }}>{manualChat ? ui.telegramSetup.findAutomatically : ui.telegramSetup.enterManually}</button>}
            </div>}
          </div>
          <div className="notification-setup-footer">
            <p className="notification-error notification-setup-feedback" role="status" aria-live="polite">
              {connectionError || error}
            </p>
            <div className="notification-setup-actions">
              <button type="button" className="notification-setup-cancel" onClick={onClose}>{ui.telegramSetup.cancel}</button>
              <button className="primary" type="submit" disabled={!token.trim() || (connecting && !chatId)}>
                {busy === "connect" ? ui.telegramSetup.connecting : busy === "chats" ? ui.telegramSetup.searching : connecting ? ui.telegramSetup.connect : searched ? ui.telegramSetup.searchAgain : ui.telegramSetup.findChat}
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  </Modal>;
}
