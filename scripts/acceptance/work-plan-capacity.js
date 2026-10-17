async (page) => {
  const context = await page.context().browser().newContext();
  page = await context.newPage();
  try {
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    await page.clock.install({ time: new Date("2026-10-15T15:00:00+03:00") });
    await page.clock.setFixedTime(new Date("2026-10-15T15:00:00+03:00"));
    await page.addInitScript(() => {
      if (!localStorage.getItem("pofis:work-plans:v2")) localStorage.setItem("pofis:work-plans:v2", JSON.stringify({
        defaultPlan: [480,480,480,480,480,0,0], weekOverrides: { "2026-10-12": [480,480,390,480,480,0,0] },
      }));
    });
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      const respond = body => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
      if (url.pathname.startsWith("/api/session")) return respond({ connected: true });
      if (url.pathname !== "/api/report") return route.abort();
      const passages = ["16:03:00","16:42:00","16:25:00"].flatMap((time, day) => [
        { date: `2026-10-${12 + day}`, time: "08:00:00", direction: "in" },
        { date: `2026-10-${12 + day}`, time, direction: "out" },
      ]);
      passages.push({ date: "2026-10-15", time: "08:00:00", direction: "in" });
      return respond({ person: { id: "self", name: "KAPASİTE KABUL", unit: "", title: "" },
        from: url.searchParams.get("from"), to: url.searchParams.get("to"), fetchedAt: new Date().toISOString(), passages });
    });
    const day = name => page.getByRole("button", { name: new RegExp("^" + name + ",") });
    const open = () => page.getByRole("button", { name: "Ayarlar", exact: true }).click();
    const card = name => day(name).locator(".work-plan-day-time").innerText();
    const target = () => page.locator(".work-plan-total > span").first().innerText();
    await page.goto("http://127.0.0.1:3000");
    await page.getByText("KAPASİTE KABUL", { exact: true }).waitFor();
    await open();
    await day("Cuma").click();
    await page.getByRole("button", { name: /gününü kapat$/ }).click();
    check(await card("Perşembe") === "8 sa", "Closing Friday must preserve Thursday required time");
    check(await target() === "Toplam 33 sa 10 dk", "Closing Friday target is wrong");
    await page.getByRole("button", { name: "40 saate tamamla", exact: true }).click();
    check(await card("Perşembe") === "14 sa 50 dk", "Thursday must have sufficient actual capacity");
    check(await card("Cuma") === "–", "Closed Friday was reopened");
    check(await target() === "Toplam 40 sa", "Weekly target must reach 40 hours");
    check(await page.locator(".work-plan-capacity").count() === 0, "False capacity warning remains");
    await day("Perşembe").click();
    check(await page.locator(".work-plan-stepper output").innerText() === "14 sa 50 dk", "Stepper must show a usable duration");
    await page.setViewportSize({ width: 320, height: 720 });
    check(await page.locator(".work-plan-modal").evaluate(modal => modal.scrollWidth <= modal.clientWidth), "Actual plan overflows mobile");
    await page.screenshot({ path: "output/playwright/work-plan-capacity-mobile.png", animations: "disabled" });
    check(await page.locator('.work-plan-day .work-plan-dot').count() === 0, "Day cards must not have ambiguous custom-plan dots");
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: width === 320 ? 720 : 1000 });
        await day("Pazartesi").click();
        await page.screenshot({ path: `output/playwright/work-plan-cards-${theme}-${width}.png`, animations: "disabled" });
        const surfaces = await page.locator('.work-plan-days').evaluate(grid => {
          const cards = [...grid.querySelectorAll('button')];
          return cards.map(card => getComputedStyle(card).backgroundColor);
        });
        check(new Set(surfaces).size === 4, "Selected, locked, open and closed days need distinct surfaces");
      }
    }
    await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.keyboard.press("Escape");
    for (let i = 0; i < 2; i++) {
      await page.reload();
      await page.getByText("KAPASİTE KABUL", { exact: true }).waitFor();
      const exit = page.locator(".metric").filter({ hasText: "Bugünkü hedef çıkış" }).locator(".metric-value time");
      check((await exit.textContent()).replace(/\s/g, "") === "22:50:00", "Dashboard exit must use 14:50");
      await open();
      check(await target() === "Toplam 40 sa" && await card("Perşembe") === "14 sa 50 dk", "Reload applied carryover twice or lost the weekly target");
      await page.keyboard.press("Escape");
    }
    await open();
    await day("Perşembe").click();
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Süreyi yarım saat artır" }).click();
    check(await page.locator(".work-plan-stepper output").innerText() === "16 sa", "An exact-minute plan must stop at the daily limit");
    check(await page.getByRole("button", { name: "Süreyi yarım saat artır" }).isDisabled(), "Stepper can exceed 16 hours");
    await page.keyboard.press("Escape");
    return { passed: true, fixturesOnly: true, checks: ["Thursday actual capacity", "Friday stays closed", "40 hour target", "14:50 required", "22:50 exit", "reload idempotency", "320px layout"] };
  } finally { await context.close(); }
}
