import {
  json,
  readBody,
  failure,
  clearSessionCookies,
  sessionCookieOptions,
} from "@/server/http.js";
import {
  replaceSession,
  disconnect,
  sessionFor,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "@/server/session.js";
import { notificationSession } from "@/server/notification-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = await sessionFor(request);
    return json({ connected: !!session, ...(session ? { notificationSession: notificationSession(session) } : {}) });
  } catch (error) {
    return failure(error, request);
  }
}

export async function POST(request) {
  try {
    const id = await replaceSession(request, await readBody(request));
    const response = json({ connected: true });
    clearSessionCookies(response, request);
    response.cookies.set(SESSION_COOKIE, id, {
      ...sessionCookieOptions(request),
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    return failure(error, request);
  }
}

export async function DELETE(request) {
  try {
    await disconnect(request);
    const response = json({ connected: false });
    clearSessionCookies(response, request);
    return response;
  } catch (error) {
    return failure(error, request);
  }
}
