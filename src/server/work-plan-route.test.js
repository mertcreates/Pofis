import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { NextRequest } from "next/server";
import { GET, PUT } from "../app/api/work-plans/route.js";
import { createSessionManager, SESSION_COOKIE } from "./session-manager.js";
import { PdksClient, PdksError } from "./pdks.js";

const managerKey = Symbol.for("pofis.session-manager:account-key-v3");
const storeKey = Symbol.for("pofis.work-plan-storage:v1");
const aliceKey = "a".repeat(64), bobKey = "b".repeat(64);
const alice = "c".repeat(64), bob = "d".repeat(64), aliceAgain = "e".repeat(64), old = "f".repeat(64);
const sevenHours = { defaultPlan: [420, 420, 420, 420, 420, 0, 0], weekOverrides: {} };
const sixHours = { defaultPlan: [360, 360, 360, 360, 360, 0, 0], weekOverrides: {} };

function request(id, body) {
  return new NextRequest("http://localhost:3000/api/work-plans", {
    method: body === undefined ? "GET" : "PUT",
    headers: { ...(id ? { Cookie: `${SESSION_COOKIE}=${id}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function fixture(run) {
  const root = resolve(tmpdir());
  const directory = await mkdtemp(join(root, "pofis-work-plan-api-"));
  const previousDirectory = process.env.POFIS_PLAN_DIR;
  const previousManager = globalThis[managerKey];
  const previousStore = globalThis[storeKey];
  const session = (id, accountKey) => ({ id, client: { self: { accountKey } } });
  const sessions = new Map([
    [alice, session(alice, aliceKey)], [bob, session(bob, bobKey)],
    [aliceAgain, session(aliceAgain, aliceKey)], [old, session(old, undefined)],
  ]);
  globalThis[managerKey] = {
    sessionFor: async req => sessions.get(req.cookies.get(SESSION_COOKIE)?.value) ?? null,
    assertActive: value => {
      if (sessions.get(value.id) !== value) throw new PdksError("Oturum bitti", "SESSION_EXPIRED", 401);
    },
    commitWhileActive: (value, action) => {
      if (sessions.get(value.id) !== value) throw new PdksError("Oturum bitti", "SESSION_EXPIRED", 401);
      return action();
    },
    disconnect: async req => { sessions.delete(req.cookies.get(SESSION_COOKIE)?.value); },
  };
  globalThis[storeKey] = new Map();
  process.env.POFIS_PLAN_DIR = directory;
  try { await run({ directory, sessions }); }
  finally {
    if (previousDirectory === undefined) delete process.env.POFIS_PLAN_DIR;
    else process.env.POFIS_PLAN_DIR = previousDirectory;
    if (previousManager === undefined) delete globalThis[managerKey];
    else globalThis[managerKey] = previousManager;
    if (previousStore === undefined) delete globalThis[storeKey];
    else globalThis[storeKey] = previousStore;
    const child = relative(root, directory);
    if (!child || child.startsWith("..") || resolve(root, child) !== directory)
      throw new Error("Invalid fixture directory");
    await rm(directory, { recursive: true, force: true });
  }
}

test("masaüstü deposu yoksa route kapalıdır; oturum ve hesap anahtarı zorunludur", async () => {
  await fixture(async () => {
    delete process.env.POFIS_PLAN_DIR;
    const disabled = await GET(request(alice));
    expect(disabled.status).toBe(404);
    expect(disabled.headers.get("Cache-Control")).toBe("no-store");
    const previous = await GET(request());
    expect(previous.status).toBe(404);
  });
  await fixture(async () => {
    const missing = await GET(request());
    expect(missing.status).toBe(401);
    expect(await missing.json()).toMatchObject({ code: "SESSION_EXPIRED" });
    const legacy = await GET(request(old));
    expect(legacy.status).toBe(401);
    expect(await legacy.json()).toMatchObject({ code: "SESSION_EXPIRED" });
  });
});

test("aynı hesabın farklı giriş yazımları aynı planı kullanır; başka hesap ayrılır", async () => {
  await fixture(async () => {
    const submitted = [];
    const createClient = () => new PdksClient({ fetchImpl: async (url, options) => {
      if (url.pathname.endsWith("/Giris.aspx")) {
        if (options.method === "POST") submitted.push(new URLSearchParams(options.body).get("tbUserName"));
        return new Response('<form><input name="tbUserName"><input name="tbPassword"></form>');
      }
      if (url.pathname.endsWith("/PizzyMain.aspx"))
        return new Response('<span id="ctl_RPPersonel_LblKisiAdiSoyadi">Fixture</span>');
      throw new Error("Unexpected fixture request");
    } });
    const manager = createSessionManager({ createClient });
    globalThis[managerKey] = manager;
    const tokens = [];
    try {
      for (const username of ["ismail.fixture@trt.net.tr", "ISMAIL.FIXTURE@trt.net.tr", "other.fixture"]) {
        tokens.push(await manager.connect({ username, password: "fixture-password" }));
      }
      expect(submitted).toEqual(["ismail.fixture", "ISMAIL.FIXTURE", "other.fixture"]);
      const original = await (await GET(request(tokens[0]))).json();
      const saved = await PUT(request(tokens[0], { ...original, plans: sevenHours }));
      expect(saved.status).toBe(200);
      const same = await (await GET(request(tokens[1]))).json();
      const other = await (await GET(request(tokens[2]))).json();
      expect(same.plans).toEqual(sevenHours);
      expect(same.session).not.toBe(original.session);
      expect(other.plans.defaultPlan).toEqual([480, 480, 480, 480, 480, 0, 0]);
    } finally {
      for (const token of tokens) await manager.disconnect(request(token));
    }
  });
});

test("A → B → A planları, oturum bağlayıcısı ve eşzamanlı yazılar hesapları karıştırmaz", async () => {
  await fixture(async () => {
    const first = await GET(request(alice));
    expect(first.status).toBe(200);
    expect(first.headers.get("Cache-Control")).toBe("no-store");
    const a = await first.json();
    expect(a.plans.defaultPlan).toEqual([480, 480, 480, 480, 480, 0, 0]);
    expect(a.revision).toMatch(/^[a-f0-9]{64}$/);
    expect(a.session).toMatch(/^[a-f0-9]{64}$/);
    expect(a.session).not.toBe(alice);
    expect(JSON.stringify(a)).not.toContain(aliceKey);

    const b = await (await GET(request(bob))).json();
    const savedA = await PUT(request(alice, { ...a, plans: sevenHours, accountKey: bobKey }));
    expect(savedA.status).toBe(200);
    const saved = await savedA.json();
    expect(saved.plans).toEqual(sevenHours);
    expect((await (await GET(request(bob))).json()).plans).toEqual(b.plans);

    const staleSession = await PUT(request(bob, { plans: sixHours, revision: b.revision, session: a.session }));
    expect(staleSession.status).toBe(409);
    expect(await staleSession.json()).toMatchObject({ code: "PLAN_SESSION_CHANGED" });

    const again = await (await GET(request(aliceAgain))).json();
    expect(again.plans).toEqual(sevenHours);
    expect(again.revision).toBe(saved.revision);
    expect(again.session).not.toBe(a.session);
    const previousSession = await PUT(request(aliceAgain, { ...saved, plans: sixHours }));
    expect(previousSession.status).toBe(409);
    expect(await previousSession.json()).toMatchObject({ code: "PLAN_SESSION_CHANGED" });

    const results = await Promise.all([
      PUT(request(alice, { ...saved, plans: sixHours })),
      PUT(request(aliceAgain, { ...again, plans: b.plans })),
    ]);
    expect(results.map(value => value.status).sort()).toEqual([200, 409]);
    const conflict = results.find(value => value.status === 409);
    expect(await conflict.json()).toMatchObject({ code: "PLAN_CONFLICT" });
    expect((await (await GET(request(aliceAgain))).json()).plans)
      .toEqual(results[0].status === 200 ? sixHours : b.plans);
    expect((await (await GET(request(bob))).json()).plans).toEqual(b.plans);
  });
});

test("istek boyutu ve şeması doğrulanır; bozuk dosya korunur", async () => {
  await fixture(async ({ directory }) => {
    const first = await (await GET(request(alice))).json();
    const invalid = await PUT(request(alice, { ...first, plans: { defaultPlan: [1] } }));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ code: "INVALID_INPUT" });
    expect((await PUT(request(alice, { ...first, revision: "invalid" }))).status).toBe(400);

    // Plan requests have their own 4 MiB limit; other JSON routes keep 32 KiB.
    const larger = await PUT(request(alice, { ...first, plans: sevenHours, padding: "x".repeat(33_000) }));
    expect(larger.status).toBe(200);
    const current = await larger.json();
    const tooLarge = await PUT(request(alice, { ...current, padding: "x".repeat(4 * 1024 * 1024) }));
    expect(tooLarge.status).toBe(413);

    const destination = join(directory, `${aliceKey}.json`);
    await writeFile(destination, "{broken");
    const read = await GET(request(alice));
    expect(read.status).toBe(500);
    expect(await read.json()).toMatchObject({ code: "PLAN_READ_FAILED" });
    const write = await PUT(request(alice, { ...current, plans: sixHours }));
    expect(write.status).toBe(500);
    expect(await write.json()).toMatchObject({ code: "PLAN_READ_FAILED" });
    expect(await readFile(destination, "utf8")).toBe("{broken");
  });
});
