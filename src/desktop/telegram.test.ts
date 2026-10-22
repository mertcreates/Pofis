import { expect, test } from "bun:test";
import { createTelegram, readTelegramInput, DeliveryError } from "./telegram";
const input = { token: "123456:abcdefghijklmnopqrstuvwxyzABCDEF", chatId: "12345678" };

test("kişisel bot ve sohbet doğrulanır; metin parse_mode kullanmadan gönderilir", async () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const telegram = createTelegram((async (url, init) => {
    const body = JSON.parse(init!.body as string); calls.push({ url: String(url), body });
    const result = String(url).endsWith("getMe") ? { is_bot: true, username: "fixture_bot" }
      : String(url).endsWith("getChat") ? { type: "private", id: Number(input.chatId) } : { message_id: 1 };
    return Response.json({ ok: true, result });
  }));
  const verified = await telegram.verify(input);
  await telegram.send(verified, "Başlık", "<metin>");
  expect(calls[2].body).toEqual({ chat_id: input.chatId, text: "Başlık\n\n<metin>" });
  expect(verified.label).toBe("@fixture_bot");
});

test("grup, kullanıcı adı ve URL girdileri reddedilir", () => {
  for (const chatId of ["-12345", "@name", "https://example.com", "0"]) expect(() => readTelegramInput({ ...input, chatId })).toThrow();
  expect(() => readTelegramInput({ ...input, token: "https://example.com" })).toThrow();
});

test("ağ hatasında token içeren alt hata kullanıcıya sızmaz ve sonuç belirsizdir", async () => {
  const telegram = createTelegram((async () => { throw new Error(`failed https://api.telegram.org/bot${input.token}`); }));
  try { await telegram.send({ ...input, label: "bot" }, "title", "body"); throw new Error("unexpected success"); }
  catch (error) {
    expect(error).toBeInstanceOf(DeliveryError);
    expect((error as DeliveryError).uncertain).toBe(true);
    expect((error as Error).message).not.toContain(input.token);
  }
});

test("429 sağlayıcı bekleme süresi korunur; izin reddi yeniden denenmez", async () => {
  for (const code of [429, 403]) {
    const telegram = createTelegram((async () => Response.json({ ok: false, error_code: code, parameters: { retry_after: 17 } }, { status: code })));
    try { await telegram.send({ ...input, label: "bot" }, "title", "body"); throw new Error("unexpected"); }
    catch (error) { expect((error as DeliveryError).retryAfterMs).toBe(code === 429 ? 17_000 : null); }
  }
});

test("sohbet keşfi offset göndermeden kişisel sohbetleri tekilleştirir", async () => {
  const telegram = createTelegram((async (_url, init) => {
    expect(JSON.parse(init!.body as string)).not.toHaveProperty("offset");
    return Response.json({ ok: true, result: [
      { message: { chat: { id: 12345, type: "private", first_name: "Fixture" } } },
      { message: { chat: { id: 12345, type: "private", first_name: "Fixture" } } },
      { message: { chat: { id: -12345, type: "group" } } },
    ] });
  }));
  expect(await telegram.chats(input.token)).toEqual([{ id: "12345", name: "Fixture" }]);
});
