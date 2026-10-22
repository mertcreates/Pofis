# Pofis

<!-- impeccable:product-schema 1 -->

## Platform

web

Pofis, web üzerinde ve ortak Electron kabuğuyla Windows x64 ile macOS Apple Silicon/Intel için sunulur. Windows ve macOS sürümleri aktif kullanımdadır. Ubuntu 24.04 LTS x64 desteği aynı özellik kapsamıyla hazırlanır; gerçek cihaz kabulü görev listesinde izlenir. Paketleme ve masaüstü kabul durumu [masaüstü rehberinde](docs/desktop.md), dört hedefin yayın otomasyonu [sürüm yayınında](docs/release.md) açıklanır.

Paketli masaüstü uygulaması açılışta yeni sürümü denetler. Güncelleme varsa giriş ekranında ve uygulama menüsünde **Yeni sürüm var** düğmesi görünür; ortak modal platforma uygun kurulum komutunu kopyalama seçeneği sunar. Davranışın sahibi [masaüstü sözleşmesidir](docs/desktop.md#açılışta-sürüm-denetimi).

## Stack

Next.js + React + Bun. Yerel üretim önizlemesi standart Next komutlarını, Docker dağıtımı standalone çıktıyı kullanır. Mevcut dağıtım tek Bun süreci ve kalıcı oturum dizini kullanır. [Mimari](docs/architecture/multi-user-sessions.md) · [Dağıtım](docs/deployment.md).

## Users

Kendi PDKS hesabıyla günlük ve haftalık mesaisini takip eden kullanıcılar. Tek uygulama vardır; her kişi yalnız kendi raporunu görür.

## Product Purpose

Kişisel mesaiyi PDKS kayıtlarından hesaplayıp anlaşılır biçimde sunmak. Sistem sayısal gerçeği söyler; Pofi ona eşlik eder.

## Operating Context

Europe/Istanbul takvimi. Güncel haftada canlı tahmin, geçmiş haftalarda kayıtlı özet. Varsayılan plan pazartesi–cuma, toplam 40 saattir; kullanıcı planını değiştirebilir.

## Capabilities and Constraints

- Üretim web ve masaüstü sürümlerinde [GA4 kullanım ölçümü](docs/analytics.md) otomatik çalışır; sabit sayfa alanları ve paket sürümü gönderilir. Doğrulanmış kendi raporundan sonra Pofi anahtarından türetilen ayrı `user_id` hesabı oturumlar ve cihazlar arasında eşleştirir. Ad-soyad, PDKS giriş bilgileri ve mesai kayıtları olay alanlarına bağlanmaz.

- Gerçekleşen mesainin kaynağı kişisel turnike hareketleridir. Seçilen haftanın bütün sayfaları alınır. Kullanıcı kişisel haftalık planında günleri izinli işaretleyebilir; izinler uygulamadaki kişisel plan hedefini günceller.
- [Kayıtlı süre](docs/rules/recorded-time.md) ara molalar dahil ilk giriş–son çıkış aralığıdır. Güvenilir açık girişte [anlık tahmin](docs/rules/duration.md) üretilir. Eski raporda tahmin durur.
- [Günlük kayıt durumu](docs/rules/record-status.md) kayıt bütünlüğünü hedef farkından ayrı değerlendirir. Eksik kayıt kendi kayıt durumu etiketiyle gösterilir; belirsizlik çıkış hedefini engelleyebilir.
- [Mesai planı](docs/rules/work-plan.md), kullanıcıya varsayılan şablonu ve mevcut haftanın gereken çalışma sürelerini düzenleme olanağı verir. PDKS kayıtları gerçekleşen süreyi sağlar; planlar tarayıcıda saklanır. Günlük sınırlar, devir, tamamlama ve haftalık hedef sözleşmesi kural belgesindedir.
- PDKS girişi profil sayfasıyla doğrulanır; kişisel menü bağlantısı bulunmayan yönetici hesapları da kişisel turnike raporunu kullanır. Pofi notları [hesap anahtarıyla](docs/pofi-notes.md#hesap-anahtarı) seçilir.
- PDKS girişi sunucuda işlenir. Parola yalnız girişte kullanılır; kaynak çerezleri her oturuma özel tutulur. Oturum politikası ve kaynak önbelleği [kural haritasından](docs/rules/README.md) yönetilir.
- [Mesaim demosu](docs/demo.md) aynı görünüm ve hesap sahiplerini kullanır; yakalanmış veriyi gün/hafta seçimi ve sanal ek süreyle sunar.
- Oturum açmış kullanıcı [Yemek menüsü](docs/rules/meal-menu.md) üzerinden İstanbul menüsünü geçmiş bir ay ve gelecek 15 gün aralığında görüntüleyebilir. Pofi'nin kısa yemek yorumu, menüye uygun bütün metinler arasından hesap anahtarı ve seçilen gün için sunucuda seçilir.
- Pofi durumları, albüm, notlar ve sürprizler ortak ekranlarda sunulur. [Durum seçimi](docs/rules/pofi.md), [sürprizler](docs/rules/pofi-surprises.md) ve [not içeriği](docs/pofi-notes.md) kendi sahiplerinde yönetilir.

## Brand Commitments

Pofis / Pofi / “Mesaiye biraz Pofi”. Marka moru `#8b7bff`, özgün karakter ve [ton rehberi](docs/brand/pofi-tone-guide.md) korunur. Ekran yerleşimi ve bileşen görünümleri [DESIGN.md](DESIGN.md) belgesini izler; [arayüz sahipleri](docs/architecture/ui-components.md) bileşenlerin sorumluluklarını gösterir.

## Evidence on Hand

Güncel davranış sözleşmeleri [kural belgelerinde](docs/rules/README.md), tekrarlanabilir kontroller [doğrulama rehberinde](docs/verification.md), bekleyen kabul işleri [görev listesinde](tasks/todo.md) tutulur.

## Product Principles

Veri dürüstlüğü, düşük bilişsel yük, açık modül sahipliği ve gözlenen bilgiye dayalı doğal Türkçe. Güncel davranış kural belgeleriyle, arayüz DESIGN ile yönetilir. Uygulama kodu açık sınırlar, okunabilir akış ve bağımsız davranış testleriyle geliştirilir.
