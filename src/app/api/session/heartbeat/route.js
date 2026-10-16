import {
  json,
  failure,
  migrateSessionCookie,
} from "@/server/http.js";
import { heartbeat } from "@/server/session.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const session = await heartbeat(request);
    return migrateSessionCookie(json({ connected: true }), request, session);
  } catch (error) {
    return failure(error, request);
  }
}
