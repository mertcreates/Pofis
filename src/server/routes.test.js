import { test, expect, spyOn } from "bun:test";
import { NextRequest } from "next/server";
import { CookieJar } from "tough-cookie";
import {
  createSessionManager,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "./session-manager.js";
import {
  POST as connect,
  DELETE as disconnect,
} from "../app/api/session/route.js";
import { GET as report } from "../app/api/report/route.js";
import { POST as heartbeat } from "../app/api/session/heartbeat/route.js";
import { PdksClient, PdksError, PASSAGES_PATH } from "./pdks.js";

async function reportPersistenceFixture(cookieChange, sourceFailure) {
  let failWrites = false;
  let sourceCalls = 0;
  let client;
  const manager = createSessionManager({
    storage: {
      read: async () => null,
      save: async () => {
        if (failWrites)
          throw Object.assign(new Error("private fixture disk failure"), {
            code: "ENOSPC",
          });
      },
      remove: async () => {},
    },
    createClient: () => {
      client = new PdksClient({
        fetchImpl: async (url) => {
          sourceCalls++;
          if (sourceFailure === "network")
            throw new TypeError("private fixture connection failure");
          const sessionProbe = url.pathname.endsWith("/PizzyMain.aspx");
          return new Response(sessionProbe
            ? '<span id="ctl_RPPersonel_LblKisiAdiSoyadi">Fixture Person</span>'
            : "fixture", {
            status: sessionProbe ? 200 : sourceFailure || 200,
            headers: cookieChange && (sessionProbe || sourceFailure !== 500)
              ? { "Set-Cookie": "source=updated; Path=/" }
              : {},
          });
        },
      });
      client.login = async () => {
        client.self = {
          id: "self",
          sourceId: "fixture",
          name: "Fixture Person",
          unit: "",
          title: "",
        };
      };
      client.personalPassages = async () => {
        await client.request(PASSAGES_PATH);
        return [];
      };
      return client;
    },
  });
  const token = await manager.connect({ username: "fixture", password: "fixture" });
  failWrites = true;
  return {
    manager,
    client,
    request: new NextRequest(
      "http://localhost:3000/api/report?person=self&from=2026-10-12&to=2026-10-18",
      { headers: { Cookie: `${SESSION_COOKIE}=${token}` } },
    ),
    recoverStorage: () => { failWrites = false; },
    sourceCalls: () => sourceCalls,
  };
}

test.each([false, true])("başarılı raporun disk yazısı hata verirse başarı dönmez; depolama düzelince aynı oturum yeniden dener (çerez değişimi: %s)", async (cookieChange) => {
  const key = Symbol.for("pofis.session-manager");
  const previous = globalThis[key];
  const logger = spyOn(console, "error").mockImplementation(() => {});
  let fixture;
  try {
    fixture = await reportPersistenceFixture(cookieChange);
    globalThis[key] = fixture.manager;
    const failed = await report(fixture.request);
    const body = await failed.json();
    expect(failed.status).toBe(500);
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.person).toBeUndefined();
    expect(body.passages).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("private fixture");
    expect(failed.cookies.get(SESSION_COOKIE)).toBeUndefined();
    expect(await fixture.manager.sessionFor(fixture.request)).toBeTruthy();
    expect(fixture.client.reportCache).toBeUndefined();
    expect(logger.mock.calls.flat()).toContain("ENOSPC");
    fixture.recoverStorage();
    const recovered = await report(fixture.request);
    expect(recovered.status).toBe(200);
    expect((await recovered.json()).person.name).toBe("Fixture Person");
    expect(fixture.sourceCalls()).toBe(2);
  } finally {
    if (fixture) await fixture.manager.disconnect(fixture.request);
    if (previous) globalThis[key] = previous;
    else delete globalThis[key];
    logger.mockRestore();
  }
});

