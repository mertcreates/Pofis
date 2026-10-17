async (page) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:3000/demo');
  await page.getByRole('button', { name: 'Ayarlar', exact: true }).click();
  const modal = page.locator('.work-plan-modal');
  const results = [];
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    results.push(await modal.evaluate(modal => {
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgba = css => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data];
      };
      const luminance = rgb => rgb.slice(0, 3).reduce((sum, value, index) => {
        const channel = value / 255;
        return sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][index];
      }, 0);
      const contrasts = [...modal.querySelectorAll('button, output, h2, h3, .work-plan-total-label, .work-plan-total > span, .work-plan-day-title strong, .work-plan-day-time, .work-plan-day-label')]
        .filter(element => element.getBoundingClientRect().height > 0 && element.textContent.trim() && !element.disabled)
        .map(element => {
          let backgroundOwner = element;
          let background;
          while (backgroundOwner) {
            background = rgba(getComputedStyle(backgroundOwner).backgroundColor);
            if (background[3] === 255) break;
            backgroundOwner = backgroundOwner.parentElement;
          }
          const foreground = luminance(rgba(getComputedStyle(element).color));
          const backdrop = luminance(background);
          return { text: element.textContent.trim(), ratio: (Math.max(foreground, backdrop) + .05) / (Math.min(foreground, backdrop) + .05) };
        });
      return { theme: document.documentElement.dataset.theme, minimumContrast: Math.min(...contrasts.map(item => item.ratio)), failures: contrasts.filter(item => item.ratio < 4.5) };
    }));
  }
  await page.setViewportSize({ width: 320, height: 568 });
  const narrow = await modal.evaluate(modal => {
    const body = modal.querySelector('.app-modal-body');
    return { modalOverflow: modal.scrollWidth > modal.clientWidth, bodyOverflow: body.scrollWidth > body.clientWidth,
      outsideControls: [...modal.querySelectorAll('button')].filter(button => { const rect = button.getBoundingClientRect(); return rect.width && (rect.left < 0 || rect.right > innerWidth); }).length };
  });
  if (results.some(result => result.failures.length) || narrow.modalOverflow || narrow.bodyOverflow || narrow.outsideControls) throw new Error(JSON.stringify({ results, narrow }));
  await page.getByRole('button', { name: /^Cuma,/ }).focus();
  await page.keyboard.press('Space');
  const focused = await page.getByRole('button', { name: /^Cuma,/ }).evaluate(button => ({ selected: button.getAttribute('aria-pressed') === 'true', focusVisible: button.matches(':focus-visible'), focusRing: getComputedStyle(button).boxShadow }));
  if (!focused.selected || !focused.focusVisible || focused.focusRing === 'none') throw new Error(JSON.stringify(focused));
  await page.keyboard.press('Escape');
  const touchContext = await page.context().browser().newContext({
    viewport: { width: 1440, height: 1000 }, isMobile: true, hasTouch: true,
  });
  let touch;
  try {
    const touchPage = await touchContext.newPage();
    await touchPage.goto('http://127.0.0.1:3000/demo');
    await touchPage.getByRole('button', { name: 'Ayarlar', exact: true }).tap();
    await touchPage.setViewportSize({ width: 390, height: 844 });
    await touchPage.getByRole('button', { name: /^Cuma,/ }).tap();
    await touchPage.getByRole('button', { name: 'Süreyi yarım saat azalt' }).tap();
    touch = await touchPage.locator('.work-plan-modal').evaluate(modal => ({
      coarse: matchMedia('(pointer: coarse)').matches,
      smallControls: [...modal.querySelectorAll('button')].filter(button => {
        const rect = button.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      }).length,
      value: modal.querySelector('output').textContent,
    }));
    if (!touch.coarse || touch.smallControls || touch.value !== '7,5 sa') throw new Error(JSON.stringify(touch));
    for (const theme of ['light', 'dark']) {
      await touchPage.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      await touchPage.screenshot({ path: `output/playwright/work-plan-touch-${theme}.png`, animations: 'disabled' });
    }
  } finally {
    await touchContext.close();
  }
  return { results, narrow, focused, touch };
}
