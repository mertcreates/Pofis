# Hedef ilerlemesi ve grafik ölçeği

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/progress.js](../../src/domain/rules/progress.js)

Arayüz: `targetProgress`, `percentage`, `chartMaximum`.

## Sözleşme

`targetProgress`, yüzde ve kalan süreyi döndürür. Hedef altında yüzde aşağı, hedefe ulaşınca ve üzerinde en yakına yuvarlanır; hedef üstü yüzde saklanmaz. Geçersiz süre veya negatif hedefte ilerleme bilinmez. Devirle sıfıra inen etkin hedef, geçerli süre için %100 karşılanmıştır; kalan sıfırdır. Tamamen kapalı haftada kart yüzde rozeti göstermez. Kalan süre negatif olmaz. Görsel ölçek sınırları bu modüldedir; CSS boyutları ve renkleri tasarım sisteminde kalır.

Haftalık grafik, `chartMaximum` sahibine yalnız gösterdiği günlük süreleri verir. En az 10 saatlik tavan, 2 saatlik adımlarla büyür. Hedeflerin yüksek olması bu grafiğin ölçeğini değiştirmez; ilerleme göstergeleri hedeflerini kullanmayı sürdürür.

## Bağımlılıklar

Başka ürün kuralına bağlı değildir.

## Kullanan yerler

- [primitives.tsx](../../src/components/primitives.tsx)
- [week-chart.tsx](../../src/components/attendance/week-chart.tsx)
- [metrics.tsx](../../src/components/dashboard/metrics.tsx)

## Testler

- [rules.test.ts](../../src/domain/rules/rules.test.ts)
- [time.test.ts](../../src/domain/time.test.ts)
- [Tarayıcı kabulü](../../scripts/acceptance/archive-behavior.js)
