# Görünen haftalık toplam

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/week.ts](../../src/domain/rules/week.ts)

Arayüz: `summarizeWeek`.

## Sözleşme

Toplam bugüne kadar olan günleri kapsar. Turnikeden türetilen günlük kayıtlı süreler toplanır ve duration sahibinin ürettiği ek tahmin bir kez eklenir. Eksik veya belirsiz gün haftayı eksik yapar. `recordIssues` içindeki çift giriş/çıkış uyarıları süreyi ve haftalık bütünlüğü değiştirmez; gerçek eşleşmeyen çıkış, geçmiş açık giriş ve okunamayan hareket belirsizliği korur. Giriş ya da çıkışı bulunan gün kayıtlı gün sayılır.

```text
Görünen gerçekleşen toplam = kayıtlı süreler toplamı + canlı ek tahmin
```

[Plan sahibi](work-plan.md), haftalık hedef ve geçmişte tamamlanmış günlerin plan/gerçekleşen farklarıyla gereken süreleri belirler. Çıkış hedefi ilk giriş + bugünün gereken süresidir. Bu belgedeki görünen gerçekleşen toplam, haftalık plan hedefi ve plandaki beklenen toplam ayrı değerlerdir; terimler [sözlükte](../../GLOSSARY.md) tanımlıdır.

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
