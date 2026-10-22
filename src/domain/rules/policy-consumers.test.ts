import { expect, test } from "bun:test";
import { resolve } from "node:path";

// Each run gets a fresh module graph. The altered policy never touches repository files.
function consumers(altered: boolean) {
  const script = `
    import { plugin } from "bun";
    if (${altered}) plugin({ name: "policy-change", setup(build) {
      build.onLoad({ filter: /[\\\\/]domain[\\\\/]rules[\\\\/](notifications|work-plan|report-access|calendar)\\.ts$/ }, async ({ path }) => ({
        loader: "ts",
        contents: (await Bun.file(path).text())
          .replace("minLeadMinutes: 1,", "minLeadMinutes: 6,")
          .replace("maxLeadMinutes: 120,", "maxLeadMinutes: 20,")
          .replace("defaultLeadMinutes: 10,", "defaultLeadMinutes: 12,")
          .replace("maxDailyMinutes: 960", "maxDailyMinutes: 720")
          .replace("maxDays: 93", "maxDays: 31")
          .replace('TIME_ZONE = "Europe/Istanbul"', 'TIME_ZONE = "America/New_York"')
          .replace('return addDays(date, -weekday(date));', 'return addDays(date, -((weekday(date) + 1) % 7));')
      }));
    }});
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { load } = await import("cheerio");
    const { NotificationSettings } = await import("./src/components/notifications/settings.tsx");
    const { defaultNotificationPreferences, readNotificationPreferences } = await import("./src/domain/rules/notifications.ts");
    const { parsePlanDuration } = await import("./src/domain/rules/plan-duration.ts");
    const { DEFAULT_WORK_PLAN, setDayMinutes } = await import("./src/domain/rules/work-plan.ts");
    const { validDates } = await import("./src/server/session.js");
    const { getIstanbulDate, getMealWeekDates } = await import("./src/lib/meals/dates.ts");
    const error = fn => { try { fn(); return null; } catch (e) { return e.message; } };
    const preferences = defaultNotificationPreferences();
    const html = load(renderToStaticMarkup(createElement(NotificationSettings, {
      visible: true, source: { mode: "web", status: null, actions: null, error: "" }
    })));
    const field = html("#notification-custom-minutes");
    console.log(JSON.stringify({
      field: { min: field.attr("min"), max: field.attr("max"), value: field.attr("value") },
      presets: html("[data-lead-preset]").map((_, el) => html(el).text()).get(),
      acceptedLead: readNotificationPreferences({ ...preferences, leadMinutes: ${altered ? 20 : 120} }).leadMinutes,
      rejectedLead: error(() => readNotificationPreferences({ ...preferences, leadMinutes: ${altered ? 21 : 121} })),
      rejectedMinimum: error(() => readNotificationPreferences({ ...preferences, leadMinutes: ${altered ? 5 : 0} })),
      acceptedPlan: parsePlanDuration("${altered ? 12 : 16} sa"),
      rejectedPlan: parsePlanDuration("${altered ? 12 : 16} sa 1 dk"),
      planError: error(() => setDayMinutes(DEFAULT_WORK_PLAN, 0, ${altered ? 721 : 961})),
      acceptedRange: error(() => validDates("2026-01-01", "${altered ? "2026-01-31" : "2026-04-03"}")),
      rangeError: error(() => validDates("2026-01-01", "${altered ? "2026-02-01" : "2026-04-04"}")),
      mealDate: getIstanbulDate(new Date("2026-10-19T22:30:00Z")),
      mealWeek: getMealWeekDates("2026-01-01")
    }));
  `;
  const result = Bun.spawnSync([process.execPath, "--eval", script], {
    cwd: resolve(import.meta.dir, "../../.."),
    env: process.env,
  });
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  return JSON.parse(result.stdout.toString());
}

test("mevcut sınırlar form, doğrulama ve hata mesajlarında birlikte uygulanır", () => {
  const result = consumers(false);
  expect(result.field).toEqual({ min: "1", max: "120", value: "10" });
  expect(result.presets).toEqual(["5 dk", "10 dk", "15 dk", "30 dk"]);
  expect(result.acceptedLead).toBe(120);
  expect(result.rejectedLead).toBe("Bildirim tercihlerini kontrol et. Hatırlatma süresi 1–120 dakika olmalı.");
  expect(result.rejectedMinimum).toBe(result.rejectedLead);
  expect(result.acceptedPlan).toBe(960);
  expect(result.rejectedPlan).toBeNull();
  expect(result.planError).toBe("Günlük süre 0–16 saat arasında olmalı.");
  expect(result.acceptedRange).toBeNull();
  expect(result.rangeError).toBe("Bir sorguda en fazla 93 günlük aralık seç.");
  expect(result.mealDate).toBe("2026-10-20");
  expect(result.mealWeek).toEqual(["2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]);
});

test("yalnız kural sahibi değişince form, sınır kararları, mesajlar ve yemek tarihi güncellenir", () => {
  const result = consumers(true);
  expect(result.field).toEqual({ min: "6", max: "20", value: "12" });
  expect(result.presets).toEqual(["10 dk", "15 dk"]);
  expect(result.acceptedLead).toBe(20);
  expect(result.rejectedLead).toBe("Bildirim tercihlerini kontrol et. Hatırlatma süresi 6–20 dakika olmalı.");
  expect(result.rejectedMinimum).toBe(result.rejectedLead);
  expect(result.acceptedPlan).toBe(720);
  expect(result.rejectedPlan).toBeNull();
  expect(result.planError).toBe("Günlük süre 0–12 saat arasında olmalı.");
  expect(result.acceptedRange).toBeNull();
  expect(result.rangeError).toBe("Bir sorguda en fazla 31 günlük aralık seç.");
  expect(result.mealDate).toBe("2026-10-19");
  expect(result.mealWeek).toEqual(["2025-12-28", "2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-01-03"]);
});
