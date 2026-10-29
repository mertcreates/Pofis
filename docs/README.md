# Belge haritası

Her konu aşağıdaki sahibinde güncellenir; diğer belgeler ayrıntıyı bağlantıyla kullanır.

| Konu | Belge |
| --- | --- |
| Kurulum ve komutlar | [README](../README.md) |
| Kod lisansı ve görsel istisnaları | [MIT](../LICENSE), [görsel lisans bildirimi](../ASSET-LICENSE.md) |
| Ürün kapsamı ve ilkeleri | [PRODUCT](../PRODUCT.md) |
| Görsel kararlar ve etkileşimler | [DESIGN](../DESIGN.md) |
| Ortak kavramlar | [GLOSSARY](../GLOSSARY.md) |
| Hesaplar, politikalar ve kod sahipleri | [Kural haritası](rules/README.md) |
| Oturum yaşam döngüsü ve tek süreç sınırları | [Çok kullanıcılı yapı](architecture/multi-user-sessions.md) |
| Çalışma ortamı, proxy ve Docker | [Dağıtım](deployment.md) |
| Ortak Windows/macOS/Linux Electron altyapısı, paketleme, kurulum ve kabul durumu | [Masaüstü](desktop.md) |
| Pofi Mini, macOS menü çubuğu ve gerçek cihaz kabulü | [Masaüstü entegrasyonu](desktop.md#pofi-mini-ve-macos-menü-çubuğu), [Pofi Mini kabulü](verification.md#pofi-mini-kabulü) |
| Dört hedefli GitHub Actions release, Cloudflare Workers ayarları ve HTTPS kabulü | [Sürüm yayını](release.md) |
| Manuel sürüm geçmişi, katalog bakımı ve public aktarımı | [Uygulama içi sürüm geçmişi](release.md#uygulama-içi-sürüm-geçmişi) |
| Demo verisi, saat ve gezinme | [Mesaim demosu](demo.md) |
| Masaüstü/Telegram tercihleri, zamanlama ve gönderim kaydı | [Mesai bildirimleri](rules/notifications.md) |
| GA4 akışı ve kullanım ölçümünün veri sınırları | [Kullanım ölçümü](analytics.md) |
| Pofi not defteri ve odadaki günlük faaliyetler | [Pofi içeriği](pofi-notes.md) |
| Yemek kaynağı, menü ayrıştırma ve Pofi yemek yorumları | [Yemek menüsü](rules/meal-menu.md) |
| Pofi dili ve görselleri | [Ton rehberi](brand/pofi-tone-guide.md), [görsel kaynaklar](brand/assets.md) |
| Arayüz bileşenleri ve sorumlulukları | [Arayüz sahipleri](architecture/ui-components.md) |
| Açık geliştirme işleri | [Görev listesi](../tasks/todo.md) |
| Doğrulama komutları ve kabul yöntemi | [Doğrulama rehberi](verification.md) |
| Testlerin koruduğu riskler ve sadeleştirme ölçütleri | [Test bakımı](test-value.md) |
| PDKS istekleri, hata sınıfları ve toparlanma | [PDKS hata sözleşmesi](pdks-errors.md) |

## Belge bakımı

Belge değişikliğinde şu sırayı izleyin:

1. Kararı tablodaki konu sahibinde güncelleyin; diğer belgelerde kısa bağlam ve bağlantı tutun.
2. Dosya yollarını, komutları, politika değerlerini ve örnek sonuçları ilgili kodla karşılaştırın.
3. Talimatı yapılacak iş ve beklenen sonuçla yazın; teknik sınırları geçerli oldukları koşulla açıklayın. Örnekleri ve açıklamaları ihtiyaca göre tutun.
4. Yerel bağlantıları ve [kural mimarisi testini](../src/domain/rules/rules.test.ts) kontrol edin. Açık işleri [görev listesine](../tasks/todo.md), tamamlanan planların kararlarını sahibi belgeye taşıyın.

Doğrulama ve geçici çıktıların yönetimi [doğrulama rehberindedir](verification.md#sonuçların-yönetimi).

## Karakter kaynakları

- [Marka kiti](../extras/pofis-brand-kit/README.md): özgün karakter dosyaları, referanslar ve karakter kontrol sayfası.
- [Karakter kuralları](../extras/pofis-brand-kit/docs/CHARACTER_BIBLE.md) ve [üretim promptu](../extras/pofis-brand-kit/docs/MASTER_PROMPT.md): yeni görsellerin kimlik ve inceleme ölçütleri.
- [Pofi görsel setleri](brand/pofi-review-2026-10-15/README.md): mevcut aday dosyaları ve uygulamaya alma sınırı.
