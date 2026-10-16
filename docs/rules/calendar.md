# Takvim ve kaynak saati

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/calendar.ts](../../src/domain/rules/calendar.ts)

Arayüz: `TIME_ZONE`, `dateKey`, `secondsOf`, `sourceTimestamp`, `weekday`, `weekStart`, `weekDates`, `addDays`, `isDateKey`, `clockSeconds`.

## Sözleşme

İstanbul takvimi kullanılır; hafta pazartesi başlar. Kaynak tarih/saatinin UTC karşılığı o tarihteki İstanbul farkından üretilir. Gerçek olmayan tarih ve saatler reddedilir. İşletim sisteminin yerel TZ değeri kullanılmaz; UTC ISO aktarım zamanları İstanbul formatlayıcısıyla gösterilir. Docker çalışma zamanı ayrıca `TZ=Europe/Istanbul` tanımlar.

## Bağımlılıklar

Başka ürün kuralına bağlı değildir.

## Kullanan yerler

- [report.ts](../../src/domain/report.ts)
- [pdks.js](../../src/server/pdks.js)
- [report-response.ts](../../src/data/report-response.ts)
- [week-calendar.ts](../../src/components/dashboard/week-calendar.ts), [WeekPicker](../../src/components/dashboard/week-picker.tsx): ay gezinmesi ve ayla kesişen pazartesiler.
- [time.ts](../../src/domain/time.ts): tarih aralığı etiketleri; başka yıl ve yıl sınırında açık yıl gösterimi.

## Testler

- [time.test.ts](../../src/domain/time.test.ts)
- [week-calendar.test.ts](../../src/components/dashboard/week-calendar.test.ts)
- [Tarayıcı kabulü](../../scripts/acceptance/archive-behavior.js)
