async (page) => {
  const context = await page.context().browser().newContext();
  page = await context.newPage();
  try {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.clock.install({ time: new Date("2026-10-12T15:00:00+03:00") });
    await page.clock.setFixedTime(new Date("2026-10-12T15:00:00+03:00"));
    let final = false;
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      const respond = body => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
      if (url.pathname.startsWith("/api/session")) return respond({ connected: true });
      if (url.pathname !== "/api/report") return route.abort();
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const dates = Array.from({ length: 7 }, (_, day) =>
        new Date(Date.parse(from + "T12:00:00Z") + day * 86400000).toISOString().slice(0, 10));
      const passages = [{ date: dates[0], time: "08:00:00", direction: "in" },
        { date: dates[0], time: "13:30:00", direction: "out" }];
      if (final) {
        for (let day = 1; day < 5; day++) passages.push(
          { date: dates[day], time: "08:00:00", direction: "in" },
          { date: dates[day], time: day === 1 ? "18:00:00" : day === 4 ? "16:30:00" : "16:00:00", direction: "out" });
      } else passages.push({ date: dates[1], time: "08:00:00", direction: "in" });
      return respond({ person: { id: "self", name: "HAFTA KABUL", title: "", unit: "" }, from, to,
        fetchedAt: new Date().toISOString(), passages });
    });
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const day = name => page.getByRole("button", { name: new RegExp("^" + name + ",") });
    const card = name => day(name).locator(".work-plan-day-time").innerText();
    const target = () => page.locator(".work-plan-total > span").first().innerText();
    const open = async () => {
      await page.getByRole("button", { name: "Ayarlar", exact: true }).click();
      await page.getByRole("dialog", { name: "Mesai planı", exact: true }).waitFor();
    };
    const reload = async () => {
      await page.reload();
      await page.getByText("HAFTA KABUL", { exact: true }).waitFor();
    };
    await page.goto("http://127.0.0.1:3000");
    await page.getByText("HAFTA KABUL", { exact: true }).waitFor();
    await open();
    await day("Pazartesi").click();
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Süreyi yarım saat azalt" }).click();
    await day("Salı").click();
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Süreyi yarım saat artır" }).click();
    check(await target() === "Toplam 40 sa", "Initial custom plan is not 40 hours");
    check(await card("Cuma") === "8 sa", "Today's partial record was carried over");
    await page.keyboard.press("Escape");
    await page.clock.setFixedTime(new Date("2026-10-13T15:00:00+03:00"));
    await reload();
    const exit = page.locator(".metric").filter({ hasText: "Bugünkü hedef çıkış" }).locator(".metric-value time");
    check((await exit.textContent()).replace(/\s/g, "") === "18:00:00", "Tuesday's 10 hour exit target changed");
    for (let i = 0; i < 2; i++) {
      await open();
      check(await target() === "Toplam 40 sa", "Completion changed weekly target");
      check(await card("Pazartesi") === "5 sa 30 dk", "Monday actual changed");
      check(await card("Salı") === "10 sa", "Tuesday plan changed");
      check(await card("Cuma") === "8 sa 30 dk", "Monday shortfall not allocated exactly once");
      await day("Pazartesi").click();
      check((await page.locator(".work-plan-day-title").innerText()) === "Pazartesi\nPlanlanan: 6 sa · Varsayılan: 8 sa", "Completed plan must be distinct from the default");
      check(await page.locator(".work-plan-recorded-label").innerText() === "Gerçekleşen:", "Recorded duration must be labeled");
      await day("Cuma").click();
      check(await page.locator(".work-plan-stepper output").innerText() === "8 sa 30 dk", "Stepper must show the same required duration as the card");
      await page.keyboard.press("Escape");
      await reload();
    }
    await open();
    await day("Cuma").click();
    await page.getByRole("button", { name: "Süreyi yarım saat azalt" }).click();
    check(await target() === "Toplam 39 sa 30 dk", "Manual edit not reflected");
    await page.getByRole("button", { name: "40 saate tamamla", exact: true }).click();
    check(await target() === "Toplam 40 sa", "Complete did not reach target");
    // Restore the original future distribution explicitly; completed Monday stays fixed.
    await day("Salı").click();
    await page.getByRole("button", { name: "Süreyi yarım saat azalt" }).click();
    await day("Cuma").click();
    await page.getByRole("button", { name: /gününü izinli yap$/ }).click();
    await page.getByRole("button", { name: /iznini kaldır$/ }).click();
    await page.getByRole("button", { name: "Süreyi yarım saat artır" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Önceki hafta", exact: true }).click();
    await page.getByRole("button", { name: "Hafta planını düzenle", exact: true }).waitFor();
    await page.getByRole("button", { name: "Hafta planını düzenle", exact: true }).click();
    check(await page.getByRole("button", { name: /^Seçili hafta ·/ }).count() === 1, "Historical editing is unavailable");
    await day("Cuma").click();
    for (let step = 0; step < 8; step++) await page.getByRole("button", { name: "Süreyi yarım saat azalt", exact: true }).click();
    await page.keyboard.press("Escape");
    await open();
    await page.getByRole("button", { name: /^Bu hafta ·/ }).waitFor();
    await day("Cuma").click();
    await page.getByRole("button", { name: "Süreyi yarım saat artır" }).waitFor({ state: "visible" });
    check(await card("Pazartesi") === "5 sa 30 dk", "Settings did not return to current week");
    check(await target() === "Toplam 40 sa", "Historical edit leaked into current week");
    await page.keyboard.press("Escape");
    final = true;
    await page.clock.setFixedTime(new Date("2026-10-17T15:00:00+03:00"));
    await reload();
    await open();
    check(await target() === "Toplam 40 sa", "Finalization changed target");
    check(await page.locator('.work-plan-day[data-locked="true"]').count() === 5, "Final working day not locked");
    check(await page.locator(".work-plan-modal .inline-notice").count() === 0, "Balanced week has unexplained residual");
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("pofis:work-plans:v1")));
    check(JSON.stringify(saved.weekOverrides["2026-10-12"]) === JSON.stringify([360,600,480,480,510,0,0]), "The final required schedule did not survive the week");
    await page.keyboard.press("Escape");
    check((await page.locator(".metric").filter({ hasText: "Gerçekleşen toplam" }).locator(".metric-value").innerText()).replace(/\s/g, "") === "40sa", "Final actual total is wrong");
    check(errors.length === 0, errors.join("\n"));
    return { passed: true, fixturesOnly: true, checks: ["plan Monday", "finalize Monday", "advance Tuesday", "preserve custom targets", "idempotent carryover", "Tuesday exit goal", "manual edit and complete", "historical editing", "settings current-week navigation", "finalize Friday", "weekly target and actuals"] };
  } finally {
    await context.close();
  }
}
