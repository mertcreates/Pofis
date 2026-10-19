# Pofis

<!-- impeccable:product-schema 1 -->

## Platform

web

Web uygulaması, Windows x64 ve macOS Apple Silicon/Intel için ortak Electron kabuğuyla da çalışır. Paketleme kapsamı [masaüstü rehberinde](docs/desktop.md), üç hedefin yayın otomasyonu [sürüm yayınında](docs/release.md), bekleyen cihaz ve yayın kabulü [görev listesinde](tasks/todo.md) tutulur.

Paketli masaüstü uygulaması açılışta yeni sürümü denetler; güncelleme varsa kurulum komutunu kopyalama seçeneği sunar. Davranışın sahibi [masaüstü sözleşmesidir](docs/desktop.md#açılışta-sürüm-denetimi).

## Stack

Next.js + React + Bun. Yerel üretim önizlemesi standart Next komutlarını, Docker dağıtımı standalone çıktıyı kullanır. Mevcut dağıtım tek Bun süreci ve kalıcı oturum dizini kullanır. [Mimari](docs/architecture/multi-user-sessions.md) · [Dağıtım](docs/deployment.md).

## Users

Kendi PDKS hesabıyla günlük ve haftalık mesaisini takip eden kullanıcılar. Tek uygulama vardır; her kişi yalnız kendi raporunu görür.

## Product Purpose

PDKS kayıtlarını değiştirmeden kişisel mesaiyi anlaşılır biçimde sunmak. Sistem sayısal gerçeği söyler; Pofi ona eşlik eder.

## Operating Context

Europe/Istanbul takvimi. Güncel haftada canlı tahmin, geçmiş haftalarda kayıtlı özet. Varsayılan plan pazartesi–cuma, toplam 40 saattir; kullanıcı planını değiştirebilir.

## Capabilities and Constraints

- Gerçekleşen mesainin kaynağı kişisel turnike hareketleridir. Seçilen haftanın bütün sayfaları alınır. Kullanıcı kişisel haftalık planında günleri izinli işaretleyebilir; izinler plan hedefini günceller. Resmî izin bilgisi PDKS kaynağından alınmaz.
- [Kayıtlı süre](docs/rules/recorded-time.md) ilk giriş–son çıkıştır; ara molalar düşülmez. Güvenilir açık girişte [anlık tahmin](docs/rules/duration.md) üretilir. Eski raporda tahmin durur.
- [Günlük kayıt durumu](docs/rules/record-status.md) kayıt bütünlüğünü hedef farkından ayrı değerlendirir. Eksik kayıt sıfır çalışma veya devamsızlık sayılmaz; belirsizlik çıkış hedefini engelleyebilir.
- [Mesai planı](docs/rules/work-plan.md), kullanıcıya varsayılan şablonu ve mevcut haftanın gereken çalışma sürelerini düzenleme olanağı verir. PDKS kayıtları gerçekleşen süreyi sağlar; planlar tarayıcıda saklanır. Günlük sınırlar, devir, tamamlama ve haftalık hedef sözleşmesi kural belgesindedir.
- PDKS girişi sunucuda işlenir. Parola yalnız girişte kullanılır; kaynak çerezleri her oturuma özel tutulur. Oturum politikası ve kaynak önbelleği [kural haritasından](docs/rules/README.md) yönetilir.
- [Mesaim demosu](docs/demo.md) aynı görünüm ve hesap sahiplerini kullanır; yakalanmış veriyi gün/hafta seçimi ve sanal ek süreyle sunar.
- Pofi durumları, albüm, notlar ve sürprizler ortak ekranlarda sunulur. [Durum seçimi](docs/rules/pofi.md), [sürprizler](docs/rules/pofi-surprises.md) ve [not içeriği](docs/pofi-notes.md) kendi sahiplerinde yönetilir.

## Brand Commitments

Pofis / Pofi / “Mesaiye biraz Pofi.” Marka moru `#8b7bff`, özgün karakter ve [ton rehberi](docs/brand/pofi-tone-guide.md) korunur. Ekran yerleşimi ve bileşen görünümleri [DESIGN.md](DESIGN.md) belgesini izler; [arayüz sahipleri](docs/architecture/ui-components.md) bileşenlerin sorumluluklarını gösterir.

## Evidence on Hand

Güncel davranış sözleşmeleri [kural belgelerinde](docs/rules/README.md), tekrarlanabilir kontroller [doğrulama rehberinde](docs/verification.md), bekleyen kabul işleri [görev listesinde](tasks/todo.md) tutulur.

## Product Principles

Veri dürüstlüğü, düşük bilişsel yük, açık modül sahipliği ve kullanıcıyı yargılamayan doğal Türkçe. Güncel davranış kural belgeleriyle, arayüz DESIGN ile yönetilir. Uygulama kodu açık sınırlar, okunabilir akış ve bağımsız davranış testleriyle geliştirilir.
