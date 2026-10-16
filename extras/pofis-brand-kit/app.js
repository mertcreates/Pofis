'use strict';
// Self-contained, offline-safe demo. All numbers below are sample data, not PDKS records.
const sample = Object.freeze({
  workTodayMinutes: 384,
  workWeekMinutes: 2180,
  currentTimeMinutes: 16 * 60 + 13,
  dayStartMinutes: 8 * 60 + 57,
  breakMinutes: 52,
  chart: [462, 496, 415, 423, 384]
});
let dailyTarget = 480;
let weeklyTarget = 2400;
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const duration = minutes => `${Math.floor(minutes / 60)} sa ${pad(minutes % 60)} dk`;
const percentage = (value, target) => Math.min(100, Math.round(100 * value / target));
const clock = minutes => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
function updateUI() {
  const rest = Math.max(0, dailyTarget - sample.workTodayMinutes);
  const pct = percentage(sample.workTodayMinutes, dailyTarget);
  const wpct = percentage(sample.workWeekMinutes, weeklyTarget);
  $('today-pct').textContent = `%${pct}`;
  $('left-pct').textContent = `%${Math.max(0, 100 - pct)}`;
  $('week-pct').textContent = `%${wpct}`;
  $('today-fill').style.width = `${pct}%`;
  $('week-fill').style.width = `${wpct}%`;
  $('today-progress').setAttribute('aria-valuenow', String(pct));
  $('week-progress').setAttribute('aria-valuenow', String(wpct));
  $('today-target').textContent = `Hedef: ${duration(dailyTarget)}`;
  $('week-target').textContent = `Hedef: ${duration(weeklyTarget)}`;
  $('remaining').innerHTML = rest === 0 ? 'Tamamlandı' : `${Math.floor(rest / 60)} <small>sa</small> ${pad(rest % 60)} <small>dk</small>`;
  $('remaining-foot').textContent = `${duration(dailyTarget)} hedefe göre`;
  $('exit-estimate').textContent = rest === 0 ? 'Tamamlandı' : clock(sample.currentTimeMinutes + rest);
  $('timeline-end').textContent = clock(sample.currentTimeMinutes + rest);
  $('timeline-summary').textContent = `${duration(dailyTarget)} hedefin %${pct}'i`;
  $('weekly-completion').textContent = `${duration(weeklyTarget)} haftalık hedefin %${wpct}'i`;
  $('pofi-message').textContent = rest ? `Hedefe ulaşmana ${duration(rest)} kaldı.` : 'Günlük hedefin tamamlandı. Bugünlük bu kadar.';
  // Adjust timeline proportions from exact 08:57-12:31-13:23-16:13 entries and estimated exit.
  const elapsed = sample.currentTimeMinutes - sample.dayStartMinutes;
  const total = elapsed + rest;
  for (const [selector, mins] of [['.time-work.first',214],['.time-break',52],['.time-work.second',170]]) {
    document.querySelector(selector).style.width = `${100 * mins / total}%`;
  }
  document.querySelector('.time-now').style.left = `${100 * elapsed / total}%`;
}
function openDialog(dialog) {
  if (dialog && !dialog.open) dialog.showModal();
}
const settingsDialog = $('settings-dialog');
const reportDialog = $('report-dialog');
const recordsDialog = $('records-dialog');
$('settings-nav').addEventListener('click', () => openDialog(settingsDialog));
$('report-nav').addEventListener('click', () => openDialog(reportDialog));
$('open-records').addEventListener('click', () => openDialog(recordsDialog));
$('close-report').addEventListener('click', () => reportDialog.close());
$('close-records').addEventListener('click', () => recordsDialog.close());
$('apply-settings').addEventListener('click', () => {
  dailyTarget = Number($('daily-target').value);
  weeklyTarget = Number($('weekly-target').value);
  updateUI();
});
$('download-report').addEventListener('click', () => {
  const rows = [['Gun','Dakika','Sure'],['Pazartesi',462,'7:42'],['Sali',496,'8:16'],['Carsamba',415,'6:55'],['Persembe',423,'7:03'],['Cuma',384,'6:24'],['Toplam',2180,'36:20']];
  const csv = '\uFEFF' + rows.map(row => row.join(';')).join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');link.href=url;link.download='pofis-ornek-hafta.csv';link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
});
const linkNodes = document.querySelectorAll('a.nav-link');
linkNodes.forEach(link => link.addEventListener('click', () => {
  linkNodes.forEach(item => { item.classList.remove('is-active');item.removeAttribute('aria-current'); });
  link.classList.add('is-active');link.setAttribute('aria-current', 'page');
}));
// Do not introduce looping mascot animations. Pofi is deliberately a static asset.
updateUI();
