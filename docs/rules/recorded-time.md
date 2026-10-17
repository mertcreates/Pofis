# Turnikeden günlük özet ve kayıtlı süre

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/recorded-time.js](../../src/domain/rules/recorded-time.js)

Arayüz: `recordedRowsFromPassages`, `summaryRecord`, `summarize`.

## Sözleşme

Raporun zorunlu `passages` listesi günlere ayrılır. Her günün en erken giriş ve en geç çıkış saati bu sahibinde türetilir; kaynak liste değiştirilmez. Kayıtlı süre bu iki saatin farkıdır. Günlük özet, haftalık plan ve görünümler aynı sonucu kullanır.

08:00 giriş / 12:00 çıkış / 13:00 giriş / 16:00 çıkış → 8 saat kayıtlı süre. Ara çıkışlar düşülmez. Yalnız giriş varsa gün açıktır; yalnız çıkış veya ilk girişten önce kalan son çıkış belirsizdir. Hareket olmayan günün süresi bilinmez. Gelecek günler toplama katılmaz.

[Rapor sahibi](../../src/domain/report.ts), günlük kayıtlı süreleri ve [kayıt durumlarını](record-status.md) plan sahibine birlikte aktarır. [Plan sözleşmesi](work-plan.md#süreler-ve-tamamlanan-günler), geçmişte tamamlanmış günleri devir hesabına alır. Bugünün kayıtlı süresi ve canlı ek tahmini mesai gösterimine katılır. Gün geçmiş tarihe geçtiğinde tutarlı kayıtlı süresi devir girdisi olur.

Hareket sırası ve eşleşme güvenilirliği [geçiş sahibinde](passages.md), açık girişten doğan ek tahmin [süre sahibinde](duration.md) değerlendirilir. API yalnız ham hareketleri taşır; günlük özet istemcide bu kuralla üretilir.

## Bağımlılıklar

- [Takvim ve kaynak saati](calendar.md)

## Kullanan yerler

- [report.ts](../../src/domain/report.ts)

## Testler

- [recorded-time.test.ts](../../src/domain/rules/recorded-time.test.ts)
- [rules.test.ts](../../src/domain/rules/rules.test.ts)
- [report.test.ts](../../src/domain/report.test.ts)
- [Tarayıcı kabulü](../../scripts/acceptance/archive-behavior.js)
