import { ui } from "./ui-text.js";

export const TELEGRAM_CHAT_ID_PATTERN = "[1-9][0-9]{3,19}";
const chatIdPattern = new RegExp(`^(?:${TELEGRAM_CHAT_ID_PATTERN})$`);

export function isTelegramChatId(value: unknown): value is string {
  return typeof value === "string" && chatIdPattern.test(value);
}

export function readTelegramToken(value: unknown): string {
  if (typeof value !== "string" || !/^\d{5,16}:[A-Za-z0-9_-]{20,100}$/.test(value.trim())) {
    throw new Error(ui.telegramErrors.invalidInput);
  }
  return value.trim();
}

export function readTelegramInput(value: unknown): { token: string; chatId: string } {
  const input = value as { token?: unknown; chatId?: unknown } | null;
  const token = readTelegramToken(input?.token);
  const chatId = typeof input?.chatId === "string" ? input.chatId.trim() : input?.chatId;
  if (!isTelegramChatId(chatId)) throw new Error(ui.telegramErrors.invalidInput);
  return { token, chatId };
}
