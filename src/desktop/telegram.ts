import { ui } from "../lib/ui-text.js";
export class DeliveryError extends Error {
  constructor(message: string, readonly retryAfterMs: number | null = null, readonly uncertain = false) { super(message); }
}
export type TelegramCredentials = { token: string; chatId: string; label: string };

export function readTelegramInput(value: unknown): { token: string; chatId: string } {
  const input = value as { token?: unknown; chatId?: unknown } | null;
  if (!input || typeof input.token !== "string" || !/^\d{5,16}:[A-Za-z0-9_-]{20,100}$/.test(input.token.trim()) ||
      typeof input.chatId !== "string" || !/^[1-9]\d{3,19}$/.test(input.chatId.trim())) {
    throw new Error(ui.telegramErrors.invalidInput);
  }
  return { token: input.token.trim(), chatId: input.chatId.trim() };
}

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
        throw new DeliveryError(ui.telegramErrors.rateLimit, Number.isFinite(seconds) ? Math.max(1000, seconds * 1000) : 60_000);
      }
      if (code === 401) throw new DeliveryError(ui.telegramErrors.invalidToken);
      if (code === 403) throw new DeliveryError(ui.telegramErrors.forbidden);
      throw new DeliveryError(ui.telegramErrors.rejected);
    }
    return result.result;
  }
  return {
    async chats(token: string, signal?: AbortSignal): Promise<{ id: string; name: string }[]> {
      const credentials = readTelegramInput({ token, chatId: "1000" });
      const updates = await call(credentials, "getUpdates", { timeout: 0, allowed_updates: ["message"] }, signal);
      if (!Array.isArray(updates)) throw new Error(ui.telegramErrors.unreadableChats);
      const chats = new Map<string, string>();
      for (const update of updates) {
        const chat = update?.message?.chat;
        if (chat?.type === "private" && /^[1-9]\d{3,19}$/.test(String(chat.id))) {
          chats.set(String(chat.id), typeof chat.first_name === "string" ? chat.first_name.slice(0, 100) : String(chat.id));
        }
      }
      return [...chats].map(([id, name]) => ({ id, name }));
    },
    async verify(input: unknown, signal?: AbortSignal): Promise<TelegramCredentials> {
      const credentials = readTelegramInput(input);
      const bot = await call(credentials, "getMe", {}, signal);
      if (bot?.is_bot !== true) throw new Error(ui.telegramErrors.unverifiedBot);
      const chat = await call(credentials, "getChat", { chat_id: credentials.chatId }, signal);
      if (chat?.type !== "private" || String(chat.id) !== credentials.chatId) throw new Error(ui.telegramErrors.privateChatRequired);
      return { ...credentials, label: typeof bot.username === "string" ? `@${bot.username}` : ui.telegramErrors.botLabel };
    },
    async send(credentials: TelegramCredentials, title: string, body: string, signal?: AbortSignal) {
      await call(credentials, "sendMessage", { chat_id: credentials.chatId, text: `${title}\n\n${body}` }, signal);
    },
  };
}
