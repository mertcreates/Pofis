import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { cpus, platform, release } from "node:os";
import { monitorEventLoopDelay } from "node:perf_hooks";
import {
  createSessionManager,
  SESSION_COOKIE,
} from "../src/server/session-manager.js";
import { createSessionStorage } from "../src/server/session-storage.js";
import { PdksClient } from "../src/server/pdks.js";

// Only an injected source is used. No institution requests or real credentials are involved.
const root = resolve("work/session-benchmark");
await mkdir(root, { recursive: true });
const directory = await mkdtemp(join(root, "run-"));
const sizes = process.argv.slice(2).map(Number);
if (
  sizes.some((size) => !Number.isSafeInteger(size) || size < 1 || size > 10000)
)
  throw new Error("Provide sizes between 1 and 10000");
const results = [];
const request = (id: string) => ({
  cookies: {
    get: (name: string) =>
      name === SESSION_COOKIE ? { value: id } : undefined,
  },
});
async function batch<T, R>(
  items: T[],
  action: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let offset = 0; offset < items.length; offset += 128)
    results.push(
      ...(await Promise.all(
        items
          .slice(offset, offset + 128)
          .map((item, index) => action(item, offset + index)),
      )),
    );
  return results;
}
try {
  for (const size of sizes.length ? sizes : [100, 1000, 5000]) {
    Bun.gc(true);
    let active = 0;
    let peak = 0;
    let sourceCalls = 0;
    const fetchImpl = async (
      _url: unknown,
      options: { body?: string; headers: { Cookie: string } },
    ) => {
      sourceCalls++;
      active++;
      peak = Math.max(peak, active);
      const name = options.body
        ? new URLSearchParams(options.body).get("username")
        : options.headers.Cookie.replace("identity=", "");
      await new Promise((done) => setTimeout(done, 5));
      active--;
      return new Response(JSON.stringify({ name }), {
        headers: { "Set-Cookie": `identity=${name}; Path=/` },
      });
    };
    const createClient = () => {
      const client = new PdksClient({ fetchImpl });
      client.login = async (username: string) => {
        await client.request(
          "/PizzyKurumWeb/Giris.aspx",
          new URLSearchParams({ username }),
        );
        client.self = { sourceId: username, name: username };
      };
      return client;
    };
    const storage = createSessionStorage(join(directory, String(size)));
    const manager = createSessionManager({ storage, createClient });
    const lag = monitorEventLoopDelay({ resolution: 10 });
    lag.enable();
    const began = performance.now();
    const ids = await batch(
      Array.from({ length: size }, (_, i) => i),
      async (i) =>
        manager.connect({ username: `fixture-${i}`, password: "fixture-only" }),
    );
    const loginMs = performance.now() - began;
    const restored = createSessionManager({ storage, createClient });
    const coldStart = performance.now();
    await batch(ids, async (id, i) => {
      const session = await restored.requireSession(request(id));
      if (session.client.self.sourceId !== `fixture-${i}`)
        throw new Error("Restored identity mismatch");
    });
    const restoreMs = performance.now() - coldStart;
    const durations: number[] = [];
    const reportStart = performance.now();
    await batch(ids, async (id, i) => {
      const started = performance.now();
      const session = await restored.requireSession(request(id));
      const result = await session.client.request(
        "/PizzyKurumWeb/fixture-report",
      );
      restored.assertActive(session);
      if (JSON.parse(result.html).name !== `fixture-${i}`)
        throw new Error("Source identity mismatch");
      durations.push(performance.now() - started);
    });
    const reportMs = performance.now() - reportStart;
    lag.disable();
    durations.sort((a, b) => a - b);
    const memory = process.memoryUsage();
    const result = {
      sessions: size,
      loginMs,
      restoreMs,
      sourceRoundMs: reportMs,
      sourceRoundsPerSecond: (size / reportMs) * 1000,
      sourceRoundP95Ms: durations[Math.min(size - 1, Math.floor(size * 0.95))],
      eventLoopP99Ms: lag.percentile(99) / 1e6,
      rssMiB: memory.rss / 1024 ** 2,
      sourceCalls,
      sourcePeak: peak,
      identityChecks: size * 2,
      errors: 0,
    };
    results.push(result);
    console.log(JSON.stringify(result));
    await batch(ids, async (id) => {
      await restored.disconnect(request(id));
      await manager.disconnect(request(id));
    });
  }
  const artifact = {
    at: new Date().toISOString(),
    bun: Bun.version,
    os: `${platform()} ${release()}`,
    cpu: cpus()[0]?.model,
    source:
      "injected fetch; 5ms delay; one source round per user; real async session files; batches of 128; independent clients; no shared source queue",
    limitation:
      "Synthetic local measurements; not a full PDKS report or production capacity guarantee. RSS includes both original and restored managers plus runtime.",
    results,
  };
  const output = join(root, "latest.json");
  await writeFile(output, JSON.stringify(artifact, null, 2) + "\n");
  console.log(`Artifact: ${output}`);
} finally {
  if (relative(root, directory).startsWith(".."))
    throw new Error("Fixture directory escaped benchmark root");
  await rm(directory, { recursive: true, force: true });
}
