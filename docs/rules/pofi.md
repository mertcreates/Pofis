# Pofi durum seçimi

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/pofi.js](../../src/domain/rules/pofi.js)

Arayüz: `POFI_ASSETS`, `pofiNote`.

## Sözleşme

İlerleme duration sahibinden alınır. Yedi durumun görselleri 1.0.0 Docker kaynak arşivinden gelir. Başlıklar ve mesajlar [ui-text.js](../../src/lib/ui-text.js) sahibinde [ton rehberine](../brand/pofi-tone-guide.md) göre yönetilir: başlık kayıt/hedef durumunu belirtir; Pofi'nin kısa mesajı hesabı tekrarlamak yerine kendi küçük gözlemini veya davranışını anlatır. Belirsizlikte açık kontrol yönlendirmesi kullanılır. Kullanıcının yorgunluğu veya üretkenliği hakkında yargı verilmez.

Günlük hedef [plan sahibinin](work-plan.md) etkin hedefidir; son açık gündeki devir Pofi'ye de yansır. Devirle hedef sıfırsa geçerli süre %100 kabul edilir: açık girişte `working`, tamamlanmış kayıtta `completed`. Belirsizlik yoksa plan dışı gün `idle` kalır.

| Koşul | Durum |
| --- | --- |
| Belirsiz özet/geçiş veya geçmiş günde açık giriş | `error` |
| Seçili olmayan çalışma günü veya giriş kaydı yok | `idle` |
| Bugün son hareket çıkış, kayıtlı hedef henüz tamamlanmamış | `break` |
| Hedef öncesinde ilerleme `%80` altında | `working` |
| Hedef öncesinde ilerleme `%80` ve üzerinde | `tired` |
| Canlı tahmin hedefe ulaşmış, gösterilen ilerleme `%115` altında | `working` |
| Kayıtlı hedef tamamlanmış, gösterilen ilerleme `%115` altında | `completed` |
| Canlı veya kayıtlı hedef tamamlanmış, gösterilen ilerleme `%115` ve üzerinde | `overworked` |

Belirsizlik ve seçili gün kontrolleri ilerleme durumlarından önce gelir. Tahmini hedefe ulaşma çalışmayı tamamlamaz. `overworked`, kaynak görseliyle birlikte kendi başlık ve mesajını gösterir; canlı hedefteki bekleme mesajıyla örtülmez. Yüzde yuvarlaması [ilerleme sahibinden](progress.md) gelir. Dışarıda kalınan süre hesaplanıp düşülmez.

8 saat hedef, 08:00 ilk giriş: 14:24 canlı tahmin → `tired`; 16:00 → `working`; 17:07:12 (`%114`) → `working`; 17:12 (`%115`) → `overworked`. Son hareket 16:00 çıkışsa `completed`, 17:12 çıkışsa `overworked` gösterilir. Eski rapor canlı fazla mesai tahmini üretmez; durum kayıtlı süreye göre seçilir.

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
