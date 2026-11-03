import { expect, test } from "bun:test";
import { emptyWorkPlans, readDayPlan } from "@/domain/rules/work-plan";
import { ui } from "@/lib/ui-text.js";
import { createDesktopWorkPlans, readDesktopPlanSnapshot, type DesktopPlanState } from "./desktop-work-plans";

const sessionA = "a".repeat(64), sessionB = "b".repeat(64);
const revision1 = "1".repeat(64), revision2 = "2".repeat(64);
const original = emptyWorkPlans();
const changed = { ...original, defaultPlan: readDayPlan([420, 420, 420, 420, 420, 0, 0])! };
const snapshot = (session: string, revision = revision1, plans = original) => ({ session, revision, plans });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("sunucu planı oturum ve revizyon biçimiyle doğrulanır; yanlış oturum veya bozuk plan reddedilir", () => {
  expect(readDesktopPlanSnapshot(snapshot(sessionA), sessionA)).toEqual(snapshot(sessionA));
  expect(() => readDesktopPlanSnapshot(snapshot(sessionB), sessionA)).toThrow();
  expect(() => readDesktopPlanSnapshot({ ...snapshot(sessionA), revision: "bad" }, sessionA)).toThrow();
  expect(() => readDesktopPlanSnapshot({ ...snapshot(sessionA), plans: { defaultPlan: [1] } }, sessionA)).toThrow();
});

test("gecikmiş A okuması durdurulmuş oturumu geri getirmez; B kendi planını alır", async () => {
  const delayed = deferred<unknown>();
  const receivedA: DesktopPlanState[] = [], receivedB: DesktopPlanState[] = [];
  const first = createDesktopWorkPlans({ session: sessionA, receive: value => receivedA.push(value),
    onSaved() {}, onSessionChanged() {}, request: () => delayed.promise });
  const pending = first.reload();
  first.stop();
  const second = createDesktopWorkPlans({ session: sessionB, receive: value => receivedB.push(value),
    onSaved() {}, onSessionChanged() {}, request: async () => snapshot(sessionB, revision2, changed) });
  await second.reload();
  delayed.resolve(snapshot(sessionA));
  await pending;
  expect(receivedA).toEqual([]);
  expect(receivedB.at(-1)?.snapshot).toEqual(snapshot(sessionB, revision2, changed));
  second.stop();
});

test("kaydetme oturum ve revizyonu gönderir; eşzamanlı işlem engellenir ve bekleyen yenileme yazıdan sonra okunur", async () => {
  const held = deferred<unknown>();
  const states: DesktopPlanState[] = [];
  const requests: { method: string; body?: string }[] = [];
  let latest = snapshot(sessionA);
  let notifications = 0;
  const client = createDesktopWorkPlans({ session: sessionA, receive: value => states.push(value),
    onSaved() { notifications++; }, onSessionChanged() { throw new Error("unexpected session change"); },
    request: async (_path, options) => {
      requests.push({ method: options?.method ?? "GET", body: options?.body as string | undefined });
      return options?.method === "PUT" ? held.promise : latest;
    },
  });
  await client.reload();
  const saving = client.save(() => changed);
  expect(await client.save(() => original)).toBe(false);
  await client.reload();
  expect(requests.map(item => item.method)).toEqual(["GET", "PUT"]);
  expect(JSON.parse(requests[1].body!)).toEqual({ plans: changed, revision: revision1, session: sessionA });
  latest = snapshot(sessionA, revision2, changed);
  held.resolve(latest);
  expect(await saving).toBe(true);
  await Promise.resolve();
  expect(requests.map(item => item.method)).toEqual(["GET", "PUT", "GET"]);
  expect(states.at(-1)?.snapshot).toEqual(latest);
  expect(notifications).toBe(1);
  client.stop();
});

