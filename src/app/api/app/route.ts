import { json } from "@/server/http.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  return json({ app: "pofis", version: "0.1.0" });
}
