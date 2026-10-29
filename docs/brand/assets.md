# Pofi görsel kaynakları

[Marka kiti](../../extras/pofis-brand-kit/README.md) özgün karakter kaynağıdır. Aşağıdaki tablo etkin uygulama dosyalarını ve korunmuş referansları ayırır.

Görsellerin lisans kapsamı ve üçüncü taraf bildirimleri [görsel lisans bildiriminde](../../ASSET-LICENSE.md) tanımlıdır.

| Uygulama dosyası | Kaynak ve kullanım |
| --- | --- |
| `public/pofi/pofi-mark-256.png` | Üst marka, favicon, Apple simgesi ve Electron pencere/uygulama simgesinin kaynağı |
| `public/pofi/pofi-full.webp` | [Pofi bekleme görselinin](../../src/components/pofi/idle.tsx) taban çizimi |
| `public/pofi/pofi-blink-patch-v1.webp` | Göz kırpma sırasında göz alanını temizleyen 470×190, 54,6 KB kayıpsız WebP katmanı |
| `public/brand/pofi-full-512.webp` | Marka kitinden korunmuş görsel referans |
| `public/pofi/states/*.webp` | 1.0.0 Docker arşivindeki break, completed, error, idle, overworked, tired, working; durum paneli ve albüm |
| `public/pofi/pofi-meal.webp` | Yemek menüsündeki Pofi notu ve fotoğraf albümündeki “Yemeği beklerken” sahnesi |
| `public/pofi/` | Arşivin kanonik Pofi varlıkları |
| `public/icons/` | Arşiv ikonları; lisans aynı klasörde |

Durum görsellerinin seçim koşulları [Pofi kuralında](../rules/pofi.md) yönetilir. Slogan **Mesaiye biraz Pofi**; durum görsellerinin kaynak arşivi `pofis-1.0.0-docker-source.zip`; SHA-256 değeri `555d19dfde9e26f6513cde3b9807f241dcccf51e5cf5d463b8f70a490ac907ca`.

[İnceleme setleri](pofi-review-2026-10-15/README.md) etkin dosyalardan ayrı tutulur. Yeni görseller uygulamaya alınmadan önce karakter kuralları ve kullanıcı seçimiyle değerlendirilir.
