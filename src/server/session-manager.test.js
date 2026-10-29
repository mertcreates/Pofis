import { test, expect, spyOn } from "bun:test";
import { CookieJar } from "tough-cookie";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  createSessionManager,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "./session-manager.js";
import { createSessionStorage } from "./session-storage.js";
import { PdksError } from "./pdks.js";

const fixtureAccountKey = value => createHash("sha256").update(value).digest("hex");
const request = (id, cookieName = SESSION_COOKIE) => ({
  cookies: {
    get: (name) => (name === cookieName && id ? { value: id } : undefined),
  },
});
function clientFactory(clock, check = async () => 200) {
  return () => ({
    jar: new CookieJar(),
    self: null,
    lastRequestAt: clock(),
    async login(username, password) {
      if (password !== "fixture-password")
        throw new PdksError("Reddedildi", "AUTH_FAILED", 401);
      this.self = { id: "self", name: username, accountKey: fixtureAccountKey(username) };
      await this.jar.setCookie(
        `identity=${username}; Path=/`,
        "https://pdks.trt.net.tr",
      );
    },
    async run(action) {
      return action();
    },
    checkSession: check,
  });
}

test("oturumlar kişiyi ve çerez kavanozunu ayırır; rastgele token ve 8 saat sınırı", async () => {
  let time = Date.now();
  const manager = createSessionManager({
    clock: () => time,
    createClient: clientFactory(() => time),
  });
  const a = await manager.connect({
    username: "alice",
    password: "fixture-password",
  });
  const b = await manager.connect({
    username: "bob",
    password: "fixture-password",
  });
  expect(a).toMatch(/^[a-f0-9]{64}$/);
  expect(a).not.toBe(b);
  expect((await manager.requireSession(request(a))).client.self.name).toBe(
    "alice",
  );
  expect(
    await (
      await manager.requireSession(request(b))
    ).client.jar.getCookieString("https://pdks.trt.net.tr"),
  ).toBe("identity=bob");
  await expect(manager.requireSession(request("forged"))).rejects.toMatchObject(
    { code: "SESSION_EXPIRED" },
  );
  await manager.disconnect(request(a));
  expect(await manager.sessionFor(request(a))).toBeFalsy();
  expect(await manager.sessionFor(request(b))).toBeTruthy();
  time += SESSION_SECONDS * 1000;
  await expect(manager.requireSession(request(b))).rejects.toMatchObject({
    code: "SESSION_EXPIRED",
  });
});

test("diskten geri yükler, parolayı saklamaz ve çıkış yalnız ilgili dosyayı siler", async () => {
  const root = join(process.cwd(), "work", "tests");
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, "sessions-"));
  try {
    const options = {
      storage: createSessionStorage(directory),
      createClient: clientFactory(Date.now),
    };
    const first = createSessionManager(options);
    const a = await first.connect({
      username: "alice",
      password: "fixture-password",
    });
    const b = await first.connect({
      username: "bob",
      password: "fixture-password",
    });
    const record = readFileSync(join(directory, `${a}.json`), "utf8");
    expect(record).not.toContain("fixture-password");
    expect(Object.keys(JSON.parse(record)).sort()).toEqual([
      "expiresAt",
      "jar",
      "lastRequestAt",
      "self",
      "version",
    ]);
    const restored = createSessionManager(options);
    expect(
      await (
        await restored.requireSession(request(a))
      ).client.jar.getCookieString("https://pdks.trt.net.tr"),
    ).toBe("identity=alice");
    await restored.disconnect(request(a));
    expect(readdirSync(directory)).toEqual([`${b}.json`]);
    await restored.disconnect(request(b));
    await first.disconnect(request(a));
    await first.disconnect(request(b));
  } finally {
    const child = relative(root, directory);
    if (!child || child.startsWith("..") || resolve(root, child) !== directory)
      throw new Error("Invalid fixture directory");
    rmSync(directory, { recursive: true, force: true });
  }
});

test("e-posta ile giriş kullanıcı adıyla aynı PDKS kimliğini kullanır", async () => {
  const manager = createSessionManager({ createClient: clientFactory(Date.now) });
  for (const username of [
    "mert.ercan",
    "mert.ercan@trt.net.tr",
    "  mert.ercan@trt.net.tr  ",
    "  mert.ercan  ",
    "mert.ercan@example.com",
  ]) {
    const id = await manager.connect({ username, password: "fixture-password" });
    try {
      const { client } = await manager.requireSession(request(id));
      expect(client.self.name).toBe("mert.ercan");
      expect(client.self.accountKey).toBe(fixtureAccountKey("mert.ercan"));
      expect(await client.jar.getCookieString("https://pdks.trt.net.tr")).toBe(
        "identity=mert.ercan",
      );
    } finally {
      await manager.disconnect(request(id));
    }
  }
});

