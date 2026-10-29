import { expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/session/route.js";
import { SESSION_COOKIE } from "./session-manager.js";
import { workPlanSessionId } from "./work-plan-storage.js";

const managerKey = Symbol.for("pofis.session-manager:account-key-v3");
const token = "a".repeat(64);
const accountKey = "b".repeat(64);

test("eski oturum web ve masaüstünde yeniden giriş ister; yeni oturum aynı hesap kimliğini kullanır", async () => {
  const previousManager = globalThis[managerKey];
  const previousDirectory = process.env.POFIS_PLAN_DIR;
  const session = { id: token, expiresAt: Date.now() + 60_000,
    client: { self: { pofiKey: "fixture-account", planKey: accountKey } } };
  globalThis[managerKey] = { sessionFor: async () => session };
  const request = new NextRequest("http://localhost:3000/api/session");
  try {
    delete process.env.POFIS_PLAN_DIR;
    expect(await (await GET(request)).json()).toEqual({ connected: false });

    process.env.POFIS_PLAN_DIR = "fixture-only";
    expect(await (await GET(request)).json()).toEqual({ connected: false });

    session.client.self = { accountKey: "invalid" };
    expect(await (await GET(request)).json()).toEqual({ connected: false });

    session.client.self = { accountKey };
    const response = await GET(request);
    const body = await response.json();
    expect(body.connected).toBe(true);
    expect(body.workPlanSession).toBe(workPlanSessionId(session));
    expect(body.workPlanSession).not.toBe(token);
    expect(JSON.stringify(body)).not.toContain(accountKey);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    delete process.env.POFIS_PLAN_DIR;
    expect(await (await GET(request)).json()).toMatchObject({ connected: true });
  } finally {
    if (previousManager === undefined) delete globalThis[managerKey];
    else globalThis[managerKey] = previousManager;
    if (previousDirectory === undefined) delete process.env.POFIS_PLAN_DIR;
    else process.env.POFIS_PLAN_DIR = previousDirectory;
  }
});

test("masaüstü giriş yanıtındaki bağlayıcı yeni oturuma aittir", async () => {
  const previousManager = globalThis[managerKey];
  const previousDirectory = process.env.POFIS_PLAN_DIR;
  globalThis[managerKey] = { replaceSession: async () => token };
  process.env.POFIS_PLAN_DIR = "fixture-only";
  try {
    const request = new NextRequest("http://localhost:3000/api/session", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "fixture", password: "fixture" }),
    });
    const response = await POST(request);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ connected: true, workPlanSession: workPlanSessionId({ id: token }) });
    expect(response.cookies.get(SESSION_COOKIE).value).toBe(token);
    expect(JSON.stringify(body)).not.toContain(token);
  } finally {
    if (previousManager === undefined) delete globalThis[managerKey];
    else globalThis[managerKey] = previousManager;
    if (previousDirectory === undefined) delete process.env.POFIS_PLAN_DIR;
    else process.env.POFIS_PLAN_DIR = previousDirectory;
  }
});
