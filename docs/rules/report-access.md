# Kendi raporu ve tarih aralığı

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/report-access.ts](../../src/domain/rules/report-access.ts)

Arayüz: `isOwnReport`, `reportRangeIssue`.

## Sözleşme

Tek uygulamada yalnız self raporu kabul edilir. Tarih aralığı gerçek günlerden oluşur, başlangıç bitişten sonra olamaz; üst sınır dahil gün sayısıyla hesaplanır. Route, kaynak adaptörü ve istemci yanıtı aynı kişi kuralını kullanır. HTTP hata metni/durumu sunucu adaptöründe kalır.

## Bağımlılıklar

- [Takvim ve kaynak saati](calendar.md)

## Kullanan yerler

- [route.js](../../src/app/api/report/route.js)
- [session.js](../../src/server/session.js)
- [pdks.js](../../src/server/pdks.js)
- [report-response.ts](../../src/data/report-response.ts)

## Testler

- [http.test.js](../../src/server/http.test.js)
- [routes.test.js](../../src/server/routes.test.js)
- [pdks.test.js](../../src/server/pdks.test.js)
- [work-plans.test.ts](../../src/data/work-plans.test.ts)
- [Tarayıcı kabulü](../../scripts/acceptance/archive-behavior.js)
