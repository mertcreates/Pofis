import { expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { readBody, sessionCookieOptions } from "./http.js";
import { validDates } from "./session.js";

test("JSON sınırı ve gövde tipi doğrulanır", async () => {
  const request = (body, headers = {}) =>
    new NextRequest("http://localhost:3000/api/session", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json", ...headers },
    });
  expect(await readBody(request('{"username":"fixture"}'))).toEqual({
    username: "fixture",
  });
  await expect(readBody(request("[]"))).rejects.toMatchObject({
    code: "INVALID_INPUT",
  });
  await expect(readBody(request("{invalid"))).rejects.toMatchObject({
    code: "INVALID_INPUT",
  });
  await expect(readBody(request("x".repeat(32769)))).rejects.toMatchObject({
    status: 413,
  });
});

test("tarih filtresi gerçek gün, sıralama ve 93 günlük üst sınır uygular", () => {
  expect(() => validDates("2026-02-30", "2026-03-01")).toThrow();
  expect(() => validDates("2026-10-16", "2026-10-12")).toThrow();
  expect(() => validDates("2026-01-01", "2026-04-03")).not.toThrow();
  expect(() => validDates("2026-01-01", "2026-04-04")).toThrow();
});

test("doğrudan HTTP ve HTTPS bağlantılarında oturum çerezi bağlantı protokolünü izler", () => {
  for (const [protocol, secure] of [
    ["http", false],
    ["https", true],
  ]) {
    const request = new NextRequest(
      `${protocol}://pofis.example.internal/api/session`,
    );
    expect(sessionCookieOptions(request)).toEqual({
      secure,
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });
  }
});

test("TLS ingress protokolü HTTP pod'da Secure çerez üretir", () => {
  for (const [protocol, secure] of [
    ["https", true],
    ["https, http", true],
    ["http", false],
  ]) {
    const request = new NextRequest("http://pofis:3000/api/session", {
      headers: { "X-Forwarded-Proto": protocol },
    });
    expect(sessionCookieOptions(request)).toMatchObject({
      secure,
      httpOnly: true,
      sameSite: "strict",
    });
  }
  const directHttps = new NextRequest(
    "https://pofis.example.internal/api/session",
    { headers: { "X-Forwarded-Proto": "http" } },
  );
  expect(sessionCookieOptions(directHttps).secure).toBe(true);
});
