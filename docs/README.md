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
| Ortak Windows/macOS Electron altyapısı, paketleme, kurulum ve kabul durumu | [Masaüstü](desktop.md) |
| Üç platformlu GitHub Actions release, Cloudflare Workers ayarları ve HTTPS kabulü | [Sürüm yayını](release.md) |
| Demo verisi, saat ve gezinme | [Mesaim demosu](demo.md) |
| Pofi içeriği ve tek havuz seçimi | [Pofi notları](pofi-notes.md) |
| Pofi dili ve görselleri | [Ton rehberi](brand/pofi-tone-guide.md), [görsel kaynaklar](brand/assets.md) |
| Arayüz bileşenleri ve sorumlulukları | [Arayüz sahipleri](architecture/ui-components.md) |
| Bekleyen geliştirme ve kabul işleri | [Görev listesi](../tasks/todo.md) |
| Doğrulama komutları ve kabul yöntemi | [Doğrulama rehberi](verification.md) |
| PDKS istekleri, hata sınıfları ve toparlanma | [PDKS hata sözleşmesi](pdks-errors.md) |

## Belge bakımı

Güncel ürün kapsamı PRODUCT'ta, davranışlar kural belgelerinde, görsel kararlar DESIGN'da ve açık işler görev listesinde tutulur. Yeni kararları ilgili sahibinde güncelleyin; tamamlanmış aktarım planlarını, eski spec'leri ve doğrulama raporlarını kaldırın.

Public `pofis-landing` README'si kısa ürün tanıtımı, slogan ve site bağlantısı içerir. Geliştirme, build ve dağıtım ayrıntılarının sahibi bu depodaki teknik rehberlerdir.

Davranış değiştiğinde ilgili sözleşmeyi ve bağımlı testleri birlikte güncelleyin. Tamamlanan doğrulamanın sonucunu kullanıcıya bildirin; tamamlanmış audit raporlarını, ekran görüntülerini ve ölçüm çıktılarını temizleyin. Geçerli kararlar konu sahibinde, çözülmemiş bulgular görev listesinde tutulur. Davranış testleri korunur; arayüz kabulü doğrulama rehberine göre demoda yapılır.

## Karakter kaynakları

- [Marka kiti](../extras/pofis-brand-kit/README.md): özgün karakter dosyaları ve bağımsız prototipin kullanımı.
- [Karakter kuralları](../extras/pofis-brand-kit/docs/CHARACTER_BIBLE.md) ve [üretim promptu](../extras/pofis-brand-kit/docs/MASTER_PROMPT.md): yeni görsellerin kimlik ve inceleme ölçütleri.
- [Pofi görsel setleri](brand/pofi-review-2026-10-15/README.md): mevcut aday dosyaları ve uygulamaya alma sınırı.

Ton rehberi güncel Pofi dilinin, DESIGN arayüzün ve kural belgeleri hesapların sahibidir.
