# Pofi durum seçimi

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/pofi.js](../../src/domain/rules/pofi.js)

Arayüz: `POFI_THRESHOLDS`, `POFI_ASSETS`, `stateForProgress`, `pofiNote`.

## Sözleşme

Belirsiz özet/geçiş hata durumunu verir. Seçili olmayan günde Pofi bekler. İlerleme duration sahibinden alınır. Eşik öncesi çalışır, yorgunluk eşiğinde yorulur. Tahmini hedefe ulaşma çalışmayı tamamlamaz; kayıtlı hedefe ulaşma tamamlar. Bugün son hareket çıkışsa hedef öncesinde arşivin break durumu kullanılır; dışarıda kalınan süre hesaplanıp düşülmez. overworked görseli albümde vardır, otomatik seçilmez.

## Bağımlılıklar

- [Anlık tahmin ve süre bölümleri](duration.md)
- [Turnike geçişleri](passages.md)
- [Hedef ilerlemesi ve grafik ölçeği](progress.md)

## Kullanan yerler

- [report.ts](../../src/domain/report.ts)
- [room.js](../../src/components/pofi/room.js)

## Testler

- [rules.test.ts](../../src/domain/rules/rules.test.ts)
- [report.test.ts](../../src/domain/report.test.ts)
- [Tarayıcı kabulü](../../scripts/acceptance/archive-behavior.js)
