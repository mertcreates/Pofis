import { json, readBody, failure } from "@/server/http.js";
import { requireSession, assertSessionActive, commitWhileSessionActive } from "@/server/session.js";
import { createWorkPlanStorage } from "@/server/work-plan-storage.js";
import { workPlanSessionId, validPlanHash } from "@/server/work-plan-identity.js";
import { isAccountKey } from "@/domain/rules/account-identity";
import { PdksError } from "@/server/pdks.js";
import { ui } from "@/lib/ui-text.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PLAN_REQUEST_BYTES = 4 * 1024 * 1024;
const storageKey = Symbol.for("pofis.work-plan-storage:v1");

function storage() {
  const directory = process.env.POFIS_PLAN_DIR;
  if (!directory) throw new PdksError(ui.apiErrors.requestFailed, "NOT_FOUND", 404);
  const stores = (globalThis[storageKey] ||= new Map());
  if (!stores.has(directory)) stores.set(directory, createWorkPlanStorage(directory));
  return stores.get(directory);
}

async function context(request) {
  const store = storage();
  const session = await requireSession(request);
  const accountKey = session.client.self?.accountKey;
  if (!isAccountKey(accountKey))
    throw new PdksError(ui.apiErrors.sessionRequired, "SESSION_EXPIRED", 401);
  return {
    store,
    accountKey,
    session: workPlanSessionId(session),
    assertActive: () => assertSessionActive(session),
    commit: action => commitWhileSessionActive(session, action),
  };
}

export async function GET(request) {
  try {
    const current = await context(request);
    const result = await current.store.load(current.accountKey, current.assertActive);
    return json({ ...result, session: current.session });
  } catch (error) {
    return failure(error, request);
  }
}

export async function PUT(request) {
  try {
    const current = await context(request);
    const body = await readBody(request, MAX_PLAN_REQUEST_BYTES);
    if (!validPlanHash(body.revision) || !validPlanHash(body.session))
      throw new PdksError(ui.apiErrors.requestUnreadable, "INVALID_INPUT", 400);
    if (body.session !== current.session)
      throw new PdksError(ui.apiErrors.requestFailed, "PLAN_SESSION_CHANGED", 409);
    const result = await current.store.save(current.accountKey, body.plans, body.revision, current);
    return json({ ...result, session: current.session });
  } catch (error) {
    return failure(error, request);
  }
}
