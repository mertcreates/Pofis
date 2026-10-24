import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { PlanTimePlanner } from "./plan-time-planner";
import type { PlanTime } from "@/domain/rules/work-plan";

function render(time?: PlanTime, disabled = false, seconds = 28800, day = 3) {
  return load(renderToStaticMarkup(<PlanTimePlanner time={time} seconds={seconds} day={day}
    disabled={disabled} id="clock" onCommit={() => true} />));
}

test("Planlayıcı içeriği açıldığında saat alanı ve kontroller doğrudan sunulur", () => {
  const $ = render();
  expect($('.work-plan-time-field input').length).toBe(2);
  expect($('.work-plan-time-field input').map((_, input) => $(input).attr('value')).get()).toEqual(['', '']);
  expect($('.work-plan-time-choice button').map((_, button) => $(button).text()).get()).toEqual(['girersem', 'çıkmak için']);
  expect($('.work-plan-time-clear').is(':disabled')).toBe(true);
  expect($('output').text()).toBe('');
  expect($('button[aria-expanded]').length).toBe(0);
});

test.each([
  [{ anchor: 'entry', minute: 390 }, ['06', '30'], 'çıkarım', '14:30’da'],
  [{ anchor: 'exit', minute: 1080 }, ['18', '00'], 'girmeliyim', '10:00’da'],
  [{ anchor: 'entry', minute: 363 }, ['06', '03'], 'çıkarım', '14:03’te'],
  [{ anchor: 'entry', minute: 400 }, ['06', '40'], 'çıkarım', '14:40’ta'],
] as const)("kayıtlı %j saati düzenleme alanı ve karşı sonuçta görünür", (time, values, opposite, result) => {
  const $ = render(time);
  expect($('.work-plan-time-field input').map((_, input) => $(input).attr('value')).get()).toEqual([...values]);
  expect($('.work-plan-time-choice').length).toBe(1);
  expect($('.work-plan-time-suffix').text()).toBe(time.minute === 363 ? '’te' : time.minute === 400 ? '’ta' : time.minute === 1080 ? '’de' : '’da');
  expect($('output .work-plan-time-conclusion').text()).toBe(opposite);
  expect($('output strong').text()).toBe(result);
  expect($('.work-plan-time-choice button[aria-pressed=true]').text()).toBe(time.anchor === 'entry' ? 'girersem' : 'çıkmak için');
});

test("cümledeki sonuç güvenli dakika hesabını korur", () => {
  const $ = render({ anchor: 'entry', minute: 390 }, false, 24643);
  expect($('output strong').text()).toBe('13:21’de');
});

test.each([
  [{ anchor: 'entry', minute: 1200 }, 3, '04:00’te', 'Cuma çıkarım'],
  [{ anchor: 'exit', minute: 390 }, 3, '22:30’da', 'Çarşamba girmeliyim'],
  [{ anchor: 'entry', minute: 1200 }, 6, '04:00’te', 'Pazartesi çıkarım'],
  [{ anchor: 'exit', minute: 390 }, 0, '22:30’da', 'Pazar girmeliyim'],
] as const)("gece yarısı aşımında %j sonucu gün adıyla görünür", (time, day, clock, conclusion) => {
  const $ = render(time, false, 28800, day);
  expect($('output strong').text()).toBe(clock);
  expect($('.work-plan-time-conclusion').text()).toBe(conclusion);
});

test("kilitli saat alanı ve tüm düzenleme eylemleri devre dışıdır", () => {
  const $ = render({ anchor: 'entry', minute: 390 }, true);
  expect($('input:not(:disabled), button:not(:disabled)').length).toBe(0);
  expect($('output strong').text()).toBe('14:30’da');
});
