import { changelog } from "@/data/changelog";
import { compareChangelogVersions, parseChangelog } from "@/domain/changelog";
import { ui } from "@/lib/ui-text.js";
import { json } from "@/server/http.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_CHANGELOG = "https://pofis.app/releases/changelog.json";

export async function GET() {
  let releases = changelog;
  try {
    const response = await fetch(PUBLIC_CHANGELOG, {
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const remote = parseChangelog(await response.json());
    if (compareChangelogVersions(remote[0].version, releases[0].version) >= 0) releases = remote;
  } catch (error) {
    console.warn(ui.serverDiagnostics.changelogRefreshFailed, error instanceof Error ? error.message : "UnknownError");
  }
  return json({ releases });
}
