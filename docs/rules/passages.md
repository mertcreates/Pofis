# Turnike geçişleri

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/passages.js](../../src/domain/rules/passages.js)

Arayüz: `passageDay`, `passageRecordRows`.

## Sözleşme

Raporun zorunlu hareket listesi saat sırasıyla değerlendirilerek giriş/çıkış çiftleri ve son açık giriş belirlenir. Çiftler hareket ayrıntılarını oluşturur. Kayıt satırları kaynak sırasındaki sorunları da korur. Kayıtlı mesai [ilk giriş–son çıkış sahibinde](recorded-time.md), sayfalamanın bütünlüğü [kaynak politikasında](source-policy.md) yönetilir.

## Kayıt sorunları

`passageDay.issues` neden kodu ve ilgili saati taşır. Nedenler ilk giriş–son çıkış hesabını değiştirmez; günlük duruma etkileri [kayıt durumu sahibinde](record-status.md) değerlendirilir.

| Kod | Koşul |
| --- | --- |
| `repeated-entry` | Arada çıkış kaydı olmadan yeni giriş |
| `repeated-exit` | Arada giriş kaydı olmadan yeni çıkış |
| `unmatched-exit` | Öncesinde eşleşecek giriş bulunmayan ilk çıkış |
| `missing-exit` | Geçmiş günde çıkışı bulunmayan giriş |
| `invalid-record` | Okunamayan saat veya giriş–çıkış yönü |

Bugünkü güvenilir açık giriş geçerli durumdur. Geçersiz saatte `time` alanı `null` olur.

`hasReliableOpenEntry`, son hareket giriş olduğunda ve gün içinde okunamayan saat/yön bulunmadığında `true` olur. Art arda girişte son giriş açık kabul edilir; canlı süre yine günün ilk girişinden hesaplanır. Tekrarlar `issues` içinde uyarı olarak kalır ve tek başına `uncertain` üretmez. İlk eşleşmeyen çıkış `issues` içinde korunur; bugünkü güvenilir son açık giriş [günlük kayıt durumunda](record-status.md) bu önceki soruna rağmen `open` veya `ongoing` olur. Son açık giriş yoksa eşleşmeyen çıkış belirsizliği korunur. Geçersiz hareket güvenilir açık girişi engeller. Kayıt satırları tekrarın önceki hareketini eşleşmeyen, son girişi açık veya sonraki çıkışla eşleşmiş gösterir.

## Bağımlılıklar

- [Takvim ve kaynak saati](calendar.md)

## Kullanan yerler

- [Günlük kayıt durumu](record-status.md) rapor adaptöründen bu analizin sonucunu alır; ara geçiş belirsizliğini ve geçmiş açık girişi korur.

- [report.ts](../../src/domain/report.ts)

## Testler

- [report.test.ts](../../src/domain/report.test.ts)
- [record-status.test.ts](../../src/domain/rules/record-status.test.ts)
- [rules.test.ts](../../src/domain/rules/rules.test.ts)
