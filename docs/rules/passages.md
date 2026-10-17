# Turnike geçişleri

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/passages.js](../../src/domain/rules/passages.js)

Arayüz: `passageDay`, `passageRecordRows`.

## Sözleşme

Raporun zorunlu hareket listesi giriş/çıkış çiftlerini ve son açık girişi belirler. Tekrarlanan yön veya eşleşmeyen çıkış belirsizliktir; geçmiş güne açık giriş bırakılamaz. Gün değerlendirmesi saat sırasını kullanır. Kayıt satırları verilen sıradaki sorunları da korur. Çiftler hareket detaylarını oluşturur; kayıtlı mesai [ilk giriş–son çıkış sahibinde](recorded-time.md) hesaplanır. Adaptör seçili tarih aralığının bütün sayfalarını birleştirir; kaynak erişimi [kaynak politikasında](source-policy.md) tanımlıdır.

## Bağımlılıklar

- [Takvim ve kaynak saati](calendar.md)

## Kullanan yerler

- [Günlük kayıt durumu](record-status.md) rapor adaptöründen bu analizin sonucunu alır; ara geçiş belirsizliğini ve geçmiş açık girişi korur.

- [report.ts](../../src/domain/report.ts)

## Testler

- [report.test.ts](../../src/domain/report.test.ts)
- [rules.test.ts](../../src/domain/rules/rules.test.ts)
