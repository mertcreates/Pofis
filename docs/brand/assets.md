# Pofi görsel kaynakları

Kullanıcının paylaştığı [marka kiti](../../extras/pofis-brand-kit/README.md) özgün karakter kaynağıdır. Aşağıdaki tablo etkin uygulama dosyalarını ve korunmuş referansları ayırır.

| Uygulama dosyası | Kaynak ve kullanım |
| --- | --- |
| `public/pofi/pofi-mark-256.png` | Üst marka, favicon, Apple simgesi ve Electron pencere/uygulama simgesinin kaynağı |
| `public/pofi/pofi-full.webp` | Yükleme ekranı ve Pofi odası |
| `public/brand/pofi-full-512.webp` | Marka kitinden korunmuş referans; mevcut bileşenler bu yolu kullanmaz |
| `public/pofi/states/*.webp` | Kullanıcının 1.0.0 Docker arşivindeki break, completed, error, idle, overworked, tired, working; durum paneli ve albüm |
| `public/pofi/` | Arşivin kanonik Pofi varlıkları |
| `public/icons/` | Arşiv ikonları; lisans aynı klasörde |

Yedi durum görseli ve albüm uygulamadadır. `overworked`, albümde ve `%115` ilerlemeden itibaren otomatik akışta kullanılır; koşullar [durum seçicide](../rules/pofi.md) yönetilir. Slogan **Mesaiye biraz Pofi.** Arşiv kimliği [kaynak eşlemesinde](../ui-source-migration.md) tutulur.

[İnceleme setleri](pofi-review-2026-10-15/README.md) etkin dosyalardan ayrı tutulur. Yeni görseller uygulamaya alınmadan önce karakter kuralları ve kullanıcı seçimiyle değerlendirilir.
