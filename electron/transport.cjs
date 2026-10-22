const { ORIGIN } = require("./server.cjs");

function createDesktopTransport({ serverOrigin, fetch }) {
  return async request => {
    const url = new URL(request.url);
    if (url.origin !== ORIGIN) return new Response("Forbidden", { status: 403 });
    const destination = new URL(serverOrigin);
    destination.pathname = url.pathname;
    destination.search = url.search;
    const headers = new Headers(request.headers);
    // Chromium validates CORS again in session.fetch. The inner hop must use
    // its actual origin; the renderer continues to own the fixed ORIGIN.
    if (headers.get("Origin") === ORIGIN) headers.set("Origin", destination.origin);
    return fetch(destination.href, {
      method: request.method, headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: "manual", credentials: "include", bypassCustomProtocolHandlers: true,
    });
  };
}

module.exports = { createDesktopTransport };
