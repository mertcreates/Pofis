# Pofi sürprizleri

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/pofi-surprises.ts](../../src/domain/rules/pofi-surprises.ts)

Arayüz: `POFI_SURPRISES`, `specialMinuteRemaining`, `nextSurpriseTap`.

## Sözleşme

Oda bekleme süresi, tekrar dokunma eşiği, çağırma sözcüğü ve görünme süresi tek politikadadır. Özel dakika yalnız panel o dakikada açıldıysa görünür ve dakika sonunda biter. Bileşenler DOM olaylarını/odakları yönetir; süre ve eşik uydurmaz.

Kaynak footer'daki sürüm notu `versionRevealTaps: 5` dokunuşla `versionWindowMs: 5000` içinde açılır. Süre dolunca yeni dizi başlar; odak ayrılınca dizi temizlenir. Oda içindeki üç dokunuş eşiği ayrı davranıştır.

## Bağımlılıklar

- [Takvim ve kaynak saati](calendar.md)

## Kullanan yerler

- [room.js](../../src/components/pofi/room.js)
- [pofi-call.js](../../src/components/pofi-call.js)
- [pofi-panel.tsx](../../src/components/dashboard/pofi-panel.tsx)
- [app-footer.js](../../src/components/shell/app-footer.js)

## Testler

- [rules.test.ts](../../src/domain/rules/rules.test.ts)
- [Tarayıcı kabulü](../../scripts/acceptance/archive-behavior.js)
