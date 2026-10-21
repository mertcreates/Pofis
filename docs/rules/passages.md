# Turnike geçişleri

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/passages.js](../../src/domain/rules/passages.js)

Arayüz: `passageDay`, `passageRecordRows`.

## Sözleşme

Raporun zorunlu hareket listesi giriş/çıkış çiftlerini ve son açık girişi belirler. Art arda giriş veya çıkış uyarı üretir; ilk giriş–son çıkış süresini ve geçerli son açık girişten canlı hesabı durdurmaz. Girişsiz ilk çıkış, okunamayan hareket ve geçmiş gündeki açık giriş belirsizliktir. Gün değerlendirmesi saat sırasını kullanır. Kayıt satırları verilen sıradaki sorunları da korur. Çiftler hareket detaylarını oluşturur; kayıtlı mesai [ilk giriş–son çıkış sahibinde](recorded-time.md) hesaplanır. Adaptör seçili tarih aralığının bütün sayfalarını birleştirir; kaynak erişimi [kaynak politikasında](source-policy.md) tanımlıdır.

## Kayıt sorunları

`passageDay.issues` neden kodu ve ilgili saati taşır. Tekrarlar uyarı, eşleşmeyen ilk çıkış, geçmiş açık giriş ve okunamayan hareket belirsizlik nedenidir. Nedenler ilk giriş–son çıkış hesabını değiştirmez; [kayıt durumu](record-status.md) bunları rapor modeline aktarır.

| Kod | Koşul |
| --- | --- |
| `repeated-entry` | Arada çıkış kaydı olmadan yeni giriş |
| `repeated-exit` | Arada giriş kaydı olmadan yeni çıkış |
| `unmatched-exit` | Öncesinde eşleşecek giriş bulunmayan ilk çıkış |
| `missing-exit` | Geçmiş günde çıkışı bulunmayan giriş |
| `invalid-record` | Okunamayan saat veya giriş–çıkış yönü |

Bugünkü güvenilir açık giriş geçerli durumdur. Geçersiz saatte `time` alanı `null` olur.

`hasReliableOpenEntry`, son hareket giriş olduğunda ve gün içinde okunamayan saat/yön bulunmadığında `true` olur. Art arda girişte son giriş açık kabul edilir; canlı süre yine günün ilk girişinden hesaplanır. Tekrarlar `issues` içinde uyarı olarak kalır ve tek başına `uncertain` üretmez. Gerçek eşleşmeyen çıkış ve geçersiz hareket belirsizliği korunur. Kayıt satırları tekrarın önceki hareketini eşleşmeyen, son girişi açık veya sonraki çıkışla eşleşmiş gösterir.

## Bağımlılıklar

- [Takvim ve kaynak saati](calendar.md)

## Kullanan yerler

- [Günlük kayıt durumu](record-status.md) rapor adaptöründen bu analizin sonucunu alır; ara geçiş belirsizliğini ve geçmiş açık girişi korur.

- [report.ts](../../src/domain/report.ts)

## Testler

- [report.test.ts](../../src/domain/report.test.ts)
- [record-status.test.ts](../../src/domain/rules/record-status.test.ts)
- [rules.test.ts](../../src/domain/rules/rules.test.ts)