test("kaydetmeden önce başlayan geç okuma, başarılı yeni planı geri almaz", async () => {
  const oldRead = deferred<unknown>();
  const states: DesktopPlanState[] = [];
  let reads = 0;
  const client = createDesktopWorkPlans({ session: sessionA, receive: value => states.push(value), onSaved() {}, onSessionChanged() {},
    request: async (_path, options) => {
      if (options?.method === "PUT") return snapshot(sessionA, revision2, changed);
      reads++;
      return reads === 1 ? snapshot(sessionA) : oldRead.promise;
    },
  });
  await client.reload();
  const pending = client.reload();
  expect(await client.save(() => changed)).toBe(true);
  oldRead.resolve(snapshot(sessionA));
  await pending;
  expect(states.at(-1)?.snapshot).toEqual(snapshot(sessionA, revision2, changed));
  client.stop();
});

test("yazı hatası son planı korur; çakışma güncel planı okur ve hata mesajını tutar", async () => {
  const states: DesktopPlanState[] = [];
  let current = snapshot(sessionA);
  let errorCode = "PLAN_WRITE_FAILED";
  const client = createDesktopWorkPlans({ session: sessionA, receive: value => states.push(value), onSaved() {}, onSessionChanged() {},
    request: async (_path, options) => {
      if (options?.method === "PUT") throw { code: errorCode };
      return current;
    },
  });
  await client.reload();
  expect(await client.save(() => changed)).toBe(false);
  expect(states.at(-1)).toMatchObject({ snapshot: current, error: ui.desktopPlanWriteError, saving: false });
  current = snapshot(sessionA, revision2, changed);
  errorCode = "PLAN_CONFLICT";
  expect(await client.save(() => changed)).toBe(false);
  await Promise.resolve();
  expect(states.at(-1)).toMatchObject({ snapshot: current, error: ui.desktopPlanConflict, saving: false });
  client.stop();
});

test("oturum değişimi veya bozuk okuma eski planı kullanılamaz kılar", async () => {
  const states: DesktopPlanState[] = [];
  let changedSession = 0;
  let value: unknown = snapshot(sessionA);
  const client = createDesktopWorkPlans({ session: sessionA, receive: state => states.push(state), onSaved() {},
    onSessionChanged() { changedSession++; }, request: async () => value });
  await client.reload();
  value = snapshot(sessionB);
  await client.reload();
  expect(states.at(-1)).toMatchObject({ snapshot: null, error: ui.desktopPlanReadError });
  expect(changedSession).toBe(1);
  value = { ...snapshot(sessionA), plans: null };
  await client.reload();
  expect(states.at(-1)).toMatchObject({ snapshot: null, error: ui.desktopPlanReadError });
  expect(changedSession).toBe(1);
  client.stop();
});

for (const status of [401, 500]) {
  test(`plan okumasında SESSION_EXPIRED / ${status} yalnız 401'de oturum kontrolü başlatır`, async () => {
    const states: DesktopPlanState[] = [];
    let sessionChecks = 0;
    const client = createDesktopWorkPlans({ session: sessionA, receive: state => states.push(state), onSaved() {},
      onSessionChanged() { sessionChecks++; }, request: async () => { throw { code: "SESSION_EXPIRED", status }; } });
    await client.reload();
    expect(states.at(-1)).toMatchObject({ snapshot: null, saving: false, error: ui.desktopPlanReadError });
    expect(sessionChecks).toBe(status === 401 ? 1 : 0);
    client.stop();
  });

  test(`plan kaydında SESSION_EXPIRED / ${status} yalnız 401'de oturumu değiştirir`, async () => {
    const states: DesktopPlanState[] = [];
    let sessionChecks = 0;
    let saved = 0;
    const client = createDesktopWorkPlans({ session: sessionA, receive: state => states.push(state),
      onSaved() { saved++; }, onSessionChanged() { sessionChecks++; },
      request: async (_path, options) => {
        if (options?.method === "PUT") throw { code: "SESSION_EXPIRED", status };
        return snapshot(sessionA);
      },
    });
    await client.reload();
    expect(await client.save(() => changed)).toBe(false);
    expect(states.at(-1)).toMatchObject({
      snapshot: status === 401 ? null : snapshot(sessionA),
      saving: false,
      error: status === 401 ? ui.desktopPlanReadError : ui.desktopPlanWriteError,
    });
    expect(sessionChecks).toBe(status === 401 ? 1 : 0);
    expect(saved).toBe(0);
    client.stop();
  });
}
