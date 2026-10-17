import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { toRequestFailure } from "@/lib/pdks-failure";
import RequestError from "./request-error.js";
import { Connection } from "./connection";
import { pdksDiagnosticRows, pdksDiagnosticText } from "./pdks-error-presentation";

test("teknik ayrıntılar kapalı açılır; kopyalama eylemi ve okunabilir İstanbul saati sunar", () => {
  const error = toRequestFailure({ code: "CONNECTION_FAILED", status: 502, details: {
    apiPath: "/api/session", apiMethod: "POST", method: "GET",
    path: "/PizzyKurumWeb/Giris.aspx", occurredAt: "2026-10-17T08:34:40.001Z",
    password: "SECRET_MUST_NOT_COPY", body: "PRIVATE_BODY",
  } }, "connect");
  const html = renderToStaticMarkup(<RequestError error={error} onReturnToLogin={() => {}} />);
  expect(html).toContain("Teknik ayrıntılar");
  expect(html).toContain("Ayrıntıları kopyala");
  expect(html).not.toContain("<details open");
  expect(html).toContain('<time dateTime="2026-10-17T08:34:40.001Z">');
  const time = pdksDiagnosticRows(error).find(row => row.key === "occurredAt")!;
  expect(time.value).toContain("17 Ekim 2026");
  expect(time.value).toContain("11:34:40");
  expect(time.value).toContain("GMT+3");
  const copied = pdksDiagnosticText(error);
  expect(copied).toContain("Hata kodu: CONNECTION_FAILED\nAPI HTTP durumu: 502");
  expect(copied).toContain("API yöntemi: POST");
  expect(copied).toContain("İstek yöntemi: GET");
  expect(copied).toContain("Hata zamanı: 2026-10-17T08:34:40.001Z");
  expect(copied).not.toContain("SECRET");
  expect(copied).not.toContain("PRIVATE");
});

test("okunamayan tanı zamanı ham metin olarak korunur", () => {
  const error = toRequestFailure({ code: "INTERNAL_ERROR", details: { occurredAt: "invalid-time" } }, "session");
  expect(pdksDiagnosticRows(error).find(row => row.key === "occurredAt")?.value).toBe("invalid-time");
});

test("yanlış şifre formda alanlarla ilişkili gösterilir; teknik ekran veya tanı üretilmez", () => {
  const failure = toRequestFailure({ code: "AUTH_FAILED", status: 401, message: "private source body", details: { diagnostic: "private diagnostic" } }, "connect");
  const html = renderToStaticMarkup(<Connection busy={false} error={failure} onConnect={async () => {}} onRetry={() => {}} onReturnToLogin={() => {}} />);
  expect(html).toContain("Kullanıcı adı veya şifre yanlış.");
  expect(html.match(/aria-invalid="true"/g)).toHaveLength(2);
  expect(html.match(/aria-describedby="connection-error"/g)).toHaveLength(2);
  expect(html.indexOf('name="password"')).toBeLessThan(html.indexOf('id="connection-error"'));
  expect(html).toContain('class="connection-field-error"');
  expect(html).not.toContain('class="request-error-inline');
  expect(html).toContain(encodeURIComponent('/pofi/states/idle.webp'));
  expect(html).not.toContain("<details");
  expect(html).not.toContain("AUTH_FAILED");
  expect(html).not.toContain("private");
  expect(html).not.toContain('class="empty request-error"');
});

test("oturum bitişi giriş yönlendirmesi sunar; teknik tanı veya bağımsız yeniden deneme düğmesi göstermez", () => {
  const error = toRequestFailure({ code: "SESSION_EXPIRED", status: 401 }, "report");
  const html = renderToStaticMarkup(<Connection busy={false} error={error} onConnect={async () => {}} onRetry={() => {}} onReturnToLogin={() => {}} />);
  expect(html).toContain("yeniden giriş yap");
  expect(html).not.toContain("<details");
  expect(html).toContain("<form");
  expect(html).not.toContain("request-error-inline");
  expect(html).toContain("connection-session-message");
  expect(html).not.toContain("Girişe dön");
  expect(html).toContain('role="status"');
  expect(html).not.toContain('role="alert"');
});

test("kaynak bağlantı hatası giriş kartının yerini normal hata ekranıyla alır ve forma dönüş sunar", () => {
  const error = toRequestFailure({ code: "CONNECTION_FAILED", status: 502 }, "connect");
  const html = renderToStaticMarkup(<Connection busy={false} error={error} onConnect={async () => {}} onRetry={() => {}} onReturnToLogin={() => {}} />);
  expect(html).not.toContain("<form");
  expect(html).not.toContain("dashboard-card");
  expect(html).not.toContain("request-error-inline");
  expect(html).toContain('class="empty request-error"');
  expect(html).toContain("Girişe dön");
  expect(html).toContain("Kurum ağı veya VPN bağlantını kontrol");
  expect(html).toContain('/pofi/states/error.webp');
  expect(html).toContain("<details");
  expect(html).not.toContain("<details open");
  expect(html).not.toContain("aria-invalid");
});

test("giriş doğrulama hatası alanlarda; oturum bitişi nötr ve alanları geçersiz saymadan görünür", () => {
  const render = (code: string, status: number) => renderToStaticMarkup(<Connection busy={false} error={toRequestFailure({ code, status }, "connect")} onConnect={async () => {}} onRetry={() => {}} onReturnToLogin={() => {}} />);
  expect(render("INVALID_INPUT", 400).match(/aria-invalid="true"/g)).toHaveLength(2);
  const expired = render("SESSION_EXPIRED", 401);
  expect(expired).toContain("connection-session-message");
  expect(expired).toContain(encodeURIComponent('/pofi/states/idle.webp'));
  expect(expired).not.toContain("aria-invalid");
  expect(expired).not.toContain("<details");
});

test("ilk oturum kontrol hatası form yerine normal hata ekranında kendi GET eylemini sunar", () => {
  const error = toRequestFailure({ code: "INTERNAL_ERROR", status: 500 }, "session");
  const html = renderToStaticMarkup(<Connection busy={false} error={error} onConnect={async () => {}} onRetry={() => {}} onReturnToLogin={() => {}} />);
  expect(html).toContain('class="empty request-error"');
  expect(html).toContain("Oturumu yeniden kontrol et");
  expect(html).not.toContain("<form");
  expect(html).not.toContain("Girişe dön");
});

test.each([
  ["session", "Oturumu yeniden kontrol et"],
  ["report", "Raporu yeniden al"],
  ["disconnect", "Bağlantıyı kesmeyi yeniden dene"],
] as const)("%s hatası kendi toparlanma eylemini sunar", (operation, label) => {
  const error = toRequestFailure({ code: "CONNECTION_FAILED", status: 502, details: { apiPath: "/api/report" } }, operation);
  const html = renderToStaticMarkup(<RequestError error={error} variant="notice" onRetry={() => {}} />);
  expect(html).toContain(label);
  expect(html).toContain("<details");
  expect(html).not.toContain("<details open");
  expect(html).toContain("/api/report");
});
