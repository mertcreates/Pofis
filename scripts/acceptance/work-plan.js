async (page) => {
  const context = await page.context().browser().newContext();
  page = await context.newPage();
  try {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.clock.install({ time: new Date("2026-10-16T15:00:00+03:00") });
    await page.clock.pauseAt(new Date("2026-10-16T15:14:59+03:00"));
    let scenario = "normal";
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      const respond = body => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
      if (url.pathname.startsWith("/api/session")) return respond({ connected: true });
      if (url.pathname !== "/api/report") return route.abort();
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const dates = Array.from({ length: 7 }, (_, day) =>
        new Date(Date.parse(from + "T12:00:00Z") + day * 86400000).toISOString().slice(0, 10));
      const passages = dates.slice(0, 4).flatMap((date, day) => {
        if (scenario === "missing" && day === 1) return [];
        if (scenario === "uncertain" && day === 1) return [
          { date, time: "08:00:00", direction: "in" },
          { date, time: "12:00:00", direction: "out" },
          { date, time: "13:00:00", direction: "in" },
        ];
        return [{ date, time: "08:00:00", direction: "in" },
          { date, time: day === 0 ? scenario === "seconds" ? "16:30:17" : "16:30:00" : day === 1 ? "16:15:00" : "16:00:00", direction: "out" }];
      });
      passages.push({ date: dates[4], time: "08:00:00", direction: "in" });
      return respond({ person: { id: "self", name: "PLAN KABUL", unit: "", title: "" },
        from, to, fetchedAt: "2026-10-16T12:14:59Z", passages });
    });
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("pofis:work-plans:v2")));
    const day = name => page.getByRole("button", { name: new RegExp("^" + name + ",") });
    const open = async () => {
      await page.getByRole("button", { name: "Ayarlar", exact: true }).click();
      await page.getByRole("dialog", { name: "Mesai planı", exact: true }).waitFor();
    };
    const exit = () => page.locator(".metric").filter({ hasText: "Bugünkü hedef çıkış" });
    const daily = () => page.locator(".metric").filter({ hasText: "Bugünkü süre" });
    const weekly = () => page.locator(".metric").filter({ hasText: "Gerçekleşen toplam" });
    const targetText = () => page.locator(".work-plan-total > span").first().innerText();
    const badge = metric => metric.locator(".metric-tag").innerText();
    await page.goto("http://127.0.0.1:3000");
    await page.getByText("PLAN KABUL", { exact: true }).waitFor();
    check(await badge(daily()) === "%99", "Daily target completed too soon");
    check(await badge(weekly()) === "%99", "Weekly target completed too soon");
    check((await exit().locator(".metric-value time").textContent()).replace(/\s/g, "") === "15:15:00", "Carryover exit is wrong");
    await page.clock.runFor(1000);
    check(await badge(daily()) === "%100", "Daily goal does not complete at exact second");
    check(await badge(weekly()) === "%100", "Weekly goal does not complete at exact second");
    await page.clock.resume();
    const differences = await page.locator(".report-difference").allTextContents();
    check(differences[0].includes("30 dk fazla") && differences[1].includes("15 dk fazla"), "Intermediate differences changed");

    for (const mode of ["missing", "uncertain", "normal"]) {
      scenario = mode;
      await page.getByRole("button", { name: "Raporu yenile", exact: true }).click();
      const expected = mode === "normal" ? "15:15:00" : "15:30:00";
      await page.waitForFunction(expected => {
        const card = [...document.querySelectorAll(".metric")].find(card => card.textContent.includes("Bugünkü hedef çıkış"));
        return card?.querySelector("time")?.textContent.replace(/\s/g, "") === expected;
      }, expected);
      if (mode !== "normal") check((await badge(weekly())).includes("≈"), "Incomplete weekly total not marked approximate");
    }

    scenario = "seconds";
    await page.getByRole("button", { name: "Raporu yenile", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".report-duration")?.textContent === "08:30:17");
    await open();
    check(await page.evaluate(() => document.activeElement.tagName) === "H2", "Planner focuses an editing control on open");
    check(await page.locator(".work-plan-modal [autofocus]").count() === 0, "Planner still has autofocus control");
    await day("Pazartesi").click();
    check(await page.locator('.work-plan-day[data-locked="true"]').count() === 4, "Completed days are not locked");
    check((await page.locator(".work-plan-recorded-time").innerText()).includes("8 sa 30 dk"), "Locked duration is not formatted as hours");
    check(await page.locator(".work-plan-day-editor fieldset, fieldset.work-plan-day-editor, .work-plan-stepper").count() === 0, "Locked day still renders editing controls");
    check(await page.locator(".work-plan-day-action").count() === 0, "Locked day must hide day actions");
    for (const name of ["Süreyi yarım saat azalt", "Süreyi yarım saat artır", "Açık günlere uygula"]) {
      check(await page.getByRole("button", { name, exact: true }).count() === 0, `Locked control still shown: ${name}`);
    }
    check((await page.locator(".work-plan-recorded-time").getAttribute("aria-label")).includes("17 sn"), "Exact recorded seconds missing from accessible label");
    check((await day("Cuma").locator(".work-plan-day-time").innerText()) === "7 sa 14 dk", "Last day card must show carryover target");
    await page.setViewportSize({ width: 320, height: 720 });
    check(await page.locator(".work-plan-modal").evaluate(modal => modal.scrollWidth <= modal.clientWidth && modal.querySelector(".work-plan-day-editor").scrollWidth <= modal.querySelector(".work-plan-day-editor").clientWidth), "Locked duration overflows narrow screens");
    await page.screenshot({ path: "output/playwright/work-plan-locked-mobile.png", animations: "disabled" });

    check(await page.locator(".work-plan-day-time").evaluateAll(nodes => nodes.every(node => node.scrollWidth <= Math.ceil(node.getBoundingClientRect().width))), "Clock values overflow their day cells");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: "Kapat", exact: true }).focus();
    await page.keyboard.press("Shift+Tab");
    check(await day("Cuma").evaluate(button => document.activeElement === button), "Focus trap includes locked controls");
    await day("Cuma").click();
    check(await page.locator("fieldset.work-plan-day-editor").count() === 1 && await page.locator(".work-plan-recorded-time").count() === 0, "Editable controls did not return for an open day");
    await page.getByRole("button", { name: "Süreyi yarım saat azalt" }).click();
    check(await page.locator(".work-plan-stepper output").innerText() === "6 sa 44 dk", "Stepper must edit current required hours");
    check((await page.locator(".work-plan-day-title strong").innerText()) === "Cuma", "Day title must not repeat a conflicting original plan");
    check(await page.getByRole("button", { name: /^Açık günlere uygula:/ }).count() === 0, "Bulk apply must be hidden when only Friday is eligible");
    check(await day("Cuma").locator(".work-plan-day-time").innerText() === "6 sa 44 dk", "Card and stepper must show the same required time");
    check(await page.getByRole("button", { name: "40 saate tamamla", exact: true }).isEnabled(), "Sole editable Friday must accept completion");
    check(await page.locator(".work-plan-capacity").count() === 0, "Sole editable Friday must not show a false capacity warning");
    await page.keyboard.press("Escape");
    await open();
    await page.setViewportSize({ width: 320, height: 720 });
    check(await page.locator(".work-plan-modal").evaluate(modal => modal.scrollWidth <= modal.clientWidth), "Day-specific completion and reset labels overflow narrow screens");
    await page.getByRole("button", { name: "40 saate tamamla", exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    check((await stored()).weekTargets["2026-10-12"] === 144000 && Math.round((await stored()).weekOverrides["2026-10-12"][4] * 60) === 26083, "Completion must save the current required duration and independent weekly target");
    await page.getByRole("button", { name: "Sıfırla", exact: true }).click();
    await day("Cuma").click();
    await page.getByRole("button", { name: "Süreyi yarım saat artır" }).click();
    await page.keyboard.press("Escape");
    await open();
    await page.getByRole("button", { name: "40 saate tamamla", exact: true }).click();
    check((await stored()).weekTargets["2026-10-12"] === 144000 && Math.round((await stored()).weekOverrides["2026-10-12"][4] * 60) === 26083, "Day-specific reduction must use actual required duration");
    await page.getByRole("button", { name: "Sıfırla", exact: true }).click();
    await day("Cuma").click();
    await page.getByRole("button", { name: /gününü izinli yap$/ }).click();
    check((await targetText()) === "Toplam 32 sa", "Friday leave must deduct the eight-hour template allowance");
    await day("Pazartesi").click();
    check(await day("Cuma").evaluate(button => getComputedStyle(button).backgroundColor) === "rgb(248, 249, 251)", "Closed weekday must retain neutral background");
    await day("Cuma").click();
    check(await page.locator(".work-plan-total > .work-plan-total-label").count() === 1, "Completed time above the leave-adjusted target must remain visible");
    check(await page.locator(".work-plan-modal .inline-notice").count() === 1, "Unallocated surplus must remain visible when no open day is available");
    await page.setViewportSize({ width: 320, height: 720 });
    check(await page.locator(".work-plan-total").isVisible(), "Weekly total is hidden on narrow screens");
    check(await page.locator(".work-plan-modal").evaluate(modal => modal.scrollWidth <= modal.clientWidth), "Residual and expected-total text overflow");
    await page.screenshot({ path: "output/playwright/work-plan-residual-mobile.png", animations: "disabled" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: "Sıfırla", exact: true }).click();

    await day("Cuma").click();
    await page.getByRole("button", { name: "Süreyi yarım saat azalt" }).click();
    check((await targetText()) === "Toplam 39 sa 30 dk", "Custom total is wrong");
    check((await day("Pazartesi").innerText()).includes("8 sa 30 dk"), "Week edit changed a locked record");
    check((await day("Cuma").innerText()).includes("6 sa 44 dk"), "Day card does not show effective hours");
    check(JSON.stringify((await stored()).defaultPlan) === JSON.stringify([480,480,480,480,480,0,0]), "PDKS changed the template");
    const visual = await page.locator(".work-plan-modal").evaluate(modal => {
      const style = selector => getComputedStyle(modal.querySelector(selector));
      const locked = style('.work-plan-day[data-locked="true"]');
      const selected = style('.work-plan-day[aria-pressed="true"]');
      const stepper = style('.work-plan-stepper output');
      const total = style('.work-plan-total');
      const buttons = [...modal.querySelectorAll('.work-plan-stepper button')].map(button => getComputedStyle(button).backgroundColor);
      return { locked: locked.backgroundColor, selected: selected.backgroundColor, selectedText: selected.color,
        selectedBorder: selected.borderTopWidth, total: total.fontSize,
        stepper: stepper.fontSize, weight: stepper.fontWeight, buttons,
        editor: style('.work-plan-day-editor').borderRadius, actions: style('.work-plan-actions').backgroundColor };
    });
    check(visual.locked === 'rgb(246, 244, 255)' && visual.selected === 'rgb(237, 233, 254)' && visual.selectedText === 'rgb(59, 7, 100)' && parseFloat(visual.selectedBorder) > 0, JSON.stringify(visual));
    check(visual.total === '13px' && visual.stepper === '13px' && visual.weight === '600', JSON.stringify(visual));
    check(visual.buttons.every(color => color === 'rgb(241, 243, 247)') && visual.editor === '12px' && visual.actions === 'rgb(245, 242, 255)', JSON.stringify(visual));
    const layout = await page.locator(".work-plan-modal").evaluate(modal => {
      const cards = [...modal.querySelectorAll(".work-plan-day")];
      return { dayHeights: cards.map(card => card.getBoundingClientRect().height),
        openBackground: getComputedStyle(cards[0]).backgroundColor,
        underline: [...modal.querySelectorAll("button")].some(button => getComputedStyle(button).textDecorationLine.includes("underline")) };
    });
    check(layout.dayHeights.length === 5 && layout.dayHeights.every(height => height === 58), "Planner must show five weekday cards");
    check(await day("Cumartesi").count() === 0 && await day("Pazar").count() === 0, "Weekend controls must not appear");
    check(!layout.underline, "Planner buttons are underlined");
    await page.screenshot({ path: "output/playwright/work-plan-desktop.png", animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 844 });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Mobile page overflows");
    check(await page.locator(".work-plan-modal").evaluate(modal => modal.scrollWidth <= modal.clientWidth), "Mobile modal overflows");
    check(await page.locator(".work-plan-modal").evaluate(modal => {
      const minimum = matchMedia("(pointer: coarse)").matches ? 44 : 32;
      return [...modal.querySelectorAll("button")].every(button => button.getBoundingClientRect().height >= minimum);
    }), "Planner controls are too small for the active input method");
    await page.screenshot({ path: "output/playwright/work-plan-mobile.png", animations: "disabled" });
    await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
    await page.screenshot({ path: "output/playwright/work-plan-mobile-dark.png", animations: "disabled" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: "output/playwright/work-plan-desktop-dark.png", animations: "disabled" });
    await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
    await page.keyboard.press("Escape");
    check(await page.getByRole("dialog", { name: "Mesai planı", exact: true }).count() === 0, "Escape did not close");
    check(await page.getByRole("button", { name: "Ayarlar", exact: true }).evaluate(button => document.activeElement === button), "Focus did not return to settings");
    await page.reload();
    await page.getByText("PLAN KABUL", { exact: true }).waitFor();
    await open();
    check((await targetText()) === "Toplam 39 sa 30 dk", "Reload lost plan");
    await page.getByRole("button", { name: "Sıfırla", exact: true }).click();
    await page.getByRole("button", { name: "Varsayılan plan", exact: true }).click();
    await day("Pazartesi").click();
    for (let step = 0; step < 2; step++) await page.getByRole("button", { name: "Süreyi yarım saat artır", exact: true }).click();
    await page.getByRole("button", { name: /^Açık günlere uygula:/ }).click();
    check(JSON.stringify((await stored()).defaultPlan) === JSON.stringify([540,540,540,540,540,0,0]), "Default plan not persisted");
    await page.getByRole("button", { name: /^Bu hafta ·/ }).click();
    check((await day("Cuma").locator(".work-plan-day-time").innerText()) === "12 sa 14 dk", "Remaining duration must use the new template total");
    check((await targetText()) === "Toplam 45 sa", "Inherited week must follow the template total");
    check((await day("Pazartesi").innerText()).includes("8 sa 30 dk"), "Default edit changed locked actual time");
    await day("Cuma").click();
    const beforeFailure = await stored();
    await page.evaluate(() => {
      window.__planOriginalSetter = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === "pofis:work-plans:v2") throw new DOMException("fixture quota", "QuotaExceededError");
        return window.__planOriginalSetter.call(this, key, value);
      };
    });
    await page.getByRole("button", { name: "Süreyi yarım saat azalt" }).click();
    await page.locator(".work-plan-modal .inline-notice").waitFor();
    check(await page.locator(".work-plan-stepper output").innerText() === "12 sa 14 dk", "Failed write changed plan");
    check(JSON.stringify(await stored()) === JSON.stringify(beforeFailure), "Failed write changed storage");
    await page.evaluate(() => { Storage.prototype.setItem = window.__planOriginalSetter; delete window.__planOriginalSetter; });
    await page.getByRole("button", { name: "Süreyi yarım saat artır" }).click();
    await page.getByRole("button", { name: "Süreyi yarım saat azalt" }).click();
    check(JSON.stringify((await stored()).weekOverrides["2026-10-12"]) === JSON.stringify([480,480,480,480,734 + 43/60,0,0]), "Template edits lost completed plans");
    await page.getByRole("button", { name: /gününü izinli yap$/ }).click();
    check(await page.getByRole("button", { name: /^Açık günlere uygula:/ }).count() === 0, "Bulk apply must stay hidden with no eligible recipient");
    check(await targetText() === "Toplam 36 sa", "Friday leave must deduct nine template hours");
    check(await page.locator(".work-plan-modal .inline-notice").count() === 1, "Remaining debt without open days must be shown");
    await page.getByRole("button", { name: "Sıfırla", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.evaluate(() => localStorage.removeItem("pofis:work-plans:v2"));
    await page.clock.setFixedTime(new Date("2026-10-14T15:00:00+03:00"));
    await page.reload();
    await page.getByText("PLAN KABUL", { exact: true }).waitFor();
    await open();
    await page.getByRole("button", { name: "Varsayılan plan", exact: true }).click();
    await day("Cuma").click();
    check(await page.getByRole("button", { name: /^Açık günlere uygula:/ }).count() === 0, "Bulk apply must be hidden when all open days already match");
    check(await day("Cuma").locator(".work-plan-day-time").innerText() === "8 sa", "Default template must not show carryover");
    await page.getByRole("button", { name: /^Bu hafta ·/ }).click();
    check(await day("Cuma").locator(".work-plan-day-time").innerText() === "7 sa 14 dk", "Friday carryover missing with two locked days");
    check(await page.locator(".work-plan-stepper output").innerText() === "7 sa 14 dk", "Stepper must match the Friday card");
    await page.getByRole("button", { name: /gününü izinli yap$/ }).click();
    check(await day("Cuma").locator(".work-plan-day-time").innerText() === "İzinli", "Friday did not become leave");
    check(await day("Perşembe").locator(".work-plan-day-time").innerText() === "7 sa 14 dk", "Friday leave must rebalance Thursday");
    await day("Perşembe").click();
    check(await page.locator(".work-plan-stepper output").innerText() === "7 sa 14 dk", "Thursday stepper must match the card");
    check((await targetText()) === "Toplam 32 sa", "Friday leave deducts the eight-hour template allowance");
    await page.keyboard.press("Escape");
    await page.goto("http://127.0.0.1:3000/demo");
    await page.getByRole("button", { name: "Ayarlar", exact: true }).waitFor();
    await open();
    check((await targetText()) === "Toplam 40 sa", "Demo inherited live plan");
    await page.keyboard.press("Escape");
    check(errors.length === 0, errors.join("\n"));
    return { passed: true, fixturesOnly: true, layout, pageErrors: errors,
      checks: ["exact-second daily/weekly carryover", "missing/uncertain safeguards", "distribution and reset",
        "Friday leave deducts the template allowance", "completed days locked in all controls", "actual seconds and original-plan differences", "hours and minutes", "autosave/reload", "default inheritance",
        "write failure preserves state", "auto-prune", "impossible distribution", "demo isolation", "Escape and focus return",
        "desktop/mobile light/dark"] };
  } finally {
    await context.close();
  }
}
