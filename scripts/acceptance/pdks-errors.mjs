// Run alongside bun run dev, then open http://127.0.0.1:3101 in a fresh tab.
// Every /api request is synthetic. Only GET/HEAD UI assets reach the dev server.
let connected = false;
let sessionChecks = 0;
let logins = 0;
let reports = 0;
let disconnects = 0;

const json = (body, status = 200) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});
const failure = (code, status, details = {}) => json({
  error: "Synthetic API failure", code, details,
}, status);

function fixture(request, url) {
  console.log(`fixture: ${request.method} ${url.pathname}`);
  if (url.pathname === "/api/session") {
    if (request.method === "GET") {
      // React Strict Mode mounts effects twice in next dev.
      if (++sessionChecks <= 2) return failure("INTERNAL_ERROR", 500);
      return json({ connected });
    }
    if (request.method === "POST") {
      logins++;
      if (logins === 1) return failure("AUTH_FAILED", 401, { diagnostic: "CREDENTIAL_DIAGNOSTIC_MUST_STAY_HIDDEN" });
      if (logins === 2) return failure("CONNECTION_FAILED", 502, {
        diagnostic: "Synthetic PDKS connection failure", stage: "login", causeCode: "ETIMEDOUT",
      });
      connected = true;
      return json({ connected });
    }
    if (request.method === "DELETE") {
      if (++disconnects === 1) return failure("INTERNAL_ERROR", 500);
      connected = false;
      return json({ connected });
    }
  }
  if (url.pathname === "/api/session/heartbeat") {
    return connected ? json({ connected }) : failure("SESSION_EXPIRED", 401);
  }
  if (url.pathname === "/api/report") {
    reports++;
    if (reports === 2) return new Response("<html>synthetic proxy error</html>", { status: 401 });
    if (reports === 3) return failure("SOURCE_ERROR", 502, { sourceStatus: 500, diagnostic: "Synthetic upstream failure" });
    if (reports === 5) {
      connected = false;
      return failure("SESSION_EXPIRED", 401);
    }
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    return json({
      person: { id: "self", name: "SENTETİK KABUL KİŞİSİ", unit: "", title: "" },
      from, to, fetchedAt: new Date().toISOString(), pofiNotes: [],
      passages: [
        { date: from, time: "08:00:00", direction: "in" },
        { date: from, time: "16:00:00", direction: "out" },
      ],
    });
  }
  return failure("INVALID_INPUT", 404);
}

const server = Bun.serve({
  hostname: "127.0.0.1", port: 3101,
  async fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return fixture(request, url);
    // Next dev carries the React debug stream over its HMR WebSocket.
    if (url.pathname === "/_next/hmr" && request.headers.get("upgrade") === "websocket") {
      if (server.upgrade(request, { data: { path: `${url.pathname}${url.search}`, pending: [] } })) return;
      return new Response(null, { status: 400 });
    }
    if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405 });
    const response = await fetch(`http://127.0.0.1:3000${url.pathname}${url.search}`, {
      method: request.method, redirect: "manual",
    });
    const headers = new Headers(response.headers);
    headers.delete("content-encoding");
    headers.delete("content-length");
    headers.delete("set-cookie");
    return new Response(response.body, { status: response.status, headers });
  },
  websocket: {
    open(socket) {
      const upstream = new WebSocket(`ws://127.0.0.1:3000${socket.data.path}`);
      socket.data.upstream = upstream;
      upstream.onopen = () => {
        for (const message of socket.data.pending) upstream.send(message);
        socket.data.pending = [];
      };
      upstream.onmessage = ({ data }) => socket.send(data);
      upstream.onclose = () => socket.close();
      upstream.onerror = () => socket.close();
    },
    message(socket, message) {
      if (socket.data.upstream.readyState === WebSocket.OPEN) socket.data.upstream.send(message);
      else socket.data.pending.push(message);
    },
    close(socket) { socket.data.upstream?.close(); },
  },
});
console.log(`Synthetic PDKS acceptance: ${server.url}`);
