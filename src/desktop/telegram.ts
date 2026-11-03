import { ui } from "../lib/ui-text.js";
import { isTelegramChatId, readTelegramInput, readTelegramToken } from "@/lib/telegram-input";
export { readTelegramInput } from "@/lib/telegram-input";
export class DeliveryError extends Error {
  constructor(message: string, readonly retryAfterMs: number | null = null, readonly uncertain = false) { super(message); }
}
export type TelegramCredentials = { token: string; chatId: string; label: string };

export function createTelegram(fetchImpl: (url: string, init: RequestInit) => Promise<Response> = fetch) {
  async function call(credentials: { token: string }, method: string, body: object, signal?: AbortSignal) {
    let response;
    try {
      response = await fetchImpl(`https://api.telegram.org/bot${credentials.token}/${method}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        redirect: "error", signal: AbortSignal.any([AbortSignal.timeout(10_000), ...(signal ? [signal] : [])]),
      });
    } catch {
      // Fetch errors may contain the token-bearing URL. Keep them out of UI, IPC and logs.
      throw new DeliveryError(ui.telegramErrors.unconfirmed, null, true);
    }
    let result;
    try { result = await response.json(); }
    catch { throw new DeliveryError(ui.telegramErrors.unreadableResponse, null, true); }
    if (!response.ok || result?.ok !== true) {
      const code = result?.error_code ?? response.status;
      if (code === 429) {
        const seconds = result?.parameters?.retry_after;
        const milliseconds = typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0
          ? Math.ceil(seconds * 1000) : NaN;
        const retryAfter = Number.isSafeInteger(milliseconds) ? Math.max(1000, milliseconds) : null;
        throw new DeliveryError(ui.telegramErrors.rateLimit, retryAfter);
      }
      if (code === 401) throw new DeliveryError(ui.telegramErrors.invalidToken);
      if (code === 403) throw new DeliveryError(ui.telegramErrors.forbidden);
      throw new DeliveryError(ui.telegramErrors.rejected);
    }
    return result.result;
  }
  return {
    async chats(token: string, signal?: AbortSignal): Promise<{ id: string; name: string }[]> {
      const credentials = { token: readTelegramToken(token) };
      const updates = await call(credentials, "getUpdates", { timeout: 0, allowed_updates: ["message"] }, signal);
      if (!Array.isArray(updates)) throw new Error(ui.telegramErrors.unreadableChats);
      const chats = new Map<string, string>();
      for (const update of updates) {
        const chat = update?.message?.chat;
        if (chat?.type === "private" && isTelegramChatId(String(chat.id))) {
          chats.set(String(chat.id), typeof chat.first_name === "string" ? chat.first_name.slice(0, 100) : String(chat.id));
        }
      }
      return [...chats].map(([id, name]) => ({ id, name }));
    },
    async verify(input: unknown, signal?: AbortSignal): Promise<TelegramCredentials> {
      const credentials = readTelegramInput(input);
      const controller = new AbortController();
      const checkSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
      const botRequest = call(credentials, "getMe", {}, checkSignal);
      // Observe an early chat failure while keeping bot errors first.
      const chatRequest = call(credentials, "getChat", { chat_id: credentials.chatId }, checkSignal).then(
        chat => ({ chat }),
        error => ({ error }),
      );
      try {
        const bot = await botRequest;
        if (bot?.is_bot !== true) throw new Error(ui.telegramErrors.unverifiedBot);
        const result = await chatRequest;
        if ("error" in result) throw result.error;
        const chat = result.chat;
        if (chat?.type !== "private" || String(chat.id) !== credentials.chatId) throw new Error(ui.telegramErrors.privateChatRequired);
        return { ...credentials, label: typeof bot.username === "string" ? `@${bot.username}` : ui.telegramErrors.botLabel };
      } finally {
        controller.abort();
      }
    },
    async send(credentials: TelegramCredentials, title: string, body: string, signal?: AbortSignal) {
      await call(credentials, "sendMessage", { chat_id: credentials.chatId, text: `${title}\n\n${body}` }, signal);
    },
  };
}
