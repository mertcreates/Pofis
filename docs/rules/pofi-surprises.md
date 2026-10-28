# Pofi sürprizleri

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/pofi-surprises.ts](../../src/domain/rules/pofi-surprises.ts)

Arayüz: `POFI_SURPRISES`, `clockSurpriseAt`, `hasMirroredRecords`, `specialMinuteRemaining`, `nextSurpriseTap`.

## Sözleşme

Oda bekleme süresi, tekrar dokunma eşiği, çağırma sözcüğü ve görünme süresi tek politikadadır. Bileşenler DOM olaylarını/odakları yönetir; süre ve eşikleri bu politikadan alır.

### Saat ve kayıt sürprizleri

Pofi paneli, gösterilen güncel İstanbul saatinin saat ve dakikasına göre en fazla bir sürpriz seçer. Panel açıkken dakika değiştiğinde mesaj da güncellenir; demo kendi sanal saatini kullanır. Saniyeler örüntüye katılmaz. Pofi'nin sistem durumu korunur; kayıt belirsizliği/hata mesajı sürprizle değiştirilmez. Örüntü yoksa normal Pofi mesajı görünür.

Birden fazla koşul sağlanıyorsa ilk eşleşme seçilir:

| Öncelik | Örüntü | Örnek |
| --- | --- | --- |
| 1 | Gün, ay, saat ve dakika eşit | 11 Kasım 11:11, 12 Aralık 12:12 |
| 2 | Dört rakam eşit | 00:00, 11:11, 22:22 |
| 3 | Dört rakam sırayla artıyor | 01:23, 12:34, 23:45 |
| 4 | Saat tersten de aynı okunuyor | 10:01, 12:21 |
| 5 | Saat ve dakika eşit | 09:09, 13:13 |
| 6 | İki tekrarlı rakam çifti | 11:22, 22:44 |
| 7 | Dakika, sıfırdan büyük saatin iki katı | 10:20, 01:02 |
| 8 | Dakika, saatten bir fazla | 09:10, 10:11 |

Bu örüntüler günde 99 ayrı dakikaya karşılık gelir; tarih-saat eşleşmesi bu dakikalardan birinin mesajını değiştirir. `specialMinuteRemaining` eski 12:34 süre arayüzünü korur; panel seçiminde kullanılmaz.

Kayıt ayrıntısında, gerçek ilk giriş ve son çıkışın ikisi de saat/dakika düzeyinde palindromsa Pofi'nin kısa notu görünür. Her iki kayıt da bulunmalı ve son çıkış ilk girişten önce olmamalıdır. Kayıtların saniyeleri, durumları ve kişisel planlar değiştirilmez.

### Klavye çağrısı

Mesaim görünümünde `pofi` yazılınca Pofi cevap verir. Aynı görünüm açıkken sonraki üç çağrı sırayla ilerler; dördüncü cevap sonraki çağrılarda da kullanılır. Görünüm kaldırıldığında veya sayfa yenilendiğinde sıra başa döner, kalıcı kayıt tutulmaz. `miyav`, Pofi çağrısının mesajı görünürken yazılırsa “Ben de tam onu diyecektim.”, diğer durumda “Efendim?” cevabını gösterir. Her cevap beş saniye görünür; yeni cevap süreyi yeniler, Escape kapatır. Yazı alanlarında, düzenlenebilir içerikte, kısayollarda ve tuş tekrarı sırasında sözcük dinlenmez. Odak değişimi ve sekmeden ayrılma yarım kalmış sözcüğü sıfırlar.

### Sürüm notu

Kaynak footer'daki sürüm notu `versionRevealTaps: 5` dokunuşla `versionWindowMs: 5000` içinde açılır. Süre dolunca yeni dizi başlar; kullanıcı odağı başka bir kontrole aldığında dizi temizlenir. İlk dokunuşla açılan sürüm geçmişinin sayfa başlığına otomatik odaklanması diziyi korur; geçmiş açıkken aynı sürüme tekrar dokunmak konumu değiştirmez. Oda içindeki üç dokunuş eşiği ayrı davranıştır.

## Bağımlılıklar

- [Takvim ve kaynak saati](calendar.md)

## Kullanan yerler

- [room.js](../../src/components/pofi/room.js)
- [pofi-call.js](../../src/components/pofi-call.js)
- [pofi-panel.tsx](../../src/components/dashboard/pofi-panel.tsx)
- [records.tsx](../../src/components/attendance/records.tsx)
- [app-footer.js](../../src/components/shell/app-footer.js)

## Testler

- [rules.test.ts](../../src/domain/rules/rules.test.ts): eski 12:34 süre arayüzü, dokunma eşiği ve kural sahipliği.
- [pofi-panel.test.tsx](../../src/components/dashboard/pofi-panel.test.tsx): sürpriz dışındaki Pofi durum mesajları.
