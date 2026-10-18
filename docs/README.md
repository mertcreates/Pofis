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
| Ortak Windows/macOS Electron altyapısı, paketleme ve Windows kurulumu | [Masaüstü](desktop.md) |
| Demo verisi, saat ve gezinme | [Mesaim demosu](demo.md) |
| Pofi içeriği ve tek havuz seçimi | [Pofi notları](pofi-notes.md) |
| Pofi dili ve görselleri | [Ton rehberi](brand/pofi-tone-guide.md), [görsel kaynaklar](brand/assets.md) |
| Arşiv kaynağı ve bileşen eşlemesi | [Kaynak arayüz aktarımı](ui-source-migration.md) |
| Uygulama durumu ve sonraki aşama | [Uygulama planı](implementation-plan.md) |
| Bekleyen geliştirme ve kabul işleri | [Görev listesi](../tasks/todo.md) |
| Doğrulama komutları ve kabul yöntemi | [Doğrulama rehberi](verification.md) |
| PDKS istekleri, hata sınıfları ve toparlanma | [PDKS hata sözleşmesi](pdks-errors.md) |

## Belge bakımı

Davranış değiştiğinde ilgili sözleşmeyi ve bağımlı testleri birlikte güncelleyin. Tamamlanan doğrulamanın sonucunu kullanıcıya bildirin; tamamlanmış audit raporlarını, ekran görüntülerini ve ölçüm çıktılarını temizleyin. Geçerli kararlar konu sahibinde, çözülmemiş bulgular görev listesinde tutulur. Davranış testleri korunur; arayüz kabulü doğrulama rehberine göre demoda yapılır.

[Özgün master spec](spec/master-spec-v2.md), kullanıcıdan gelen başlangıç belgesidir; güncel kapsam için PRODUCT ve kural belgeleri kullanılır. Marka kiti, ton rehberi ve kullanıcı tasarım referansları kaynak içeriktir.
