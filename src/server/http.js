import { SESSION_POLICY } from "../domain/rules/session-policy";
import { HTTP_POLICY } from "../domain/rules/source-policy";
import { NextResponse } from "next/server";
import { PdksError } from "./pdks.js";
import { disconnect, SESSION_COOKIE } from "./session.js";
import { ui } from "../lib/ui-text.js";
import { isSessionExpired, readDiagnosticDetails } from "../lib/pdks-failure";

export function json(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function sessionCookieOptions(request) {
  return {
    httpOnly: SESSION_POLICY.cookieHttpOnly,
    sameSite: SESSION_POLICY.cookieSameSite,
    path: SESSION_POLICY.cookiePath,
    secure:
      request.nextUrl.protocol === "https:" ||
      request.headers.get("x-forwarded-proto")?.split(",")[0].trim() === "https",
  };
}

export function clearSessionCookies(response, request) {
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(request),
    maxAge: 0,
  });
}

export async function readBody(request, maxBytes = HTTP_POLICY.maxJsonBytes) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new PdksError(ui.apiErrors.jsonRequired, "INVALID_INPUT", 400);
  const reader = request.body?.getReader();
  if (!reader)
    throw new PdksError(ui.apiErrors.emptyRequest, "INVALID_INPUT", 400);
  const parts = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new PdksError(ui.apiErrors.requestTooLarge, "INVALID_INPUT", 413);
    }
    parts.push(value);
  }
  try {
    const body = JSON.parse(Buffer.concat(parts).toString("utf8"));
    if (!body || Array.isArray(body) || typeof body !== "object")
      throw new Error();
    return body;
  } catch {
    throw new PdksError(ui.apiErrors.requestUnreadable, "INVALID_INPUT", 400);
  }
}

export async function failure(error, request) {
  if (!(error instanceof PdksError)) {
    console.error(ui.serverDiagnostics.pdksApiUnexpectedError, error?.name || "UnknownError");
    return json(
      {
        error: ui.apiErrors.requestFailed,
        code: "INTERNAL_ERROR",
        details: {
          type: "UnexpectedError",
          diagnostic: ui.apiErrors.unexpectedServerError,
          occurredAt: new Date().toISOString(),
        },
      },
      500,
    );
  }
  const response = json(
    {
      error: error.message,
      code: error.code,
      details: {
        type: "PdksError",
        diagnostic: error.message,
        ...readDiagnosticDetails(error.details),
        apiPath: request.nextUrl.pathname,
        apiMethod: request.method,
        occurredAt: new Date().toISOString(),
      },
    },
    error.status,
  );
  // A delayed failure must not clear a newer session cookie in the browser.
  if (isSessionExpired(error)) {
    try {
      await disconnect(request);
    } catch (cleanupError) {
      console.error(
        ui.serverDiagnostics.pdksSessionCleanupFailed,
        cleanupError.code || cleanupError.name,
      );
    }
  }
  return response;
}
