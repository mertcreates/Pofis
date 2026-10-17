import { expect, spyOn, test } from "bun:test";
import { NextRequest } from "next/server";
import { failure, readBody, sessionCookieOptions } from "./http.js";
import { PdksError } from "./pdks.js";
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

test("API hata yanıtı kodu ve izinli tanıyı korur; giriş verisini ve sahte bağlamı dışarı çıkarmaz", async () => {
  const request = new NextRequest("http://localhost:3000/api/session?private=value", { method: "POST" });
  const response = await failure(new PdksError("Giriş bilgilerini kontrol et.", "AUTH_FAILED", 401, {
    username: "secret-user", password: "secret-password", body: "secret-body",
    apiPath: "/spoofed", apiMethod: "DELETE", diagnostic: "safe diagnostic",
  }), request);
  const body = await response.json();
  expect(response.status).toBe(401);
  expect(body).toMatchObject({ code: "AUTH_FAILED", details: {
    apiPath: "/api/session", apiMethod: "POST", diagnostic: "safe diagnostic", type: "PdksError",
  } });
  expect(JSON.stringify(body)).not.toContain("secret");
  expect(JSON.stringify(body)).not.toContain("private");
  expect(response.cookies.getAll()).toHaveLength(0);
});

test("beklenmeyen sunucu istisnası ham mesajı kullanıcıya veya loga taşımaz", async () => {
  const logger = spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = await failure(new Error("secret fixture"), new NextRequest("http://localhost:3000/api/report"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toMatchObject({ code: "INTERNAL_ERROR" });
    expect(JSON.stringify(body)).not.toContain("secret fixture");
    expect(JSON.stringify(logger.mock.calls)).not.toContain("secret fixture");
  } finally { logger.mockRestore(); }
});

test.each([
  ["CONNECTION_FAILED", 502],
  ["INVALID_INPUT", 400],
  ["AUTH_FAILED", 401],
])("yeniden yüklenen modülün %s hatası API sınırında kimliğini korur", async (code, status) => {
  const { PdksError: ReloadedPdksError } = await import("./pdks.js?reload-regression");
  expect(ReloadedPdksError).not.toBe(PdksError);
  const error = new ReloadedPdksError("safe fixture", code, status, { method: "GET", path: "/PizzyKurumWeb/Giris.aspx" });
  const response = await failure(error, new NextRequest("http://localhost:3000/api/session", { method: "POST" }));
  expect(response.status).toBe(status);
  expect(await response.json()).toMatchObject({ code, details: { type: "PdksError", method: "GET", path: "/PizzyKurumWeb/Giris.aspx" } });
});

test("benzer alanları olan sıradan hata PDKS hatası sayılmaz", async () => {
  const logger = spyOn(console, "error").mockImplementation(() => {});
  try {
    const error = Object.assign(new Error("private fixture"), { code: "CONNECTION_FAILED", status: 502, details: { diagnostic: "private fixture" } });
    const response = await failure(error, new NextRequest("http://localhost:3000/api/session", { method: "POST" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ code: "INTERNAL_ERROR", details: { type: "UnexpectedError" } });
  } finally { logger.mockRestore(); }
});
