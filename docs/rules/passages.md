# Turnike geçişleri

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/passages.js](../../src/domain/rules/passages.js)

Arayüz: `passageDay`, `passageRecordRows`.

## Sözleşme

Raporun zorunlu hareket listesi giriş/çıkış çiftlerini ve son açık girişi belirler. Tekrarlanan yön veya eşleşmeyen çıkış belirsizliktir; geçmiş gündeki açık giriş belirsiz olarak işaretlenir. Gün değerlendirmesi saat sırasını kullanır. Kayıt satırları verilen sıradaki sorunları da korur. Çiftler hareket detaylarını oluşturur; kayıtlı mesai [ilk giriş–son çıkış sahibinde](recorded-time.md) hesaplanır. Adaptör seçili tarih aralığının bütün sayfalarını birleştirir; kaynak erişimi [kaynak politikasında](source-policy.md) tanımlıdır.

## Kayıt sorunları

`passageDay.issues` neden kodu ve ilgili saati taşır. Nedenler süre hesabını değiştirmez; [kayıt durumu](record-status.md) bunları rapor modeline aktarır.

| Kod | Koşul |
| --- | --- |
| `repeated-entry` | Arada çıkış kaydı olmadan yeni giriş |
| `unmatched-exit` | Girişle eşleşmeyen çıkış; art arda çıkışları da kapsar |
| `missing-exit` | Geçmiş günde çıkışı bulunmayan giriş |
| `invalid-record` | Okunamayan saat veya giriş–çıkış yönü |

Bugünkü güvenilir açık giriş geçerli durumdur. Geçersiz saatte `time` alanı `null` olur.

`hasReliableOpenEntry`, son girişin kendi eşleşmesi güvenilir olduğunda ve gün içinde okunamayan saat/yön bulunmadığında `true` olur. Önceki tekrarlı giriş/çıkışlar `uncertain` ve `issues` alanlarında korunur; sonradan gelen tek açık girişi engellemez. Son girişin kendisi tekrarlıysa güvenilir açık giriş yoktur. Kayıt satırlarında önceki çıkışın eşleşmemesi, son tek girişin açık satır olarak gösterilmesini engellemez.

## Bağımlılıklar

- [Takvim ve kaynak saati](calendar.md)

## Kullanan yerler

- [Günlük kayıt durumu](record-status.md) rapor adaptöründen bu analizin sonucunu alır; ara geçiş belirsizliğini ve geçmiş açık girişi korur.

- [report.ts](../../src/domain/report.ts)

## Testler

- [report.test.ts](../../src/domain/report.test.ts)
- [record-status.test.ts](../../src/domain/rules/record-status.test.ts)
- [rules.test.ts](../../src/domain/rules/rules.test.ts)
