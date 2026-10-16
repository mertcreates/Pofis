# Anlık tahmin ve süre bölümleri

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/duration.js](../../src/domain/rules/duration.js)

Arayüz: `dailyDurationState`, `dailyRecordState`, `durationTotals`.

## Sözleşme

Canlı toplam ilk girişten şimdiki İstanbul saatine kadar geçen süredir. Yalnız bugün, güncel rapor, geçerli ilk giriş ve güvenilir son açık giriş varsa kullanılır. Günlük özet ve açık giriş aynı zorunlu hareket listesinden üretilir. Şimdiki an açık girişten önceyse veya canlı toplam kayıtlı sürenin gerisindeyse kayıtlı sonuca dönülür. Ek tahmin = canlı toplam − kayıtlı süre; bir kez burada hesaplanır. Bilinmeyen kayıt sıfır çalışılmış sayılmaz.

08:00 giriş / 12:00 çıkış / 13:00 giriş / 15:00 şimdi → 4 saat kayıtlı + 3 saat ek tahmin = 7 saat. Ara molalar hesaplanmaz veya düşülmez. Son hareket çıkışsa veya hareketler belirsizse ek tahmin durur.

## Bağımlılıklar

- [Takvim ve kaynak saati](calendar.md)
- [Turnikeden günlük özet ve kayıtlı süre](recorded-time.md)
- [Turnike geçişleri](passages.md)
- [Hedef ilerlemesi ve grafik ölçeği](progress.md)

## Kullanan yerler

- [report.ts](../../src/domain/report.ts)
- [attendance.ts](../../src/domain/attendance.ts)

`report.ts` sabit rapor hazırlığını saat izdüşümünden ayırır. Saat güncellemelerinde yalnız bugünün `dailyDurationState` sonucu değerlendirilir; ek tahmin, hedef ilerlemesi ve Pofi kendi sahiplerinden gelir. Rapor, plan, İstanbul tarihi veya tazelik değiştiğinde hazırlık yeniden kurulur. [Orkestrasyon sahibi](README.md#diğer-tek-sahipler).

## Testler

- [rules.test.ts](../../src/domain/rules/rules.test.ts)
- [report.test.ts](../../src/domain/report.test.ts)
- [Tarayıcı kabulü](../../scripts/acceptance/archive-behavior.js)
