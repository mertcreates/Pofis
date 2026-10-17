async (page) => {
  const context = await page.context().browser().newContext();
  page = await context.newPage();
  try {
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    await page.clock.install({ time: new Date("2026-10-15T15:00:00+03:00") });
    await page.clock.setFixedTime(new Date("2026-10-15T15:00:00+03:00"));
    await page.addInitScript(() => {
      if (!localStorage.getItem("pofis:work-plans:v1")) localStorage.setItem("pofis:work-plans:v1", JSON.stringify({
        defaultPlan: [480,480,480,480,480,0,0], weekOverrides: { "2026-10-12": [480,480,480,480,450,0,0] },
      }));
    });
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      const respond = body => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
      if (url.pathname.startsWith("/api/session")) return respond({ connected: true });
      if (url.pathname !== "/api/report") return route.abort();
      const passages = ["17:00:00","17:00:00","16:40:00"].flatMap((time, day) => [
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
    const value = () => page.locator(".work-plan-stepper output").innerText();
    check(await card("Cuma") === "4 sa 50 dk" && await value() === "4 sa 50 dk", "Card and control must show the same required time");
    check(await page.locator(".work-plan-day-title strong").innerText() === "Cuma", "Original plan must not compete with required time");
    check(await page.locator(".work-plan-control-label").count() === 0, "Duration control must use its accessible name");
    await page.getByRole("button", { name: "Süreyi yarım saat artır" }).click();
    check(await value() === "5 sa 20 dk" && await card("Cuma") === "5 sa 20 dk", "Direct increment was carried twice");
    check(await target() === "Toplam 40 sa", "Increment must add only 30 minutes to weekly target");
    check(await page.getByRole("button", { name: /^(4|8) sa$/ }).count() === 0, "Fixed-hour presets must be absent");
    await page.getByRole("button", { name: /gününü izinli yap$/ }).click();
    check(await page.locator(".work-plan-stepper").count() === 0, "Closed day must hide duration controls");
    check(await page.locator(".work-plan-apply").count() === 0, "Closed day must hide bulk action");
    await page.getByRole("button", { name: /iznini kaldır$/ }).click();
    for (let step = 0; step < 8; step++) await page.getByRole("button", { name: "Süreyi yarım saat azalt", exact: true }).click();
    check(await value() === "4 sa" && await card("Perşembe") === "5 sa 20 dk", "Reopening must preserve the leave-adjusted Thursday");
    check(await target() === "Toplam 36 sa", "Duration edit shifted target incorrectly");
    await page.getByRole("button", { name: "40 saate tamamla", exact: true }).click();
    check(await value() === "4 sa" && await card("Perşembe") === "9 sa 20 dk", "Complete must preserve manually edited Friday");
    await page.keyboard.press("Escape");
    await page.reload();
    await page.getByText("KAPASİTE KABUL", { exact: true }).waitFor();
    await open();
    await day("Cuma").click();
    check(await value() === "4 sa" && await target() === "Toplam 40 sa", "Reload lost direct duration edit");
    await page.getByRole("button", { name: "Açık günlere uygula: 4 sa", exact: true }).click();
    check(await card("Perşembe") === "4 sa" && await card("Cuma") === "4 sa", "Bulk apply must copy required hours");
    check(await target() === "Toplam 34 sa 40 dk", "Bulk target must use only changed required hours");
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: width === 320 ? 800 : 1000 });
        check(await page.locator(".work-plan-modal").evaluate(modal => modal.scrollWidth <= modal.clientWidth), "Modal overflows");
        await page.screenshot({ path: `output/playwright/work-plan-required-${theme}-${width}.png`, animations: "disabled" });
      }
    }
    await page.getByRole("button", { name: /gününü izinli yap$/ }).click();
    check(await card("Cuma") === "İzinli" && await card("Perşembe") === "0 sa", "Leave must rebalance the remaining open day");
    check(await target() === "Toplam 26 sa 40 dk", "Leave must deduct the eight-hour template allowance");
    await page.getByRole("button", { name: /iznini kaldır$/ }).click();
    check(await card("Cuma") === "8 sa" && await value() === "8 sa", "Reopened day must show exactly eight hours");
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("pofis:work-plans:v1")));
    check(JSON.stringify(stored.defaultPlan) === JSON.stringify([480,480,480,480,480,0,0]), "Direct week edits changed template");
    check(JSON.stringify(stored.weekOverrides["2026-10-12"].slice(0,3)) === JSON.stringify([480,480,480]), "Week edits changed completed plans");
    return { passed: true, checks: ["same card/control time", "direct increment", "separate working-day action", "selected day priority", "reload", "bulk required time", "close/reopen", "template and locks", "light/dark mobile/desktop"] };
  } finally { await context.close(); }
}
