import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { createWorkPlanStorage, workPlanSessionId } from "./work-plan-storage.js";
import { emptyWorkPlans } from "../domain/rules/work-plan";
import { PdksError } from "./pdks.js";
import { createSessionManager, SESSION_COOKIE } from "./session-manager.js";

async function fixture(run) {
  const root = resolve(tmpdir());
  const directory = await fs.mkdtemp(join(root, "pofis-work-plan-"));
  try { await run(directory); }
  finally {
    const child = relative(root, directory);
    if (!child || child.startsWith("..") || resolve(root, child) !== directory)
      throw new Error("Invalid fixture directory");
    await fs.rm(directory, { recursive: true, force: true });
  }
}

const active = () => {};
const authorization = { assertActive: active, commit: action => action() };
const alice = "a".repeat(64);
const bob = "b".repeat(64);
const sevenHours = { defaultPlan: [420, 420, 420, 420, 420, 0, 0], weekOverrides: {} };
const sixHours = { defaultPlan: [360, 360, 360, 360, 360, 0, 0], weekOverrides: {} };

test("hesap planları ayrı saklanır ve yeniden açılır; kanonik plan aynı revizyonu üretir", async () => {
  await fixture(async directory => {
    const store = createWorkPlanStorage(directory);
    const initial = await store.load(alice, active);
    expect(initial.plans).toEqual(emptyWorkPlans());
    expect(initial.revision).toMatch(/^[a-f0-9]{64}$/);
    expect((await store.load(bob, active)).plans).toEqual(emptyWorkPlans());

    const plans = { ...sevenHours, weekOverrides: {
      "2026-10-19": [390, 420, 420, 420, 420, 0, 0],
      "2026-10-12": [360, 420, 420, 420, 420, 0, 0],
    } };
    const saved = await store.save(alice, plans, initial.revision, authorization);
    const reordered = { weekOverrides: {
      "2026-10-12": [360, 420, 420, 420, 420, 0, 0],
      "2026-10-19": [390, 420, 420, 420, 420, 0, 0],
    }, defaultPlan: sevenHours.defaultPlan };
    const bobSaved = await store.save(bob, reordered, initial.revision, authorization);
    expect(bobSaved.revision).toBe(saved.revision);
    expect(await createWorkPlanStorage(directory).load(alice, active)).toEqual(saved);
    expect((await fs.readdir(directory)).sort()).toEqual([`${alice}.json`, `${bob}.json`]);
  });
});

test("aynı revizyona eşzamanlı yazılarda biri çatışır; kuyruk sonraki yazıda çalışır", async () => {
  await fixture(async directory => {
    const store = createWorkPlanStorage(directory);
    const first = await store.load(alice, active);
    const results = await Promise.allSettled([
      store.save(alice, sevenHours, first.revision, authorization),
      store.save(alice, sixHours, first.revision, authorization),
    ]);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("rejected");
    expect(results[1].reason).toMatchObject({ code: "PLAN_CONFLICT", status: 409 });
    const current = await store.load(alice, active);
    expect(current.plans).toEqual(sevenHours);
    await store.save(alice, sixHours, current.revision, authorization);
    expect((await store.load(alice, active)).plans).toEqual(sixHours);
  });
});

test("bozuk ve okunamayan kayıt varsayılan sayılmaz veya üzerine yazılmaz", async () => {
  await fixture(async directory => {
    const store = createWorkPlanStorage(directory);
    const initial = await store.load(alice, active);
    const destination = join(directory, `${alice}.json`);
    await fs.writeFile(destination, "{broken");
    await expect(store.load(alice, active)).rejects.toMatchObject({ code: "PLAN_READ_FAILED", status: 500 });
    await expect(store.save(alice, sevenHours, initial.revision, authorization)).rejects.toMatchObject({ code: "PLAN_READ_FAILED" });
    expect(await fs.readFile(destination, "utf8")).toBe("{broken");
    await fs.mkdir(join(directory, `${bob}.json`));
    await expect(store.load(bob, active)).rejects.toMatchObject({ code: "PLAN_READ_FAILED" });
  });
});

test("yeniden adlandırma hatası veya yazı sırasında biten oturum son kaydı korur", async () => {
  await fixture(async directory => {
    const store = createWorkPlanStorage(directory);
    const initial = await store.load(alice, active);
    const saved = await store.save(alice, sevenHours, initial.revision, authorization);
    const failing = createWorkPlanStorage(directory, { files: {
      ...fs, rename: async () => { throw Object.assign(new Error("fixture"), { code: "EACCES" }); },
    } });
    await expect(failing.save(alice, sixHours, saved.revision, authorization))
      .rejects.toMatchObject({ code: "PLAN_WRITE_FAILED", status: 500 });
    expect(await store.load(alice, active)).toEqual(saved);

    let connected = true;
    const revoked = createWorkPlanStorage(directory, { files: {
      ...fs, writeFile: async (...args) => { await fs.writeFile(...args); connected = false; },
    } });
    const assertActive = () => {
      if (!connected) throw new PdksError("Oturum bitti", "SESSION_EXPIRED", 401);
    };
    await expect(revoked.save(alice, sixHours, saved.revision, { ...authorization, assertActive }))
      .rejects.toMatchObject({ code: "SESSION_EXPIRED", status: 401 });
    expect(await store.load(alice, active)).toEqual(saved);
    expect(await fs.readdir(directory)).toEqual([`${alice}.json`]);
  });
});

