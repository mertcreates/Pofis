import { expect, test } from "bun:test";
import { readTelegramInput, readTelegramToken, isTelegramChatId } from "./telegram-input";

const token = "123456:abcdefghijklmnopqrstuvwxyzABCDEF";

test("token sohbet kimliğinden bağımsız doğrulanır; bağlantı girdisinin çevresindeki boşluklar temizlenir", () => {
  expect(readTelegramToken(` ${token} `)).toBe(token);
  expect(readTelegramInput({ token: ` ${token} `, chatId: " 1234 " })).toEqual({ token, chatId: "1234" });
  for (const value of [null, {}, "", "https://example.com", "1234:short"]) expect(() => readTelegramToken(value)).toThrow();
});

test("kişisel sohbet kimliği 4–20 basamaklı ve pozitif olmalı", () => {
  for (const chatId of ["1234", "1".repeat(20)]) {
    expect(isTelegramChatId(chatId)).toBe(true);
    expect(readTelegramInput({ token, chatId }).chatId).toBe(chatId);
  }
  for (const chatId of ["123", "1".repeat(21), "01234", "-12345", "@name", 1234, null]) {
    expect(isTelegramChatId(chatId)).toBe(false);
    expect(() => readTelegramInput({ token, chatId })).toThrow();
  }
});
