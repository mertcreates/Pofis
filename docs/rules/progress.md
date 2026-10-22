# Hedef ilerlemesi ve grafik ölçeği

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/progress.js](../../src/domain/rules/progress.js)

Arayüz: `targetProgress`, `percentage`, `durationSegments`, `chartMaximum`.

## Sözleşme

`targetProgress`, yüzde ve kalan süreyi döndürür. Hedef altında yüzde aşağı, hedefe ulaşınca ve üzerinde en yakına yuvarlanır; hedef üstü yüzde gerçek değeriyle gösterilir. Geçersiz süre veya negatif hedefte ilerleme bilinmez. Devirle sıfıra inen etkin hedef, geçerli süre için %100 karşılanmıştır; kalan sıfırdır. Tamamen kapalı haftada kart yüzde rozeti göstermez. Kalan sürenin alt sınırı sıfırdır. Görsel ölçek sınırları bu modüldedir; CSS boyutları ve renkleri tasarım sisteminde kalır.

Haftalık grafik, `chartMaximum` sahibine yalnız gösterdiği günlük süreleri verir. En az 10 saatlik tavan, 2 saatlik adımlarla büyür. Hedeflerin yüksek olması bu grafiğin ölçeğini değiştirmez; ilerleme göstergeleri hedeflerini kullanmayı sürdürür.

`durationSegments`, süre çubuğu ve haftalık cetvel için 0–1 aralığında kayıtlı, tahmini ve dolu oranlarını ve hedef işaretinin konumunu üretir. Varsayılan ölçek, hedef ile kayıtlı + tahmini toplamının büyüğüdür; günün akışı kendi zaman ekseninin ölçeğini verir. Kayıtlı parça önce yerleşir; tahmin kalan alana sığdırılır. Sıfır ölçek boş gösterilir. Sıfır hedefte işaret çizilmez; süre varsa çubuk bu süreyle dolar. Örneğin 8 saat hedef, 4 saat kayıtlı ve 2 saat tahmin → %50 kayıtlı + %25 tahmin. Hedef 8 saat, süreler 6 + 6 saat → %50 + %50.

## Kullanan yerler

- [primitives.tsx](../../src/components/primitives.tsx)
- [weekly-ruler.ts](../../src/components/dashboard/weekly-ruler.ts): günlük parçalar ortak ölçeği kullanır.
- [week-chart.tsx](../../src/components/attendance/week-chart.tsx)
- [metrics.tsx](../../src/components/dashboard/metrics.tsx)
- [weekly-total.tsx](../../src/components/dashboard/weekly-total.tsx): haftalık yüzde toplam hedefi, günlük çubuklar rapordaki etkin günlük hedefleri kullanır.

## Testler

- [rules.test.ts](../../src/domain/rules/rules.test.ts)
- [duration-segments.test.tsx](../../src/components/duration-segments.test.tsx): iki görünümde sıfır hedef, hedef altı/üstü, parçalar ve ölçek sınırı.
