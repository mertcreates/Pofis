# Takvim ve kaynak saati

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/calendar.ts](../../src/domain/rules/calendar.ts)

Arayüz: `TIME_ZONE`, `dateKey`, `secondsOf`, `sourceTimestamp`, `weekday`, `weekStart`, `weekDates`, `addDays`, `isDateKey`, `clockSeconds`.

## Sözleşme

İstanbul takvimi kullanılır; hafta pazartesi başlar. Kaynak tarih/saatinin UTC karşılığı o tarihteki İstanbul farkından üretilir. Gerçek olmayan tarih ve saatler reddedilir. UTC ISO aktarım zamanları açıkça İstanbul saat dilimini kullanan formatlayıcıyla gösterilir. Docker çalışma zamanı ayrıca `TZ=Europe/Istanbul` tanımlar.

Tarihsel ileri saat geçişinde, geçiş öncesi kaynak saatleri eski UTC farkını korur. Örneğin 29 Mart 2015 02:30 İstanbul saati `2015-03-29T00:30:00Z` olur; atlanan 03:30 yerel saati `null` döndürür. Çözülen zaman damgası aynı kaynak tarih ve saatine geri dönmelidir.

## Kullanan yerler

- [report.ts](../../src/domain/report.ts)
- [pdks.js](../../src/server/pdks.js)
- [report-response.ts](../../src/data/report-response.ts)
- [week-calendar.ts](../../src/components/dashboard/week-calendar.ts), [WeekPicker](../../src/components/dashboard/week-picker.tsx): ay gezinmesi ve ayla kesişen pazartesiler.
- [time.ts](../../src/domain/time.ts): tarih aralığı etiketleri; başka yıl ve yıl sınırında açık yıl gösterimi.
- [Yemek tarihleri](../../src/lib/meals/dates.ts) ve [tarih seçici](../../src/components/meals/date-picker.tsx): ortak gün/hafta hesapları ve saat dilimi; yemeğe özgü aralık ve ay gezinmesi [menü sözleşmesindedir](meal-menu.md).

## Testler

- [time.test.ts](../../src/domain/time.test.ts)
