const { test, expect } = require("bun:test");
const { createWindowOpenHandler } = require("./external-links.cjs");

function fixture(openExternal) {
  const opened = [], errors = [];
  const handler = createWindowOpenHandler({
    openExternal: openExternal || (async url => { opened.push(url); }),
    onError: error => errors.push(error),
  });
  return { handler, opened, errors };
}

test("gerçek footer adresi tarayıcıya aktarılır; Electron penceresi açılmaz", async () => {
  const { product } = await import("../src/lib/ui-text.js");
  const f = fixture();
  expect(f.handler({ url: product.creditUrl })).toEqual({ action: "deny" });
  expect(f.opened).toEqual(["https://mertercan.com/"]);
});

test.each([
  "https://mertercan.com/about?from=pofis#contact",
])("izinli HTTPS adresi açılır: %s", url => {
  const f = fixture();
  expect(f.handler({ url })).toEqual({ action: "deny" });
  expect(f.opened).toEqual([url]);
});

test.each([
  "https://example.com", "https://mertercan.com.evil.example",
  "https://mertercan.com@evil.example", "https://user:pass@mertercan.com",
  "https://www.mertercan.com", "https://mertercan.com:444",
  "http://mertercan.com", "http://127.0.0.1:3210/demo",
  "file:///C:/Windows/notepad.exe", "javascript:alert(1)",
  "mailto:hello@example.com", "ms-settings:display", "about:blank", "invalid",
])("diğer hedefler işletim sistemine aktarılmaz: %s", url => {
  const f = fixture();
  expect(f.handler({ url })).toEqual({ action: "deny" });
  expect(f.opened).toEqual([]);
  expect(f.errors).toEqual([]);
});

test("tarayıcı açılışı başarısız olursa hata bildirilir", async () => {
  const error = new Error("No browser available");
  const f = fixture(async () => { throw error; });
  expect(f.handler({ url: "https://mertercan.com" })).toEqual({ action: "deny" });
  await Promise.resolve();
  expect(f.errors).toEqual([error]);
});
