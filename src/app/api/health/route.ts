export function GET() {
  return Response.json(
    { status: "ok", version: "0.1.0", dataSource: "pdks" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
