import { expect, spyOn, test } from "bun:test";
import { NextRequest } from "next/server";
import { GET } from "../app/api/meals/route";
import { mealSamples } from "../lib/meals/history-sample";
import { getMealPofiCommentary } from "../lib/meals/commentary";
import { presentMeal } from "../lib/meals/presentation";
import * as meals from "./meals";
import { PdksError } from "./pdks.js";

test("meal route uses session identity and returns only chosen text with the source menu", async () => {
  const symbol = Symbol.for("pofis.session-manager:account-key-v3");
  const globals = globalThis as typeof globalThis & Record<symbol, unknown>;
  const previous = globals[symbol];
  const menu = mealSamples.find((m) => m.date.startsWith("2026-10-20"))!;
  const source = spyOn(meals, "getMealForDate").mockResolvedValue(menu);
  globals[symbol] = {
    sessionFor: async (request: NextRequest) => {
      const accountKey = request.cookies.get("fixture-account")?.value;
      return accountKey ? { client: { self: { accountKey: accountKey } } } : null;
    },
    disconnect: async () => {},
    assertActive: () => {},
  };
  const request = (key?: string, date = "2026-10-20") => new NextRequest(
    `http://localhost/api/meals?date=${date}&accountKey=untrusted`,
    key ? { headers: { Cookie: `fixture-account=${key}` } } : undefined,
  );
  try {
    const denied = await GET(request());
    expect(denied.status).toBe(401);
    expect(source).not.toHaveBeenCalled();
    const selected = new Set<string>();
    for (let n = 0; n < 20; n++) {
      const accountKey = n.toString(16).padStart(64, "0");
      const response = await GET(request(accountKey));
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      const body = await response.json();
      expect(body).toEqual({
        menu,
        commentary: getMealPofiCommentary(presentMeal(menu), { date: "2026-10-20", accountKey })!.text,
      });
      expect(JSON.stringify(body)).not.toContain(accountKey);
      expect(body.scenarios).toBeUndefined();
      selected.add(body.commentary);
    }
    expect(selected.size).toBeGreaterThan(5);
    expect(menu).not.toHaveProperty("commentary");
    expect(source.mock.calls.every((args) => args.length === 1 && args[0] === "2026-10-20")).toBe(true);

    source.mockResolvedValueOnce(null);
    expect(await (await GET(request("a".repeat(64)))).json()).toEqual({ menu: null, commentary: null });

    source.mockRejectedValueOnce(new meals.MealInputError("bad date"));
    expect((await GET(request("a".repeat(64), "invalid"))).status).toBe(400);
  } finally {
    source.mockRestore();
    globals[symbol] = previous;
  }
});

test.each(["success", "failure"])("meal response rechecks a revoked session after source %s", async (outcome) => {
  const symbol = Symbol.for("pofis.session-manager:account-key-v3");
  const globals = globalThis as typeof globalThis & Record<symbol, unknown>;
  const previous = globals[symbol];
  const session = { client: { self: { accountKey: "b".repeat(64) } } };
  let active = true;
  const started = Promise.withResolvers<void>();
  const pending = Promise.withResolvers<Awaited<ReturnType<typeof meals.getMealForDate>>>();
  const source = spyOn(meals, "getMealForDate").mockImplementation(() => {
    started.resolve();
    return pending.promise;
  });
  globals[symbol] = {
    sessionFor: async () => session,
    disconnect: async () => {},
    assertActive: () => {
      if (!active) throw new PdksError("Fixture session expired", "SESSION_EXPIRED", 401);
    },
  };
  try {
    const responsePromise = GET(new NextRequest("http://localhost/api/meals?date=2026-10-20"));
    await started.promise;
    active = false;
    if (outcome === "success") pending.resolve(mealSamples.find((m) => m.date.startsWith("2026-10-20"))!);
    else pending.reject(new meals.MealSourceError("Fixture source failure"));
    const response = await responsePromise;
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "Fixture session expired", code: "SESSION_EXPIRED" });
  } finally {
    source.mockRestore();
    globals[symbol] = previous;
  }
});
