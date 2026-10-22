const { test, expect } = require("bun:test");
const { createServer } = require("node:net");
const { connect } = require("./cdp.cjs");

function host(message, close = () => {}) {
  return Bun.serve({
    hostname: "127.0.0.1", port: 0,
    fetch(request, server) {
      if (server.upgrade(request)) return;
      return new Response("not found", { status: 404 });
    },
    websocket: { message: (socket, data) => message(socket, JSON.parse(data)), close },
  });
}

test("CDP yanıtları istek kimliğiyle eşleşir; yanıtın zamanlayıcısı bağlantıyı kapatmaz", async () => {
  const server = host((socket, request) => {
    if (request.method === "error") socket.send(JSON.stringify({ id: request.id, error: { message: "fixture error" } }));
    else setTimeout(() => socket.send(JSON.stringify({ id: request.id, result: request.params })), request.params.delay || 0);
  });
  let client;
  try {
    client = await connect(`ws://127.0.0.1:${server.port}`, { timeoutMs: 500 });
    expect(await Promise.all([client.send("first", { delay: 20 }), client.send("second", { delay: 0 })]))
      .toEqual([{ delay: 20 }, { delay: 0 }]);
    await expect(client.send("error")).rejects.toThrow("fixture error");
    await Bun.sleep(600);
    expect(await client.send("after-deadline", { alive: true })).toEqual({ alive: true });
  } finally { client?.close(); server.stop(true); }
});

test("yanıtsız CDP komutu bağlantıyı kapatır ve bütün bekleyen istekleri reddeder", async () => {
  let closed;
  const disconnected = new Promise(done => { closed = done; });
  const server = host(() => {}, closed);
  let client;
  try {
    client = await connect(`ws://127.0.0.1:${server.port}`, { timeoutMs: 500 });
    const results = await Promise.allSettled([client.send("Runtime.evaluate"), client.send("Page.navigate")]);
    for (const result of results) {
      expect(result.status).toBe("rejected");
      expect(result.reason.message).toBe("CDP komutu zaman aşımına uğradı: Runtime.evaluate");
    }
    await disconnected;
    await expect(client.send("after-close")).rejects.toThrow("CDP bağlantısı kapandı.");
  } finally { client?.close(); server.stop(true); }
});

test.each(["client", "peer"])("%s bağlantıyı kapatınca bekleyen komut hata alır", async who => {
  let received;
  const sent = new Promise(done => { received = done; });
  const server = host(socket => { received(); if (who === "peer") socket.close(); });
  let client;
  try {
    client = await connect(`ws://127.0.0.1:${server.port}`);
    const result = client.send("Runtime.evaluate").catch(error => error);
    await sent;
    if (who === "client") client.close();
    expect((await result).message).toBe("CDP bağlantısı kapandı.");
    client.close();
    await expect(client.send("after-close")).rejects.toThrow("CDP bağlantısı kapandı.");
  } finally { client?.close(); server.stop(true); }
});

test.each([false, true])("CDP handshake yanıtı yok veya erken kapanıyor: earlyClose=%s", async earlyClose => {
  const sockets = new Set();
  let closed;
  const disconnected = new Promise(done => { closed = done; });
  const server = createServer(socket => {
    sockets.add(socket);
    socket.on("data", () => { if (earlyClose) socket.end(); });
    socket.on("close", () => { sockets.delete(socket); closed(); });
  });
  await new Promise(done => server.listen(0, "127.0.0.1", done));
  try {
    await expect(connect(`ws://127.0.0.1:${server.address().port}`, { timeoutMs: 500 }))
      .rejects.toThrow(earlyClose ? "CDP bağlantı hatası." : "CDP bağlantısı zaman aşımına uğradı.");
    await disconnected;
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise(done => server.close(done));
  }
});
