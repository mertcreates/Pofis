import { version } from "../../../../package.json";

export function GET() {
  return Response.json(
    { status: "ok", version, dataSource: "pdks" },
    { headers: {
      "Cache-Control": "no-store",
      ...(process.env.POFIS_DESKTOP_TOKEN
        ? { "X-Pofis-Desktop": process.env.POFIS_DESKTOP_TOKEN }
        : {}),
    } },
  );
}
