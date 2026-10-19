const { test, expect } = require("bun:test");
const { installPermissions } = require("./permissions.cjs");
const { ORIGIN } = require("./server.cjs");

function fixture() {
  const contents = { isDestroyed: () => false, getURL: () => `${ORIGIN}/demo` };
  const handlers = {};
  installPermissions({
    setPermissionRequestHandler: handler => { handlers.request = handler; },
    setPermissionCheckHandler: handler => { handlers.check = handler; },
  }, () => contents);
  return { contents, handlers };
}

function verify(f, expected, { contents = f.contents, permission = "clipboard-sanitized-write",
  origin = ORIGIN, details = { isMainFrame: true, requestingUrl: `${ORIGIN}/demo` } } = {}) {
  expect(f.handlers.check(contents, permission, origin, details)).toBe(expected);
  let result;
  f.handlers.request(contents, permission, allowed => { result = allowed; }, details);
  expect(result).toBe(expected);
}

test("Pofis ana penceresi kendi adresinden panoya yazabilir", () => {
  verify(fixture(), true);
});

test.each(["clipboard-read", "deprecated-sync-clipboard-read", "media", "notifications", "unknown"])(
  "%s izni kapalı kalır", permission => verify(fixture(), false, { permission }),
);

test.each(["https://example.com", "http://127.0.0.1:3211", "http://127.0.0.1:3210.evil.example", "about:blank", "invalid"])(
  "başka veya geçersiz adres yazamaz: %s", requestingUrl => {
    verify(fixture(), false, { origin: requestingUrl, details: { isMainFrame: true, requestingUrl } });
  },
);

test("alt çerçeve aynı adreste olsa bile yazamaz", () => {
  verify(fixture(), false, { details: { isMainFrame: false, requestingUrl: ORIGIN } });
});

test("eksik çerçeve adresi yazma yetkisi vermez", () => {
  verify(fixture(), false, { details: { isMainFrame: true } });
});

test("başka pencere ve belgesiz istek yazamaz", () => {
  const f = fixture();
  verify(f, false, { contents: { ...f.contents } });
  verify(f, false, { contents: null });
});

test("kapanmış veya dış adrese geçmiş uygulama penceresi yazamaz", () => {
  const f = fixture();
  f.contents.isDestroyed = () => true;
  verify(f, false);
  f.contents.isDestroyed = () => false;
  f.contents.getURL = () => "https://example.com";
  verify(f, false);
});

test("izin kontrolü isteyen origin'i ayrıca doğrular", () => {
  const f = fixture();
  expect(f.handlers.check(f.contents, "clipboard-sanitized-write", "https://example.com",
    { isMainFrame: true, requestingUrl: ORIGIN })).toBe(false);
});
