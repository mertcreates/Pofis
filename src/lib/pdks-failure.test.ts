import { expect, test } from "bun:test";
import { api, ApiError, createLatestRequest } from "./api-client.js";
import { readDiagnosticDetails, toRequestFailure } from "./pdks-failure";

test.each([
  ["AUTH_FAILED", 401, "credentials", "submit"],
  ["SESSION_EXPIRED", 401, "session-expired", "submit"],
  ["SESSION_EXPIRED", 500, "unexpected", "retry"],
  ["INVALID_INPUT", 400, "validation", "none"],
  ["NETWORK_ERROR", 0, "network", "retry"],
  ["CONNECTION_FAILED", 502, "unavailable", "retry"],
  ["SOURCE_CHANGED", 502, "source", "retry"],
  ["SOURCE_ERROR", 502, "unavailable", "retry"],
  ["TOO_MANY_RESULTS", 502, "limit", "none"],
  ["UNKNOWN_CODE", 401, "unexpected", "retry"],
  ["INTERNAL_ERROR", 500, "unexpected", "retry"],
])("%s / %s semantik ve toparlanma sonucunu korur", (code, status, kind, recovery) => {
  expect(toRequestFailure({ code, status }, "report")).toMatchObject({ kind, recovery });
});

test("kaynak 403 ve 429 yanıtları uygulamanın 502 durumundan ayrılır", () => {
  expect(toRequestFailure({ code: "SOURCE_ERROR", status: 502, details: { sourceStatus: 403 } }, "report").kind).toBe("permission");
  expect(toRequestFailure({ code: "SOURCE_ERROR", status: 502, details: { sourceStatus: 429, retryAfterMs: 30000 } }, "report")).toMatchObject({ kind: "rate-limit", details: { retryAfterMs: 30000 } });
});

test("API tanısı izinli alanlarla sınırlıdır ve istek bağlamını sunucu gövdesi değiştiremez", async () => {
  let error;
  try {
    await api("/api/session?private=value", { method: "POST" }, async () => Response.json({
      code: "AUTH_FAILED", error: "fixture", details: {
        apiPath: "/spoofed", apiMethod: "DELETE", password: "secret", body: "secret",
        diagnostic: "safe fixture", nested: {}, sourceStatus: 200,
      },
    }, { status: 401 }));
  } catch (caught) { error = caught; }
  expect(toRequestFailure(error, "connect")).toEqual({
    kind: "credentials", operation: "connect", recovery: "submit", status: 401, code: "AUTH_FAILED",
    details: { apiPath: "/api/session", apiMethod: "POST", diagnostic: "safe fixture", sourceStatus: 200 },
  });
  expect(readDiagnosticDetails(["not an object"])).toEqual({});
  expect(readDiagnosticDetails({ diagnostic: "x".repeat(2000), sourceStatus: Infinity, type: {} })).toEqual({ diagnostic: "x".repeat(1000) });
});

test("bozuk 401 yanıtı ve beklenmeyen hata bir PDKS oturum bitişi değildir", async () => {
  const response = new Response("<html>proxy login</html>", { status: 401 });
  try {
    await api("/api/report", {}, async () => response);
    throw new Error("Expected API failure");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect(toRequestFailure(error, "report")).toMatchObject({ kind: "unexpected", code: "INVALID_RESPONSE", status: 401 });
  }
  expect(JSON.stringify(toRequestFailure(new Error("private runtime message"), "report"))).not.toContain("private runtime message");
});

test.each([[null], [[]], ["html"], [true]])("başarılı HTTP'deki geçersiz JSON şekli reddedilir: %j", async value => {
  await expect(api("/api/session", {}, async () => Response.json(value))).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
});

test.each([[{}], [{ error: "fixture" }], [{ code: "AUTH_FAILED" }], [{ error: "fixture", code: "invalid code" }]])("eksik hata sözleşmesi HTTP durumundan tahmin edilmez: %j", async body => {
  await expect(api("/api/session", {}, async () => Response.json(body, { status: 401 }))).rejects.toMatchObject({ code: "INVALID_RESPONSE", status: 401 });
});

test("ağ hatası kullanıcı bağlantı sınıfına dönüşür; iptal aynı hata olarak korunur", async () => {
  await expect(api("/api/session", {}, async () => { throw new TypeError("private browser message"); })).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 0 });
  const abort = new DOMException("fixture", "AbortError");
  await expect(api("/api/session", {}, async () => { throw abort; })).rejects.toBe(abort);
});

test("geciken eski başarısızlık yeni isteği veya oturumu etkilemez", async () => {
  const requests = createLatestRequest();
  let rejectOld!: (error: Error) => void;
  const old = requests.run("/api/report", {}, async () => new Promise<Response>((_, reject) => { rejectOld = reject; }));
  const current = requests.run("/api/report", {}, async () => Response.json({ person: "current" }));
  rejectOld(new ApiError("old session", 401, "SESSION_EXPIRED", {}));
  expect(await old).toBeNull();
  expect(await current).toEqual({ person: "current" });
});
