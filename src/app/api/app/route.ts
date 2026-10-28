import { json } from "@/server/http.js";
import { version } from "../../../../package.json";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  return json({ app: "pofis", version });
}