test.each(["network", 403, 500, 401])("ikincil disk yazısı hatası kaynak %s hatasını maskelemez", async (sourceFailure) => {
  const key = Symbol.for("pofis.session-manager");
  const previous = globalThis[key];
  const logger = spyOn(console, "error").mockImplementation(() => {});
  let fixture;
  try {
    fixture = await reportPersistenceFixture(true, sourceFailure);
    globalThis[key] = fixture.manager;
    const response = await report(fixture.request);
    const body = await response.json();
    expect(response.status).toBe(sourceFailure === 401 ? 401 : 502);
    expect(body.code).toBe(sourceFailure === 401 ? "SESSION_EXPIRED"
      : sourceFailure === "network" ? "CONNECTION_FAILED" : "SOURCE_ERROR");
    expect(body.person).toBeUndefined();
    expect(body.passages).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("private fixture");
    expect(logger.mock.calls.flat()).toContain("ENOSPC");
    expect(fixture.client.reportCache).toBeUndefined();
    if (sourceFailure === 500) {
      expect(body.details).toMatchObject({
        sourceStatus: 500,
        sessionCheck: "unverified",
        sessionCheckCode: "ENOSPC",
      });
      expect(fixture.sourceCalls()).toBe(2);
    }
    if (sourceFailure === 401) {
      expect(response.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
      expect(await fixture.manager.sessionFor(fixture.request)).toBeNull();
    } else {
      expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
      expect(await fixture.manager.sessionFor(fixture.request)).toBeTruthy();
    }
  } finally {
    if (fixture) await fixture.manager.disconnect(fixture.request);
    if (previous) globalThis[key] = previous;
    else delete globalThis[key];
    logger.mockRestore();
  }
});

test.each([403, 429, 500, "invalid-expiry"])("%s kaynak hatası giriş formu içerse de aktif oturumu korur", async (scenario) => {
  const key = Symbol.for("pofis.session-manager");
  const previous = globalThis[key];
  const logger = spyOn(console, "error").mockImplementation(() => {});
  const manager = createSessionManager({ createClient: () => {
    const client = new PdksClient({ fetchImpl: async (url) =>
      url.pathname.endsWith("/PizzyMain.aspx")
        ? new Response('<span id="ctl_RPPersonel_LblKisiAdiSoyadi">Fixture</span>')
        : new Response('<input name="tbPassword">', { status: Number(scenario) }) });
    client.login = async () => { client.self = { sourceId: "fixture", name: "Fixture" }; };
    client.report = () => scenario === "invalid-expiry"
      ? Promise.reject(new PdksError("fixture", "SESSION_EXPIRED", 500))
      : client.request(PASSAGES_PATH);
    return client;
  } });
  globalThis[key] = manager;
  let token;
  try {
    token = await manager.connect({ username: "fixture", password: "fixture" });
    const request = new NextRequest("http://localhost:3000/api/report?person=self&from=2026-10-12&to=2026-10-18", {
      headers: { Cookie: `${SESSION_COOKIE}=${token}` },
    });
    const response = await report(request);
    expect(response.status).toBe(scenario === "invalid-expiry" ? 500 : 502);
    expect((await response.json()).code).toBe(scenario === "invalid-expiry" ? "SESSION_EXPIRED" : "SOURCE_ERROR");
    expect(response.cookies.getAll()).toHaveLength(0);
    expect(await manager.sessionFor(request)).toBeTruthy();
  } finally {
    if (token) await manager.disconnect({ cookies: { get: name => name === SESSION_COOKIE ? { value: token } : undefined } });
    if (previous) globalThis[key] = previous; else delete globalThis[key];
    logger.mockRestore();
  }
});

test.each(["logout", "ttl", "network"])("rapor kaynak hatasında %s durumunu doğru sınıflandırır", async (scenario) => {
  const key = Symbol.for("pofis.session-manager");
  const previous = globalThis[key];
  let time = Date.now();
  let started;
  let rejectFetch;
  const entered = new Promise((resolve) => { started = resolve; });
  const manager = createSessionManager({
    clock: () => time,
    createClient: () => {
      const client = new PdksClient({
        fetchImpl: async (_, { signal }) => new Promise((_, reject) => {
          rejectFetch = reject;
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
          started();
        }),
      });
      client.login = async () => { client.self = { sourceId: "alice" }; };
      // Exercise the real transport and its merged session cancellation signal.
      client.report = () => client.request(PASSAGES_PATH);
      return client;
    },
  });
  globalThis[key] = manager;
  let token;
  try {
    token = await manager.connect({ username: "alice", password: "fixture" });
    const request = new NextRequest(
      "http://localhost:3000/api/report?person=self&from=2026-10-12&to=2026-10-18",
      { headers: { Cookie: `${SESSION_COOKIE}=${token}` } },
    );
    const pending = report(request);
    await entered;
    if (scenario === "logout") await manager.disconnect(request);
    else {
      if (scenario === "ttl") time += 8 * 60 * 60_000;
      rejectFetch(new TypeError("fixture connection failure"));
    }
    const response = await pending;
    expect(response.status).toBe(scenario === "network" ? 502 : 401);
    expect((await response.json()).code).toBe(scenario === "network" ? "CONNECTION_FAILED" : "SESSION_EXPIRED");
    if (scenario === "network") {
      expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
      expect(await manager.sessionFor(request)).toBeTruthy();
    } else {
      expect(response.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
      expect(await manager.sessionFor(request)).toBeNull();
    }
  } finally {
    rejectFetch?.(new Error("fixture cleanup"));
    if (token) await manager.disconnect({ cookies: { get: (name) => name === SESSION_COOKIE ? { value: token } : undefined } });
    if (previous) globalThis[key] = previous;
    else delete globalThis[key];
  }
});

test.each(["success", "credentials", "save", "old-delete", "rollback-delete"])("yeniden bağlantı %s sonucunda oturum sahipliğini korur", async (scenario) => {
  const key = Symbol.for("pofis.session-manager");
  const previous = globalThis[key];
  const sessions = new Map();
  const records = new Map();
  const created = [];
  let oldToken;
  let failDeletes = true;
  const errorLog = spyOn(console, "error").mockImplementation(() => {});
  const manager = createSessionManager({
    sessions,
    createClient: () => {
      const client = {
        jar: new CookieJar(),
        async login(username, password) {
          if (password === "bad") throw new PdksError("fixture", "AUTH_FAILED", 401);
          this.self = { sourceId: username };
        },
      };
      created.push(client);
      return client;
    },
    storage: {
      read: async (id) => records.get(id),
      save: async (id, record) => {
        if (oldToken && scenario === "save") throw Object.assign(new Error("fixture"), { code: "ENOSPC" });
        records.set(id, record);
      },
      remove: async (id) => {
        if (failDeletes && (scenario === "rollback-delete" || (scenario === "old-delete" && id === oldToken)))
          throw Object.assign(new Error("fixture"), { code: "EACCES" });
        records.delete(id);
      },
    },
  });
  globalThis[key] = manager;
  try {
    oldToken = await manager.connect({ username: "alice", password: "fixture" });
    const response = await connect(new NextRequest("http://localhost:3000/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `${SESSION_COOKIE}=${oldToken}` },
      body: JSON.stringify({ username: "bob", password: scenario === "credentials" ? "bad" : "fixture" }),
    }));
    expect(response.status).toBe(scenario === "success" ? 200 : scenario === "credentials" ? 401 : 500);
    const lookup = (id) => ({ cookies: { get: (name) => name === SESSION_COOKIE ? { value: id } : undefined } });
    if (scenario === "success") {
      const newToken = response.cookies.get(SESSION_COOKIE).value;
      expect(newToken).not.toBe(oldToken);
      expect((await manager.requireSession(lookup(newToken))).client.self.sourceId).toBe("bob");
      expect(await manager.sessionFor(lookup(oldToken))).toBeNull();
      expect([...records.keys()]).toEqual([newToken]);
      expect(sessions.size).toBe(1);
    } else if (scenario === "credentials" || scenario === "save") {
      expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
      expect((await manager.requireSession(lookup(oldToken))).client.self.sourceId).toBe("alice");
      expect([...records.keys()]).toEqual([oldToken]);
      expect(sessions.size).toBe(1);
    } else {
      expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
      expect(sessions.size).toBe(0);
      expect(created[0].signal.aborted).toBe(true);
      expect(created[1].signal.aborted).toBe(true);
      expect(records.size).toBe(scenario === "old-delete" ? 1 : 2);
      for (const id of records.keys()) expect(await manager.sessionFor(lookup(id))).toBeNull();
      expect(errorLog.mock.calls.flat()).toContain("Error");
      if (scenario === "rollback-delete") expect(errorLog.mock.calls.flat()).toContain("EACCES");
    }
  } finally {
    failDeletes = false;
    for (const id of new Set([...records.keys(), ...sessions.keys()]))
      await manager.disconnect({ cookies: { get: (name) => name === SESSION_COOKIE ? { value: id } : undefined } });
    errorLog.mockRestore();
    if (previous) globalThis[key] = previous;
    else delete globalThis[key];
  }
});

test.each([
  ["giriş", connect, "POST", "/api/session", 400],
  ["heartbeat", heartbeat, "POST", "/api/session/heartbeat", 401],
  ["çıkış", disconnect, "DELETE", "/api/session", 200],
])(
  "%s Origin ve Sec-Fetch-Site başlıklarıyla kısıtlanmaz",
  async (_, handler, method, path, status) => {
    for (const headers of [
      {},
      { Origin: "https://other.test" },
      { "Sec-Fetch-Site": "cross-site" },
      { Origin: "https://other.test", "Sec-Fetch-Site": "cross-site" },
    ]) {
      const response = await handler(
        new NextRequest(`http://pofis:3000${path}`, {
          method,
          headers: { "Content-Type": "application/json", ...headers },
          ...(method === "POST" ? { body: "{}" } : {}),
        }),
      );
      expect(response.status).toBe(status);
    }
  },
);

test("gerçek route zincirinde giriş çerezi iki kullanıcıyı ayırır; çıkış ve TTL erişimi kaldırır", async () => {
  let clock = Date.now();
  const key = Symbol.for("pofis.session-manager");
  const previous = globalThis[key];
  let logins = 0;
  globalThis[key] = createSessionManager({
    clock: () => clock,
    createClient: () => ({
      jar: new CookieJar(),
      self: null,
      async login(username) {
        logins++;
        this.self = { name: username, sourceId: username };
      },
      async report(id, from, to) {
        return {
          person: { id, name: this.self.name, unit: "", title: "" },
          from,
          to,
          passages: [],
          fetchedAt: new Date(clock).toISOString(),
        };
      },
      async personalProfile() {
        return this.self;
      },
    }),
  });
  const login = (name) =>
    connect(
      new NextRequest("http://localhost:3000/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, password: "fixture-password" }),
      }),
    );
  const request = (token, person = "self") =>
    new NextRequest(
      `http://localhost:3000/api/report?person=${person}&from=2026-10-12&to=2026-10-18`,
      { headers: { Cookie: `${SESSION_COOKIE}=${token}` } },
    );
  try {
    const a = await login("alice");
    const b = await login("bob");
    expect(logins).toBe(2);
    expect(a.status).toBe(200);
    const cookieA = a.cookies.get(SESSION_COOKIE).value;
    const cookieB = b.cookies.get(SESSION_COOKIE).value;
    expect(a.headers.get("set-cookie")).toContain("HttpOnly");
    expect(a.headers.get("set-cookie")).toContain("SameSite=strict");
    const resultA = await report(request(cookieA));
    const resultB = await report(request(cookieB));
    expect(resultA.headers.get("cache-control")).toBe("no-store");
    expect((await resultA.json()).person.name).toBe("alice");
    expect((await resultB.json()).person.name).toBe("bob");
    expect((await report(request(cookieA, "bob"))).status).toBe(400);
    await disconnect(
      new NextRequest("http://localhost:3000/api/session", {
        method: "DELETE",
        headers: { Cookie: `${SESSION_COOKIE}=${cookieA}` },
      }),
    );
    expect((await report(request(cookieA))).status).toBe(401);
    expect((await report(request(cookieB))).status).toBe(200);
    clock += SESSION_SECONDS * 1000;
    expect((await report(request(cookieB))).status).toBe(401);
  } finally {
    if (previous) globalThis[key] = previous;
    else delete globalThis[key];
  }
});

