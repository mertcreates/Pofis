import { expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile, readdir } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { CookieJar } from "tough-cookie";
import { createSessionStorage } from "./session-storage.js";
import { createSessionManager, SESSION_COOKIE } from "./session-manager.js";

const request = (id) => ({
  cookies: {
    get: (name) => (name === SESSION_COOKIE ? { value: id } : undefined),
  },
});
const record = () => ({
  expiresAt: Date.now() + 60_000,
  jar: new CookieJar().serializeSync(),
  self: { pofiKey: "alice" },
});

test.each([undefined, "", "  ", 123])("Pofi anahtarı olmayan eski veya bozuk oturum yeniden giriş gerektirir: %s", async (pofiKey) => {
  const id = "f".repeat(64);
  const stored = { ...record(), self: { sourceId: "old-person", pofiKey } };
  const manager = createSessionManager({ storage: {
    read: async () => stored,
    save: async () => { throw new Error("Must not rewrite old identity"); },
    remove: async () => {},
  } });
  expect(await manager.sessionFor(request(id))).toBeNull();
  await expect(manager.requireSession(request(id))).rejects.toMatchObject({ code: "SESSION_EXPIRED", status: 401 });
});

test("yazma sırası ve silme atomik dosya değiştirme ile korunur; silinen oturum geri oluşmaz", async () => {
  const root = resolve("work/tests");
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, "async-sessions-"));
  try {
    const storage = createSessionStorage(directory);
    const id = "a".repeat(64);
    await Promise.all([
      storage.save(id, record()),
      storage.save(id, { ...record(), self: { pofiKey: "bob" } }),
    ]);
    expect((await storage.read(id)).self.pofiKey).toBe("bob");
    await Promise.all([storage.save(id, record()), storage.remove(id)]);
    expect(await storage.read(id)).toBeNull();
    expect(await readdir(directory)).toEqual([]);
    const bad = "b".repeat(64);
    await writeFile(join(directory, `${bad}.json`), "{broken");
    expect(await storage.read(bad)).toBeNull();
    await storage.save(id, record());
    expect((await storage.read(id)).self.pofiKey).toBe("alice");
    const expired = "e".repeat(64);
    await storage.save(expired, { ...record(), expiresAt: Date.now() - 1 });
    await storage.pruneExpired(Date.now());
    expect(await storage.read(expired)).toBeNull();
    expect((await storage.read(id)).self.pofiKey).toBe("alice");
    expect(await storage.read("../escape")).toBeNull();
  } finally {
    if (relative(root, directory).startsWith(".."))
      throw new Error("Fixture path escaped work directory");
    await rm(directory, { recursive: true, force: true });
  }
});

test("aynı oturumun ilk okumaları birleşir; disk okumasıyla yarışan çıkış geri yüklemeyi iptal eder", async () => {
  let release;
  let reads = 0;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const manager = createSessionManager({
    storage: {
      read: async () => {
        reads++;
        return pending;
      },
      save: async () => {},
      remove: async () => {},
    },
  });
  const id = "c".repeat(64);
  const first = manager.sessionFor(request(id));
  const second = manager.sessionFor(request(id));
  await manager.disconnect(request(id));
  release(record());
  expect(await first).toBeNull();
  expect(await second).toBeNull();
  expect(reads).toBe(1);
});

test("istek yalnız kendi kaydını okur; disk okuma hatası oturum başarısı gibi gösterilmez", async () => {
  const reads = [];
  const manager = createSessionManager({
    storage: {
      read: async (id) => {
        reads.push(id);
        throw Object.assign(new Error("fixture"), { code: "EACCES" });
      },
      save: async () => {},
      remove: async () => {},
    },
  });
  const id = "d".repeat(64);
  await expect(manager.sessionFor(request(id))).rejects.toMatchObject({
    code: "EACCES",
  });
  expect(reads).toEqual([id]);
});

test("diskte silme hatası çıkışı başarısız bildirir ve aynı süreçte eski kaydı canlandırmaz", async () => {
  let fail = true;
  let reads = 0;
  const manager = createSessionManager({
    storage: {
      read: async () => {
        reads++;
        return record();
      },
      save: async () => {},
      remove: async () => {
        if (fail) throw Object.assign(new Error("fixture"), { code: "EACCES" });
      },
    },
  });
  const id = "f".repeat(64);
  const session = await manager.requireSession(request(id));
  await expect(manager.disconnect(request(id))).rejects.toMatchObject({
    code: "EACCES",
  });
  expect(await manager.sessionFor(request(id))).toBeNull();
  expect(() => manager.assertActive(session)).toThrow();
  expect(session.client.signal.aborted).toBe(true);
  expect(reads).toBe(1);
  fail = false;
  await manager.disconnect(request(id));
});