test("hatalı parola ve geçersiz alanlar oturum oluşturmaz", async () => {
  const records = [];
  const manager = createSessionManager({
    createClient: clientFactory(Date.now),
    storage: {
      read: async () => null,
      save: (...args) => records.push(args),
      remove() {},
    },
  });
  const rejected = { username: "alice", password: "bad" };
  await expect(manager.connect(rejected)).rejects.toMatchObject({ code: "AUTH_FAILED" });
  expect(rejected).toEqual({});
  for (const username of ["", "   ", "@trt.net.tr", "  @trt.net.tr", `a@${"b".repeat(199)}`]) {
    await expect(
      manager.connect({ username, password: "fixture-password" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  }
  expect(records).toHaveLength(0);
});

test.each([undefined, "", "invalid", "A".repeat(64)])(
  "kaynak girişi geçersiz hesap anahtarı üretirse oturum oluşturulmaz: %s",
  async (accountKey) => {
    const sessions = new Map();
    const records = [];
    let loginCalls = 0;
    const body = { username: "alice", password: "fixture-password" };
    const manager = createSessionManager({
      sessions,
      createClient: () => ({
        self: { accountKey },
        async login() { loginCalls++; },
      }),
      storage: {
        save: async (...args) => { records.push(args); },
      },
    });

    await expect(manager.connect(body)).rejects.toThrow("Oturum kaydı geçersiz.");
    expect(loginCalls).toBe(1);
    expect(records).toHaveLength(0);
    expect(sessions.size).toBe(0);
    expect(body).toEqual({});
  },
);

test.each([
  { username: "", password: "fixture-password" },
  { username: "@trt.net.tr", password: "fixture-password" },
  { username: `a@${"b".repeat(199)}`, password: "fixture-password" },
  { username: "alice", password: "" },
  { username: "alice", password: "x".repeat(1001) },
  { username: 123, password: "fixture-password" },
  { username: "alice", password: 123 },
])("geçersiz girişte kimlik alanları temizlenir ve kaynak çağrılmaz", async (credentials) => {
  const body = { ...credentials, marker: "preserved" };
  const manager = createSessionManager({
    createClient: () => { throw new Error("Geçersiz giriş kaynak istemcisi oluşturmamalı."); },
  });
  await expect(manager.connect(body)).rejects.toMatchObject({ code: "INVALID_INPUT", status: 400 });
  expect(body).toEqual({ marker: "preserved" });
});

test("kaynak istemcisi oluşturulamazsa giriş alanları temizlenir", async () => {
  const body = { username: "alice", password: "fixture-password" };
  const manager = createSessionManager({ createClient: () => { throw new Error("fixture client failure"); } });
  await expect(manager.connect(body)).rejects.toThrow("fixture client failure");
  expect(body).toEqual({});
});

test("sınırdaki geçerli bilgiler temizlenmiş istekten kaynağa değişmeden aktarılır", async () => {
  const username = "a".repeat(200), password = "p".repeat(1000);
  const body = { username, password, marker: "preserved" };
  const manager = createSessionManager({ createClient: () => ({
    jar: new CookieJar(), self: { accountKey: fixtureAccountKey("verified-person") },
    async login(receivedUsername, receivedPassword) {
      expect(body).toEqual({ marker: "preserved" });
      expect(receivedUsername).toBe(username);
      expect(receivedPassword).toBe(password);
    },
  }) });
  const id = await manager.connect(body);
  try { expect((await manager.requireSession(request(id))).client.self.accountKey).toBe(fixtureAccountKey("verified-person")); }
  finally { await manager.disconnect(request(id)); }
});

test("oturum yalnız güncel çerez adından yüklenir", async () => {
  const manager = createSessionManager({ createClient: clientFactory(Date.now) });
  const id = await manager.connect({
    username: "alice",
    password: "fixture-password",
  });

  expect(await manager.sessionFor(request(id, "pdks_local_session"))).toBeNull();
  await manager.disconnect(request(id, "pdks_local_session"));
  expect(await manager.sessionFor(request(id))).toBeTruthy();
  await manager.disconnect(request(id));
});

test("2.000 paralel oturum ayrı kimlik ve çerezlerle çalışır; çıkış yalnız ilgili kişiyi kaldırır", async () => {
  const sessions = new Map();
  const manager = createSessionManager({
    createClient: clientFactory(Date.now),
    sessions,
  });
  const ids = await Promise.all(
    Array.from({ length: 2000 }, (_, i) =>
      manager.connect({ username: `person${i}`, password: "fixture-password" }),
    ),
  );
  expect(new Set(ids).size).toBe(2000);
  const later = await manager.connect({
    username: "after-burst",
    password: "fixture-password",
  });
  expect(
    (await manager.requireSession(request(later))).client.self.accountKey,
  ).toBe(fixtureAccountKey("after-burst"));
  await manager.disconnect(request(later));
  for (const [i, id] of ids.entries()) {
    const session = await manager.requireSession(request(id));
    expect(session.client.self.accountKey).toBe(fixtureAccountKey(`person${i}`));
    expect(
      await session.client.jar.getCookieString("https://pdks.trt.net.tr"),
    ).toBe(`identity=person${i}`);
  }
  await manager.disconnect(request(ids[0]));
  expect(await manager.sessionFor(request(ids[0]))).toBeFalsy();
  expect(
    (await manager.requireSession(request(ids[1999]))).client.self.accountKey,
  ).toBe(fixtureAccountKey("person1999"));
  await Promise.all(ids.slice(1).map((id) => manager.disconnect(request(id))));
});

test("heartbeat 20 dakika sonra kontrol eder; lease yoksa susar; kaynak oturumu biterse temizler", async () => {
  let time = Date.now();
  let checks = 0;
  let expired = false;
  const manager = createSessionManager({
    clock: () => time,
    createClient: clientFactory(
      () => time,
      async () => {
        checks++;
        if (expired) throw new PdksError("Bitti", "SESSION_EXPIRED", 401);
      },
    ),
  });
  const id = await manager.connect({
    username: "alice",
    password: "fixture-password",
  });
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  await manager.heartbeat(request(id));
  await manager.checkKeepAlive();
  await settle();
  expect(checks).toBe(0);
  time += 21 * 60000;
  await manager.checkKeepAlive();
  await settle();
  expect(checks).toBe(0);
  await manager.heartbeat(request(id));
  await manager.checkKeepAlive();
  await settle();
  expect(checks).toBe(1);
  expired = true;
  time += 21 * 60000;
  await manager.heartbeat(request(id));
  await manager.checkKeepAlive();
  await settle();
  expect(await manager.sessionFor(request(id))).toBeFalsy();
  expect(checks).toBe(2);
});

test("keepalive tutarsız SESSION_EXPIRED/500 yanıtında oturumu düşürmez", async () => {
  let time = Date.now();
  const logger = spyOn(console, "error").mockImplementation(() => {});
  const manager = createSessionManager({
    clock: () => time,
    createClient: clientFactory(() => time, async () => { throw new PdksError("fixture", "SESSION_EXPIRED", 500); }),
  });
  let id;
  try {
    id = await manager.connect({ username: "fixture", password: "fixture-password" });
    time += 21 * 60000;
    await manager.heartbeat(request(id));
    await manager.checkKeepAlive();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(await manager.sessionFor(request(id))).toBeTruthy();
    expect(logger).toHaveBeenCalled();
  } finally {
    if (id) await manager.disconnect(request(id));
    logger.mockRestore();
  }
});

test("giriş isteğinin kimlik alanları işlem sonunda tutulmaz; oturumda yalnız profil ve hesap anahtarı kalır", async () => {
  const body = { username: "credential-user", password: "credential-secret" };
  const manager = createSessionManager({
    createClient: () => ({
      jar: new CookieJar(),
      self: { accountKey: fixtureAccountKey("verified-person") },
      async login(username, password) {
        expect(username).toBe("credential-user");
        expect(password).toBe("credential-secret");
      },
    }),
  });
  const token = await manager.connect(body);
  try {
    expect(body).toEqual({});
    const session = await manager.requireSession(request(token));
    expect(JSON.stringify(session)).not.toContain("credential-user");
    expect(JSON.stringify(session)).not.toContain("credential-secret");
    expect(session.client.self.accountKey).toBe(fixtureAccountKey("verified-person"));
  } finally {
    await manager.disconnect(request(token));
  }
});

test.each(["prune", "expired-delete"])("%s hatası sağlıklı oturumların keepalive işlemini engellemez", async (fault) => {
  let time = Date.now();
  let checks = 0;
  let scans = 0;
  const sessions = new Map();
  const errorLog = spyOn(console, "error").mockImplementation(() => {});
  const manager = createSessionManager({
    clock: () => time,
    sessions,
    createClient: clientFactory(() => time, async () => { checks++; }),
    storage: {
      read: async () => null,
      save: async () => {},
      remove: async () => {
        if (fault === "expired-delete")
          throw Object.assign(new Error("fixture"), { code: "EACCES" });
      },
      pruneExpired: async () => {
        scans++;
        if (fault === "prune")
          throw Object.assign(new Error("fixture"), { code: "EACCES" });
      },
    },
  });
  const ids = [];
  try {
    for (const name of ["alice", "bob", "expired"])
      ids.push(await manager.connect({ username: name, password: "fixture-password" }));
    const expired = sessions.get(ids[2]);
    time += 61 * 60_000;
    expired.expiresAt = time;
    await manager.heartbeat(request(ids[0]));
    await manager.heartbeat(request(ids[1]));
    await manager.checkKeepAlive();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(checks).toBe(2);
    expect(sessions.has(ids[2])).toBe(false);
    expect(expired.client.signal.aborted).toBe(true);
    expect(errorLog.mock.calls.flat()).toContain("EACCES");
    await manager.checkKeepAlive();
    expect(scans).toBe(1);
  } finally {
    await Promise.allSettled(ids.map((id) => manager.disconnect(request(id))));
    errorLog.mockRestore();
  }
});
