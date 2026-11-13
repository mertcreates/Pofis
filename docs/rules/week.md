# Görünen haftalık toplam

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/week.ts](../../src/domain/rules/week.ts)

Arayüz: `summarizeWeek`.

## Sözleşme

Toplam bugüne kadar olan günleri kapsar. Günlük kayıtlı sürelere [süre sahibinin](duration.md) ürettiği ek tahmin bir kez eklenir. [Günlük durum](record-status.md) `missing` veya `uncertain` ise hafta eksiktir; `recordIssues` uyarıları tek başına bu kararı değiştirmez. Giriş ya da çıkışı bulunan gün kayıtlı gün sayılır.

```text
Görünen gerçekleşen toplam = kayıtlı süreler toplamı + canlı ek tahmin
```

Haftalık hedef, gereken süreler ve çıkış hedefi [plan sahibinden](work-plan.md) gelir. Görünen gerçekleşen toplam ile plandaki beklenen toplam [sözlükte](../../GLOSSARY.md) ayrı tanımlıdır.

**Haftalık hedefe kalan**, haftalık hedef ile görünen gerçekleşen toplam arasındaki pozitif farktır. [Önceki günlerin açığı ve kapatma saati](work-plan.md#açığı-bugün-kapatma-saati) plan sahibinden gelir.

Haftalık fark bütün haftanın hedefini kullanır. Açık grubu, geçmiş günlerin farkını güncel plan ve haftalık hedefle dengeleyen ayrı sonucu sunar. Açık kapandıktan sonraki fazla süre de bu grubun kapatma eşiğinden hesaplanır. Gösterim koşulları [plan sözleşmesindedir](work-plan.md#açığı-bugün-kapatma-saati).

## Bağımlılıklar

- [Günlük kayıt durumu](record-status.md): boş geçmiş planlı gün `missing`, belirsiz gün `uncertain` sonucuyla haftalık bütünlüğü etkiler.

- [Anlık tahmin ve süre bölümleri](duration.md)
- [Turnikeden günlük özet ve kayıtlı süre](recorded-time.md)

## Kullanan yerler

- [metrics.tsx](../../src/components/dashboard/metrics.tsx)
- [weekly-total.tsx](../../src/components/dashboard/weekly-total.tsx)

## Testler

- [rules.test.ts](../../src/domain/rules/rules.test.ts)
- [report.test.ts](../../src/domain/report.test.ts)
