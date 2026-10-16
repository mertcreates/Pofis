import { expect, test } from "bun:test";
import { PdksClient } from "./pdks.js";

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("farklı kullanıcıların istekleri birbirini beklemeden başlar ve kendi çerezlerini kullanır", async () => {
  const gate = deferred();
  const started = [];
  const clients = Array.from(
    { length: 30 },
    () =>
      new PdksClient({
        fetchImpl: async (_url, options) => {
          started.push(options.headers.Cookie);
          await gate.promise;
          return new Response(options.headers.Cookie);
        },
      }),
  );
  await Promise.all(
    clients.map((client, index) =>
      client.jar.setCookie(
        `identity=person${index}; Path=/`,
        "https://pdks.trt.net.tr",
      ),
    ),
  );
  const pending = Promise.all(
    clients.map((client) => client.request("/PizzyKurumWeb/fixture")),
  );
  try {
    await new Promise((done) => setTimeout(done, 25));
    expect(started.length).toBe(30);
    expect(new Set(started).size).toBe(30);
  } finally {
    gate.resolve();
    const responses = await pending;
    expect(responses.map((response) => response.html)).toEqual(
      clients.map((_, index) => `identity=person${index}`),
    );
  }
});

test("aynı oturumun işlemleri sıralanır; başka oturum bağımsız ilerler", async () => {
  const first = new PdksClient();
  const second = new PdksClient();
  const gate = deferred();
  const started = deferred();
  const order = [];
  const a = first.run(async () => {
    order.push("first");
    started.resolve();
    await gate.promise;
  });
  const b = first.run(() => order.push("next"));
  try {
    await started.promise;
    await second.run(() => order.push("other"));
    expect(order).toEqual(["first", "other"]);
  } finally {
    gate.resolve();
    await Promise.all([a, b]);
  }
  expect(order).toEqual(["first", "other", "next"]);
});
