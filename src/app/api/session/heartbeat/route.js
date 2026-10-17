import { json, failure } from "@/server/http.js";
import { heartbeat } from "@/server/session.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await heartbeat(request);
    return json({ connected: true });
  } catch (error) {
    return failure(error, request);
  }
}
