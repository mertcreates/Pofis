import { expect, test } from "bun:test";
import { notificationSession } from "./notification-identity";

test("bildirim kimliği hesapta sabittir; hesaplar ayrılır ve yalnız sabit TTL dışarı çıkar", () => {
  const session = (key: string, expiresAt: number) => ({ expiresAt, client: { self: { accountKey: key } } });
  const first = notificationSession(session("private-account-one", 1000));
  const renewed = notificationSession(session("private-account-one", 2000));
  const other = notificationSession(session("private-account-two", 1000));
  expect(first.accountId).toMatch(/^[a-f0-9]{64}$/);
  expect(renewed.accountId).toBe(first.accountId);
  expect(other.accountId).not.toBe(first.accountId);
  expect(renewed.expiresAt).toBe(2000);
  expect(Object.keys(first).sort()).toEqual(["accountId", "expiresAt"]);
  expect(JSON.stringify(first)).not.toContain("private-account-one");
});
