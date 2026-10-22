import { expect, test } from "bun:test";
import { analyticsUserIdForAccount } from "./analytics-identity";

test("account identity is stable across sessions and independent of session tokens and display names", () => {
  const account = "a".repeat(64);
  const first = analyticsUserIdForAccount(account);
  expect(first).toBe("pofis_ga_v1_855bd4006c45cfaf82050ac46e59315b30fd592409969b7ba4a7f158796dccbe");
  expect(analyticsUserIdForAccount(account)).toBe(first);
  expect(analyticsUserIdForAccount("b".repeat(64))).not.toBe(first);
  expect(first).not.toContain(account);
});

test.each(["", " ", null, undefined])("invalid account key is an invariant failure: %s", value => {
  expect(() => analyticsUserIdForAccount(value as string)).toThrow("Analitik hesap anahtarı bulunamadı.");
});
