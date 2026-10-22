# Belge haritası

Her konu aşağıdaki sahibinde güncellenir; diğer belgeler ayrıntıyı bağlantıyla kullanır.

| Konu | Belge |
| --- | --- |
| Kurulum ve komutlar | [README](../README.md) |
| Ürün kapsamı ve ilkeleri | [PRODUCT](../PRODUCT.md) |
| Görsel kararlar ve etkileşimler | [DESIGN](../DESIGN.md) |
| Ortak kavramlar | [GLOSSARY](../GLOSSARY.md) |
| Hesaplar, politikalar ve kod sahipleri | [Kural haritası](rules/README.md) |
| Oturum yaşam döngüsü ve tek süreç sınırları | [Çok kullanıcılı yapı](architecture/multi-user-sessions.md) |
| Çalışma ortamı, proxy ve Docker | [Dağıtım](deployment.md) |
| Ortak Windows/macOS/Linux Electron altyapısı, paketleme, kurulum ve kabul durumu | [Masaüstü](desktop.md) |
| Dört hedefli GitHub Actions release, Cloudflare Workers ayarları ve HTTPS kabulü | [Sürüm yayını](release.md) |
| Demo verisi, saat ve gezinme | [Mesaim demosu](demo.md) |
| Masaüstü/Telegram tercihleri, zamanlama ve gönderim kaydı | [Mesai bildirimleri](rules/notifications.md) |
| GA4 akışı ve kullanım ölçümünün veri sınırları | [Kullanım ölçümü](analytics.md) |
| Pofi içeriği ve tek havuz seçimi | [Pofi notları](pofi-notes.md) |
| Yemek kaynağı, menü ayrıştırma ve Pofi yemek yorumları | [Yemek menüsü](rules/meal-menu.md) |
| Pofi dili ve görselleri | [Ton rehberi](brand/pofi-tone-guide.md), [görsel kaynaklar](brand/assets.md) |
| Arayüz bileşenleri ve sorumlulukları | [Arayüz sahipleri](architecture/ui-components.md) |
| Bekleyen geliştirme ve kabul işleri | [Görev listesi](../tasks/todo.md) |
| Doğrulama komutları ve kabul yöntemi | [Doğrulama rehberi](verification.md) |
| PDKS istekleri, hata sınıfları ve toparlanma | [PDKS hata sözleşmesi](pdks-errors.md) |

## Belge bakımı

Yeni kararı tablodaki konu sahibinde güncelleyin; diğer belgelerden bağlantı verin. Açık işler görev listesinde tutulur. Tamamlanan planların geçerli kararlarını sahibine taşıyıp planı kaldırın. Doğrulama ve geçici çıktıların yönetimi [doğrulama rehberindedir](verification.md#sonuçların-yönetimi).

Public `pofis-landing` README'si ürün tanıtımı ve site bağlantısı içerir; teknik işletim bilgileri bu depodaki rehberlerde tutulur.

## Karakter kaynakları

- [Marka kiti](../extras/pofis-brand-kit/README.md): özgün karakter dosyaları ve bağımsız prototipin kullanımı.
- [Karakter kuralları](../extras/pofis-brand-kit/docs/CHARACTER_BIBLE.md) ve [üretim promptu](../extras/pofis-brand-kit/docs/MASTER_PROMPT.md): yeni görsellerin kimlik ve inceleme ölçütleri.
- [Pofi görsel setleri](brand/pofi-review-2026-10-15/README.md): mevcut aday dosyaları ve uygulamaya alma sınırı.
