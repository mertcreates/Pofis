import { isOwnReport } from "@/domain/rules/report-access";
import { json, failure } from "@/server/http.js";
import {
  requireSession,
  validDates,
  assertSessionActive,
} from "@/server/session.js";
import { PdksError } from "@/server/pdks.js";
import { ui } from "@/lib/ui-text.js";
import { dateKey } from "@/domain/rules/calendar";
import { pofiNotesForWeek } from "@/server/pofi-notes.js";
import { analyticsUserIdForAccount } from "@/server/analytics-identity";
import { notificationSession } from "@/server/notification-identity";
import { workPlanSessionId } from "@/server/work-plan-identity.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const params = request.nextUrl.searchParams;
    const id = params.get("person");
    const session = await requireSession(request);
    if (!isOwnReport(id))
      throw new PdksError(ui.apiErrors.invalidPerson, "INVALID_INPUT", 400);
    const from = params.get("from");
    const to = params.get("to");
    validDates(from, to);
    let report;
    let person;
    try {
      report = await session.client.report(id, from, to);
      person = await session.client.personalProfile();
    } catch (error) {
      // Revocation takes precedence over the transport error caused by its abort.
      assertSessionActive(session);
      throw error;
    }
    assertSessionActive(session);
    return json({
      ...report,
      notificationSession: { ...notificationSession(session),
        ...(process.env.POFIS_PLAN_DIR ? { workPlanSession: workPlanSessionId(session) } : {}),
      },
      analyticsUserId: analyticsUserIdForAccount(person.accountKey),
      pofiNotes: pofiNotesForWeek(dateKey(Date.now()), person.accountKey),
    });
  } catch (error) {
    return failure(error, request);
  }
}
