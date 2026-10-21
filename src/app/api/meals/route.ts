import type { NextRequest } from "next/server";
import { ui } from "@/lib/ui-text.js";
import { json, failure } from "@/server/http.js";
import { requireSession, assertSessionActive } from "@/server/session.js";
import { getMealForDate, MealInputError, MealSourceError } from "@/server/meals";
import { getMealPofiCommentary } from "@/lib/meals/commentary";
import { presentMeal } from "@/lib/meals/presentation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const date = request.nextUrl.searchParams.get("date");
    if (!date) throw new MealInputError("Missing meal date");
    let menu;
    try {
      menu = await getMealForDate(date);
    } catch (error) {
      assertSessionActive(session);
      throw error;
    }
    assertSessionActive(session);
    const note = menu ? getMealPofiCommentary(presentMeal(menu), {
      date, accountKey: session.client.self.pofiKey,
    }) : null;
    return json({ menu, commentary: note?.text ?? null });
  } catch (error) {
    if (error instanceof MealInputError) {
      return json({ error: ui.meals.invalidDate, code: "INVALID_INPUT" }, 400);
    }
    if (error instanceof MealSourceError) {
      console.error("Meal source failed:", error.message);
      return json({ error: ui.meals.unavailable, code: "MEAL_SOURCE_UNAVAILABLE" }, 502);
    }
    return failure(error, request);
  }
}
