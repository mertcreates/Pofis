async (page) => {
  const context = await page.context().browser().newContext();
  page = await context.newPage();
  try {
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    await page.clock.install({ time: new Date("2026-10-14T15:00:00+03:00") });
    await page.clock.setFixedTime(new Date("2026-10-14T15:00:00+03:00"));
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      const respond = body => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
      if (url.pathname.startsWith("/api/session")) return respond({ connected: true });
      if (url.pathname !== "/api/report") return route.abort();
      const from = url.searchParams.get("from"), to = url.searchParams.get("to");
      const passages = ["2026-10-12", "2026-10-13"].flatMap(date => [
        { date, time: "08:00:00", direction: "in" },
        { date, time: "16:00:00", direction: "out" },
      ]);
      return respond({ person: { id: "self", name: "ELLE PLAN KABUL", unit: "", title: "" },
        from, to, fetchedAt: new Date().toISOString(), passages });
    });
    await page.goto("http://127.0.0.1:3000");
    await page.getByText("ELLE PLAN KABUL", { exact: true }).waitFor();
    const open = () => page.getByRole("button", { name: "Ayarlar", exact: true }).click();
    const day = name => page.getByRole("button", { name: new RegExp("^" + name + ",") });
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("pofis:work-plans:v2")));
    await open();
    await day("Çarşamba").click();
    for (let step = 0; step < 8; step++) await page.getByRole("button", { name: "Süreyi yarım saat azalt", exact: true }).click();
    await day("Perşembe").click();
    await page.getByRole("button", { name: "40 saate tamamla", exact: true }).click();
    check(JSON.stringify((await stored()).weekOverrides["2026-10-12"]) === JSON.stringify([480,480,360,480,600,0,0]),
      "Selected Thursday must stay at eight hours; Wednesday and Friday receive the difference");
    await day("Çarşamba").click();
    check(await page.locator(".work-plan-stepper output").innerText() === "6 sa", "Recipient Wednesday did not receive two hours");
    await page.getByRole("button", { name: "Sıfırla", exact: true }).click();
    // Completion uses the current selection after reopening.
    await page.keyboard.press("Escape");
    await page.evaluate(() => localStorage.setItem("pofis:work-plans:v2", JSON.stringify({
      defaultPlan: [480,480,480,480,480,0,0], weekOverrides: { "2026-10-12": [480,480,240,480,480,0,0] },
    })));
    await page.reload();
    await page.getByText("ELLE PLAN KABUL", { exact: true }).waitFor();
    await open();
    await day("Çarşamba").click();
    await page.getByRole("button", { name: "40 saate tamamla", exact: true }).click();
    check(JSON.stringify((await stored()).weekOverrides["2026-10-12"]) === JSON.stringify([480,480,240,600,600,0,0]),
      "Selecting Wednesday must exclude it while Thursday and Friday are eligible");
    await page.keyboard.press("Escape");
    await page.evaluate(() => localStorage.setItem("pofis:work-plans:v2", JSON.stringify({
      defaultPlan: [480,480,480,480,480,0,0], weekOverrides: { "2026-10-12": [480,480,480,480,540,0,0] },
    })));
    await page.reload();
    await page.getByText("ELLE PLAN KABUL", { exact: true }).waitFor();
    await open();
    await day("Cuma").click();
    await page.getByRole("button", { name: "40 saate tamamla", exact: true }).click();
    check(!(await stored()).weekOverrides["2026-10-12"], "Surplus must reduce selected Friday from nine to eight hours");
    check(await page.locator(".work-plan-stepper output").innerText() === "8 sa", "Selected Friday must show its reduced duration");
    await day("Perşembe").click();
    check(await page.locator(".work-plan-stepper output").innerText() === "8 sa", "Reduction must keep Thursday at eight hours");
    await page.keyboard.press("Escape");
    return { passed: true, fixturesOnly: true, checks: ["selected Thursday preserved on addition", "selection changes addition recipients", "selected Wednesday preserved after reload", "surplus reduces selected Friday first"] };
  } finally { await context.close(); }
}
