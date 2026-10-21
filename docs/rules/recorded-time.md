# Turnikeden günlük özet ve kayıtlı süre

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/recorded-time.js](../../src/domain/rules/recorded-time.js)

Arayüz: `recordedRowsFromPassages`, `summaryRecord`, `summarize`.

## Sözleşme

Raporun zorunlu `passages` listesi günlere ayrılır. Her günün en erken giriş ve en geç çıkış saati kaynak liste korunarak bu sahibinde türetilir. Kayıtlı süre bu iki saatin farkıdır. Günlük özet, haftalık plan ve görünümler aynı sonucu kullanır.

`summarize`, aralıktaki günlük saatleri ve kayıtlı süreleri döndürür. `partial`, aralığın başında veya sonunda eksik takvim haftası bulunduğunu belirtir; boş aralıkta `false` olur. Plan sahibi bu bilgiyi devir ve çıkış hedefi için kullanır. Günlük kayıt durumu [kayıt durumu sahibinde](record-status.md), görünen haftalık toplam [haftalık toplam sahibinde](week.md) hesaplanır.

08:00 giriş / 12:00 çıkış / 13:00 giriş / 16:00 çıkış → 8 saat kayıtlı süre. Ara çıkış aralıkları kayıtlı süreye dahildir. Yalnız giriş varsa veya en geç çıkış ilk girişten önceyse günlük özet açıktır ve kayıtlı süre bilinmez. Yalnız çıkış belirsizdir. Hareket olmayan günün süresi bilinmez. Toplam bugüne kadar olan günleri kapsar.

[Rapor sahibi](../../src/domain/report.ts), günlük kayıtlı süreleri ve [kayıt durumlarını](record-status.md) plan sahibine birlikte aktarır. [Plan sözleşmesi](work-plan.md#süreler-ve-tamamlanan-günler), geçmişte tamamlanmış günleri devir hesabına alır. Bugünün kayıtlı süresi ve canlı ek tahmini mesai gösterimine katılır. Gün geçmiş tarihe geçtiğinde tutarlı kayıtlı süresi devir girdisi olur.

Hareket sırası ve eşleşme güvenilirliği [geçiş sahibinde](passages.md), açık girişten doğan ek tahmin [süre sahibinde](duration.md) değerlendirilir. API yalnız ham hareketleri taşır; günlük özet istemcide bu kuralla üretilir.

## Bağımlılıklar

- [Takvim ve kaynak saati](calendar.md)

## Kullanan yerler

- [report.ts](../../src/domain/report.ts)

## Testler

- [recorded-time.test.ts](../../src/domain/rules/recorded-time.test.ts)
- [report.test.ts](../../src/domain/report.test.ts)
