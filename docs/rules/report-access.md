# Kendi raporu ve tarih aralığı

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/report-access.ts](../../src/domain/rules/report-access.ts)

Arayüz: `REPORT_ACCESS`, `isOwnReport`, `reportRangeIssue`.

## Sözleşme

Yalnız `person: "self"` raporu kabul edilir. Tarih aralığı gerçek günlerden oluşur; başlangıç bitişle aynı gün veya daha önce olmalıdır. Başlangıç ve bitiş dahil en fazla 93 gün sorgulanabilir. Route, kaynak adaptörü ve istemci yanıtı aynı kişi kuralını kullanır. HTTP hata metni/durumu sunucu adaptöründe kalır.

Kişi ve gün sınırı `REPORT_ACCESS` içinde yönetilir. Aralık doğrulaması ve sunucunun hata mesajındaki gün sayısı aynı `maxDays` değerini kullanır.

Web ve masaüstü rapor istekleri, kaynak profilinin kimliği ve demo raporları kişi değerini `REPORT_ACCESS.person` sahibinden alır.

## Bağımlılıklar

- [Takvim ve kaynak saati](calendar.md)

## Kullanan yerler

- [route.js](../../src/app/api/report/route.js)
- [session.js](../../src/server/session.js)
- [pdks.js](../../src/server/pdks.js)
- [report-response.ts](../../src/data/report-response.ts)
- [pdks-lifecycle.ts](../../src/data/pdks-lifecycle.ts), [install-notifications.ts](../../src/desktop/install-notifications.ts), [demo raporu](../../src/demo/report.ts)

## Testler

- [http.test.js](../../src/server/http.test.js)
- [routes.test.js](../../src/server/routes.test.js)
- [pdks.test.js](../../src/server/pdks.test.js)
- [report-response.test.ts](../../src/data/report-response.test.ts)
- [policy-adapters.test.ts](../../src/domain/rules/policy-adapters.test.ts): yalnız kişi sahibi değiştiğinde gerçek istekler ve demo/profil kimlikleri birlikte güncellenir.
