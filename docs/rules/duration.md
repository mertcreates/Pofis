# Anlık tahmin ve süre bölümleri

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/duration.js](../../src/domain/rules/duration.js)

Arayüz: `dailyDurationState`, `dailyRecordState`, `durationTotals`.

## Sözleşme

Arayüzde **Kayıtlı süre**, ilk giriş ile son çıkış arasındaki süreyi; **Canlı toplam**, güvenilir açık giriş varken ilk girişten şimdiki ana kadar olan süreyi; **Anlık tahmin**, canlı toplamın kayıtlı süreyi aşan bölümünü adlandırır. Grafik ayrıntısındaki canlı toplam ile çubuğun anlık tahmin bölümü bu adlarla ayrılır. Günün akışı kartında toplam “Bugünkü mesai”, lejant bölümleri “Kayıtlı” ve “Tahmini” olarak gösterilir. Haftalık toplam başlığı her durumda “Haftalık toplam” olarak gösterilir.

Canlı toplam ilk girişten şimdiki İstanbul saatine kadar geçen süredir. Yalnız bugün, güncel rapor, geçerli ilk giriş ve güvenilir son açık giriş varsa kullanılır. Günlük özet ve açık giriş aynı zorunlu hareket listesinden üretilir. Şimdiki an açık girişten önceyse veya canlı toplam kayıtlı sürenin gerisindeyse kayıtlı sonuca dönülür. Anlık tahmin = canlı toplam − kayıtlı süre; bir kez burada hesaplanır. Kayıtlı süre bilinmese de güvenilir açık girişten canlı toplam üretilir; güvenilir açık giriş yoksa bilinmeyen süre korunur.

08:00 giriş / 12:00 çıkış / 13:00 giriş / 15:00 şimdi → 4 saat kayıtlı + 3 saat anlık tahmin = 7 saat. Ara mola aralıkları canlı toplama dahildir. Son hareket çıkışsa veya son açık giriş güvenilir değilse anlık tahmin durur. Yön tekrarları ve son girişten önceki eşleşmeyen çıkış raporda korunur; geçiş sahibinin `hasReliableOpenEntry` sonucu doğruysa canlı hesabı engellemez. 08:00 ve 09:00 art arda giriş / 10:00 şimdi → ilk girişten 2 saat canlı toplam. 12:00 çıkış / 13:00 giriş / 15:00 şimdi → kayıtlı süre bilinmez, 2 saat canlı toplam. Okunamayan saat/yön canlı hesabı engeller.

06:16:23 ilk giriş; 12:48:51 ve 12:48:54 art arda giriş; 12:57:14 ve 12:57:27 art arda çıkış; 13:24:46 son giriş; 15:00 şimdi → 06:41:04 kayıtlı + 02:02:33 tahmin = 08:43:37 canlı toplam. Tekrar uyarıları korunur.

## Bağımlılıklar

- [Takvim ve kaynak saati](calendar.md)
- [Turnikeden günlük özet ve kayıtlı süre](recorded-time.md)
- [Turnike geçişleri](passages.md)
- [Hedef ilerlemesi ve grafik ölçeği](progress.md)

## Kullanan yerler

- [report.ts](../../src/domain/report.ts)
- [pofi.js](../../src/domain/rules/pofi.js)

`report.ts` sabit rapor hazırlığını saat izdüşümünden ayırır. Saat güncellemelerinde yalnız bugünün `dailyDurationState` sonucu değerlendirilir; anlık tahmin, hedef ilerlemesi ve Pofi kendi sahiplerinden gelir. Rapor, plan, İstanbul tarihi veya tazelik değiştiğinde hazırlık yeniden kurulur. [Orkestrasyon sahibi](README.md#diğer-tek-sahipler).

## Testler

- [rules.test.ts](../../src/domain/rules/rules.test.ts)
- [report.test.ts](../../src/domain/report.test.ts)
