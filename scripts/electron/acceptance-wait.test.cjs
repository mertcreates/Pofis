const { test, expect } = require("bun:test");
const { until, fetchLocal } = require("./acceptance-wait.cjs");

test("bekleyen kontrol süre dolunca reddedilir ve iptal sinyali alır", async () => {
  let signal;
  await expect(until(value => {
    signal = value;
    return new Promise(() => {});
  }, 30, "kontrol bekledi")).rejects.toThrow("kontrol bekledi");
  expect(signal.aborted).toBe(true);
  expect(await until(() => "hazır", 100)).toBe("hazır");
});

test("yanıt gövdesinde takılan yerel HTTP kontrolü iptal edilir", async () => {
  const host = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch() {
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"status":')); } }));
  } });
  try {
    await expect(until(async signal => (await fetchLocal(`http://127.0.0.1:${host.port}`, { signal })).json(),
      100, "HTTP bekledi")).rejects.toThrow("HTTP bekledi");
  } finally { host.stop(true); }
});