test("çıkışla yarışan rapor yanıtı eski kişinin verisini döndürmez", async () => {
  const key = Symbol.for("pofis.session-manager");
  const previous = globalThis[key];
  let release;
  let started;
  const entered = new Promise((resolve) => {
    started = resolve;
  });
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const manager = createSessionManager({
    createClient: () => ({
      jar: new CookieJar(),
      self: { sourceId: "alice" },
      async login() {},
      async report() {
        started();
        await gate;
        return { person: { name: "alice" } };
      },
      async personalProfile() {
        return this.self;
      },
    }),
  });
  globalThis[key] = manager;
  try {
    const token = await manager.connect({
      username: "alice",
      password: "fixture",
    });
    const request = new NextRequest(
      "http://localhost:3000/api/report?person=self&from=2026-10-12&to=2026-10-18",
      { headers: { Cookie: `${SESSION_COOKIE}=${token}` } },
    );
    const pending = report(request);
    await entered;
    await manager.disconnect(request);
    release();
    const response = await pending;
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain("alice");
  } finally {
    release();
    if (previous) globalThis[key] = previous;
    else delete globalThis[key];
  }
});

test("TLS ingress arkasında farklı Origin ile giriş, heartbeat, self raporu ve çıkış çalışır", async () => {
  const key = Symbol.for("pofis.session-manager");
  const previousManager = globalThis[key];
  const manager = createSessionManager({
    createClient: () => ({
      jar: new CookieJar(),
      self: { sourceId: "proxy-person", name: "Proxy Person" },
      async login() {},
      async report() {
        return { person: { id: "self", name: "Proxy Person" } };
      },
      async personalProfile() {
        return this.self;
      },
    }),
  });
  globalThis[key] = manager;
  let token;
  try {
    const response = await connect(
      new NextRequest("http://pofis:3000/api/session", {
        method: "POST",
        headers: {
          Origin: "https://other.test",
          "Sec-Fetch-Site": "cross-site",
          "X-Forwarded-Proto": "https",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: "fixture", password: "fixture" }),
      }),
    );
    expect(response.status).toBe(200);
    token = response.cookies.get(SESSION_COOKIE).value;
    expect(response.cookies.get(SESSION_COOKIE)).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: "strict",
    });
    const heartbeatResponse = await heartbeat(
      new NextRequest("http://pofis:3000/api/session/heartbeat", {
        method: "POST",
        headers: {
          Origin: "https://other.test",
          "Sec-Fetch-Site": "cross-site",
          Cookie: `${SESSION_COOKIE}=${token}`,
        },
      }),
    );
    expect(heartbeatResponse.status).toBe(200);
    const request = new NextRequest(
      "http://pofis:3000/api/report?person=self&from=2026-10-12&to=2026-10-18",
      { headers: { Cookie: `${SESSION_COOKIE}=${token}` } },
    );
    expect((await (await report(request)).json()).person.name).toBe(
      "Proxy Person",
    );
    const signedOut = await disconnect(
      new NextRequest("http://pofis:3000/api/session", {
        method: "DELETE",
        headers: {
          Origin: "https://other.test",
          "Sec-Fetch-Site": "cross-site",
          "X-Forwarded-Proto": "https",
          Cookie: `${SESSION_COOKIE}=${token}`,
        },
      }),
    );
    expect(signedOut.status).toBe(200);
    expect(signedOut.cookies.get(SESSION_COOKIE)).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: "strict",
      maxAge: 0,
    });
    expect((await report(request)).status).toBe(401);
  } finally {
    if (previousManager) globalThis[key] = previousManager;
    else delete globalThis[key];
    if (token)
      await manager.disconnect({
        cookies: {
          get: (name) =>
            name === SESSION_COOKIE ? { value: token } : undefined,
        },
      });
  }
});
