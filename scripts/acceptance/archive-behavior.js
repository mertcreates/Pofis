async (page) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.clock.install({ time: new Date('2026-10-16T15:00:00+03:00') });
  let connected = false;
  let attempts = 0;
  let failReport = false;
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const respond = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/session') {
      if (request.method() === 'DELETE') connected = false;
      if (request.method() === 'POST') {
        attempts++;
        if (attempts === 1) return respond({ error: 'Fixture: kullanıcı adı veya şifre yanlış.', code: 'AUTH_FAILED' }, 401);
        connected = true;
      }
      return respond({ connected });
    }
    if (url.pathname === '/api/session/heartbeat') return respond({ connected: true });
    if (url.pathname === '/api/report') {
      if (failReport) return respond({ error: 'Fixture: kaynak geçici olarak yanıt vermiyor.', code: 'CONNECTION_FAILED' }, 502);
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const date = new Date(`${from}T12:00:00Z`);
      const dates = Array.from({ length: 7 }, (_, i) => new Date(date.getTime() + i * 86400000).toISOString().slice(0,10));
      return respond({ person: { id: 'self', name: 'DOĞRULAMA KİŞİSİ', unit: '', title: '' }, from, to,
        fetchedAt: '2026-10-16T12:00:00Z',
        passages: [
          ...dates.slice(0,4).flatMap(date => [{ date, time: '08:00:00', direction: 'in' }, { date, time: '16:00:00', direction: 'out' }]),
          { date: dates[4], time: '08:00:00', direction: 'in' }, { date: dates[4], time: '12:00:00', direction: 'out' }, { date: dates[4], time: '13:00:00', direction: 'in' },
        ],
        pofiNotes: ['12','13','14','15','16'].map(day => ({ date: `2026-10-${day}`, id: `fixture:note-${day}`, parts: [`${day} Ekim: Bu not yalnızca tarayıcı kabulü için sentetiktir.`] })),
      });
    }
    return route.continue();
  });
  await page.goto('http://127.0.0.1:3000');
  await page.getByRole('heading', { name: 'PDKS’ye bağlan' }).waitFor();
  await page.screenshot({ path: 'output/playwright/archive-login.png', fullPage: true });
  await page.getByRole('textbox', { name: 'Kullanıcı adı' }).fill('fixture-user');
  await page.getByRole('textbox', { name: 'Şifre' }).fill('fixture-password');
  await page.getByRole('button', { name: 'PDKS’ye bağlan', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Fixture: kullanıcı adı' }).waitFor();
  if (await page.getByRole('textbox', { name: 'Şifre' }).inputValue() !== '') throw new Error('Password was not cleared');
  await page.getByRole('textbox', { name: 'Kullanıcı adı' }).fill('fixture-user');
  await page.getByRole('textbox', { name: 'Şifre' }).fill('fixture-password');
  await page.getByRole('button', { name: 'PDKS’ye bağlan', exact: true }).click();
  await page.getByText('DOĞRULAMA KİŞİSİ', { exact: true }).waitFor();
  await page.getByRole('img', { name: /Kayda dayalı süre 4 sa 00 dk 00 sn; Anlık tahmin 3 sa 00 dk 00 sn/ }).waitFor();
  await page.screenshot({ path: 'output/playwright/archive-dashboard.png', fullPage: true });
  await page.getByRole('button', { name: 'Ayarlar', exact: true }).click();
  await page.getByRole('dialog', { name: 'Mesai planı', exact: true }).waitFor();

  await page.getByLabel('Haftalık saat').fill('35');
  await page.getByRole('button', { name: 'Kapat', exact: true }).click();
  await page.reload();
  await page.getByText('DOĞRULAMA KİŞİSİ', { exact: true }).waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pofis:work-plans:v1')));
  if (saved['2026-10-12'].hours !== 35) throw new Error('Plan persistence failed');
  await page.getByRole('button', { name: 'Pofi’nin odasını aç' }).first().click();

  await page.getByRole('button', { name: /Not defteri/ }).click();
  await page.getByText('16 Ekim: Bu not yalnızca tarayıcı kabulü için sentetiktir.', { exact: true }).waitFor();
  if (!await page.getByRole('button', { name: 'Sonraki', exact: true }).isDisabled()) throw new Error('Last note allows next');
  for (let day = 15; day >= 12; day--) {
    await page.getByRole('button', { name: 'Önceki', exact: true }).click();
    await page.getByText(`${day} Ekim: Bu not yalnızca tarayıcı kabulü için sentetiktir.`, { exact: true }).waitFor();
  }
  if (!await page.getByRole('button', { name: 'Önceki', exact: true }).isDisabled()) throw new Error('First note allows previous');
  for (let day = 13; day <= 16; day++) await page.getByRole('button', { name: 'Sonraki', exact: true }).click();
  await page.getByText('16 Ekim: Bu not yalnızca tarayıcı kabulü için sentetiktir.', { exact: true }).waitFor();
  await page.screenshot({ path: 'output/playwright/pofi-notebook-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/playwright/pofi-notebook-mobile.png', fullPage: true });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Notebook mobile horizontal overflow');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole('button', { name: 'Odaya dön', exact: true }).click();

  await page.getByRole('button', { name: /Fotoğraf albümü/ }).click();
  if (await page.locator('.pofi-album-photo').count() !== 8) throw new Error('Album incomplete');
  await page.screenshot({ path: 'output/playwright/archive-album.png', fullPage: true });
  await page.getByRole('button', { name: 'Kapat', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/playwright/archive-mobile.png', fullPage: true });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile horizontal overflow');
  await page.setViewportSize({ width: 1440, height: 1100 });
  failReport = true;
  await page.getByRole('button', { name: 'Raporu yenile', exact: true }).click();
  await page.getByText('Son alınan rapor gösteriliyor. Anlık tahmin durduruldu.').waitFor();
  await page.getByRole('button', { name: 'Bağlantıyı kes', exact: true }).click();
  await page.getByRole('heading', { name: 'PDKS’ye bağlan' }).waitFor();
  if (await page.getByText('DOĞRULAMA KİŞİSİ', { exact: true }).count()) throw new Error('Previous person remained after disconnect');
  if (errors.length) throw new Error(errors.join('\n'));
  return { passed: true, pageErrors: errors, fixturesOnly: true, checks: ['rejected login and password reset', 'login and 4h recorded + 3h estimate', 'plan autosave and reload', 'notebook dates, navigation bounds and mobile', 'album', 'mobile overflow', 'stale report', 'disconnect clears person'] };
}