test("başlamış plan kaydı tamamlanmadan çıkış bitmez; yeni kayıtlar reddedilir", async () => {
  await fixture(async directory => {
    const id = "c".repeat(64);
    const session = { id, expiresAt: Date.now() + 60_000, client: { self: { accountKey: alice } } };
    const manager = createSessionManager({ sessions: new Map([[id, session]]) });
    const request = { cookies: { get: name => name === SESSION_COOKIE ? { value: id } : undefined } };
    let releaseRename, startRename;
    let renamed = false, logoutBeforeRename = false;
    const held = new Promise(resolve => { releaseRename = resolve; });
    const started = new Promise(resolve => { startRename = resolve; });
    const store = createWorkPlanStorage(directory, { files: {
      ...fs, rename: async (...args) => { startRename(); await held; await fs.rename(...args); renamed = true; },
    } });
    const initial = await store.load(alice, active);
    const sessionAuthorization = { assertActive: () => manager.assertActive(session),
      commit: action => manager.commitWhileActive(session, action) };
    const save = store.save(alice, sevenHours, initial.revision, sessionAuthorization);
    await started;
    const logout = manager.disconnect(request).then(() => { logoutBeforeRename = !renamed; });
    expect(await manager.sessionFor(request)).toBeNull();
    releaseRename();
    const [saved, disconnected] = await Promise.allSettled([save, logout]);
    expect(saved.status).toBe("fulfilled");
    expect(disconnected.status).toBe("fulfilled");
    expect(logoutBeforeRename).toBe(false);
    expect((await store.load(alice, active)).plans).toEqual(sevenHours);
    await expect(store.save(alice, sixHours, saved.value.revision, sessionAuthorization))
      .rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });
});

test("dosya değişimi kabul edildikten sonra oturum süresi dolsa da kayıt tamamlanır", async () => {
  await fixture(async directory => {
    let now = 1_000;
    const id = "c".repeat(64);
    const session = { id, expiresAt: 2_000, client: { self: { accountKey: alice } } };
    const manager = createSessionManager({ sessions: new Map([[id, session]]), clock: () => now });
    const request = { cookies: { get: name => name === SESSION_COOKIE ? { value: id } : undefined } };
    let releaseRename, startRename;
    const held = new Promise(resolve => { releaseRename = resolve; });
    const started = new Promise(resolve => { startRename = resolve; });
    const store = createWorkPlanStorage(directory, { files: {
      ...fs, rename: async (...args) => { startRename(); await held; await fs.rename(...args); },
    } });
    const initial = await store.load(alice, active);
    const sessionAuthorization = { assertActive: () => manager.assertActive(session),
      commit: action => manager.commitWhileActive(session, action) };
    const save = store.save(alice, sevenHours, initial.revision, sessionAuthorization);
    await started;
    now = session.expiresAt;
    const expired = manager.sessionFor(request);
    expect(() => manager.assertActive(session)).toThrow();
    releaseRename();
    expect((await save).plans).toEqual(sevenHours);
    expect(await expired).toBeNull();
    expect((await store.load(alice, active)).plans).toEqual(sevenHours);
  });
});

test("plan dosyası değişimi başarısız olduğunda bekleyen çıkış tamamlanır", async () => {
  await fixture(async directory => {
    const id = "c".repeat(64);
    const session = { id, expiresAt: Date.now() + 60_000, client: { self: { accountKey: alice } } };
    const manager = createSessionManager({ sessions: new Map([[id, session]]) });
    const request = { cookies: { get: name => name === SESSION_COOKIE ? { value: id } : undefined } };
    const store = createWorkPlanStorage(directory);
    const initial = await store.load(alice, active);
    const previous = await store.save(alice, sevenHours, initial.revision, authorization);
    let releaseRename, startRename;
    const held = new Promise(resolve => { releaseRename = resolve; });
    const started = new Promise(resolve => { startRename = resolve; });
    const failing = createWorkPlanStorage(directory, { files: {
      ...fs, rename: async () => {
        startRename();
        await held;
        throw Object.assign(new Error("fixture"), { code: "EACCES" });
      },
    } });
    const sessionAuthorization = { assertActive: () => manager.assertActive(session),
      commit: action => manager.commitWhileActive(session, action) };
    const save = failing.save(alice, sixHours, previous.revision, sessionAuthorization);
    await started;
    const logout = manager.disconnect(request);
    expect(await manager.sessionFor(request)).toBeNull();
    releaseRename();
    const [saved, disconnected] = await Promise.allSettled([save, logout]);
    expect(saved.status).toBe("rejected");
    expect(saved.reason).toMatchObject({ code: "PLAN_WRITE_FAILED", status: 500 });
    expect(disconnected.status).toBe("fulfilled");
    expect(await store.load(alice, active)).toEqual(previous);
    expect(await fs.readdir(directory)).toEqual([`${alice}.json`]);
  });
});

test("hesap anahtarı ve oturum bağlayıcısı biçimlenir; geçersiz anahtar dosyaya erişmez", async () => {
  await fixture(async directory => {
    const store = createWorkPlanStorage(directory);
    expect(() => store.load("../escape", active)).toThrow();
    expect(() => workPlanSessionId({ id: "bad" })).toThrow();
    const one = workPlanSessionId({ id: "c".repeat(64) });
    expect(one).toMatch(/^[a-f0-9]{64}$/);
    expect(one).not.toBe("c".repeat(64));
    expect(workPlanSessionId({ id: "d".repeat(64) })).not.toBe(one);
    expect(await fs.readdir(directory)).toEqual([]);
  });
});
