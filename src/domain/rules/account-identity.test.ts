import { expect, test } from "bun:test";
import { accountUsername, isAccountKey, loginUsername } from "./account-identity";

test("giriş adı PDKS'ye gönderilecek biçimde ayrılır; hesap adı yalnız ASCII harflerini küçültür", () => {
  expect(loginUsername("  ISMAIL.ERCAN@trt.net.tr  ")).toBe("ISMAIL.ERCAN");
  expect(accountUsername("  ISMAIL.ERCAN@trt.net.tr  ")).toBe("ismail.ercan");
  expect(accountUsername("  ismail.ercan  ")).toBe("ismail.ercan");
  expect(accountUsername("İSMAİL.ŞAHİN")).toBe("İsmaİl.Şahİn");
  expect(accountUsername("ısmaıl.şahin")).toBe("ısmaıl.şahin");
  expect(loginUsername("@trt.net.tr")).toBe("");
  expect(loginUsername(null)).toBe("");
});

test("hesap anahtarı 64 küçük onaltılık karakterden oluşur", () => {
  expect(isAccountKey("a1".repeat(32))).toBe(true);
  for (const value of [null, "", "a".repeat(63), "a".repeat(65), "A".repeat(64), "g".repeat(64)])
    expect(isAccountKey(value)).toBe(false);
});
