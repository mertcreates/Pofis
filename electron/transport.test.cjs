const { test, expect } = require("bun:test");
const { createDesktopTransport } = require("./transport.cjs");
const { ORIGIN } = require("./server.cjs");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

test("taşıma yalnız Pofis adresini yönlendirir; özgün isteği ve yabancı Origin başlığını değiştirmez", async () => {
  const calls = [];
  const transport = createDesktopTransport({ serverOrigin: "http://127.0.0.1:43210", fetch: async (...args) => {
    calls.push(args); return new Response("ok");
  } });
  expect((await transport(new Request("http://example.invalid/"))).status).toBe(403);
  expect(calls).toHaveLength(0);
  for (const origin of [ORIGIN, "http://example.invalid"]) {
    const request = new Request(`${ORIGIN}/echo?probe=1`, { method: "POST", headers: { Origin: origin }, body: "body" });
    await transport(request);
    const [url, options] = calls.at(-1);
    expect(url).toBe("http://127.0.0.1:43210/echo?probe=1");
    expect(options.headers.get("Origin")).toBe(origin === ORIGIN ? "http://127.0.0.1:43210" : origin);
    expect(request.headers.get("Origin")).toBe(origin);
    expect(Buffer.from(options.body).toString()).toBe("body");
    expect(options).toMatchObject({ method: "POST", credentials: "include", redirect: "manual", bypassCustomProtocolHandlers: true });
  }
});

test("gerçek Electron farklı portta fontu yükler; sabit origin ve HttpOnly oturumu korur", async () => {
  const profile = await mkdtemp(join(tmpdir(), "pofis-transport-test-"));
  const origins = [];
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/font.woff2") {
      origins.push(request.headers.get("Origin"));
      return new Response(Bun.file(resolve(__dirname, "../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2")),
        { headers: { "Content-Type": "font/woff2" } });
    }
    if (url.pathname === "/echo") return Response.json({ url: url.pathname + url.search,
      body: await request.text(), cookie: request.headers.get("Cookie") });
    return new Response('<!DOCTYPE html><style>@font-face{font-family:Geist;src:url(/font.woff2)}body{font-family:Geist}</style>Transport fixture',
      { headers: { "Content-Type": "text/html", "Set-Cookie": "transport_fixture=isolated; HttpOnly; SameSite=Strict; Path=/" } });
  } });
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  try {
    const result = await promisify(execFile)(require("electron"), [join(__dirname, "fixtures/transport.cjs"),
      `--user-data-dir=${profile}`, `--fixture-origin=http://127.0.0.1:${server.port}`], { env, windowsHide: true, timeout: 20000 });
    expect(result.stdout).toContain("PASS: mapped font, fixed origin, HttpOnly cookie and POST body");
    expect(origins).toContain(`http://127.0.0.1:${server.port}`);
  } finally {
    server.stop(true);
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}, 25000);
