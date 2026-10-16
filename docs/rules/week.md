# Görünen haftalık toplam

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/week.ts](../../src/domain/rules/week.ts)

Arayüz: `summarizeWeek`.

## Sözleşme

Gelecek günler dışarıda bırakılır. Turnikeden türetilen günlük kayıtlı süreler toplanır ve duration sahibinin ürettiği ek tahmin bir kez eklenir. Geçmiş eksik veya belirsiz gün haftayı eksik yapar. Giriş ya da çıkışı bulunan gün kayıtlı gün sayılır. Çıkış hedefini çözen plan sahibi haftanın yalnız kayıtlı toplamını kullanır; ekrandaki toplam ek tahmini de içerir.

## Bağımlılıklar

- [Günlük kayıt durumu](record-status.md): boş geçmiş planlı gün `missing`, belirsiz gün `uncertain` sonucuyla haftalık bütünlüğü etkiler.

- [Anlık tahmin ve süre bölümleri](duration.md)
- [Turnikeden günlük özet ve kayıtlı süre](recorded-time.md)

## Kullanan yerler

- [metrics.tsx](../../src/components/dashboard/metrics.tsx)

## Testler

- [rules.test.ts](../../src/domain/rules/rules.test.ts)
- [report.test.ts](../../src/domain/report.test.ts)
- [Tarayıcı kabulü](../../scripts/acceptance/archive-behavior.js)
