# Pofis

<!-- impeccable:product-schema 1 -->

## Platform

web

Pofis web ve Electron masaüstü uygulaması olarak sunulur. Platformlar, kurulum, güncelleme ve kabul durumu [masaüstü rehberindedir](docs/desktop.md).

## Stack

Next.js + React + Bun. [Oturum mimarisi](docs/architecture/multi-user-sessions.md) · [Dağıtım](docs/deployment.md).

## Users

Kendi PDKS hesabıyla günlük ve haftalık mesaisini takip eden kullanıcılar.

## Product Purpose

Kişisel mesaiyi PDKS kayıtlarından hesaplayıp anlaşılır biçimde sunmak. Sistem sayısal gerçeği söyler; Pofi ona eşlik eder.

## Operating Context

Europe/Istanbul takvimi. Güncel haftada canlı tahmin, geçmiş haftalarda kayıtlı özet. Varsayılan plan pazartesi–cuma, toplam 40 saattir; kullanıcı planını değiştirebilir.

## Capabilities and Constraints

- Kişisel turnike kayıtlarından [kayıtlı süre](docs/rules/recorded-time.md), [anlık tahmin](docs/rules/duration.md) ve [kayıt bütünlüğü](docs/rules/record-status.md) gösterilir.
- Kullanıcı [mesai planında](docs/rules/work-plan.md) varsayılan şablonu, haftalık süreleri ve izinli günleri düzenler. Plan tarayıcıda saklanır; gerçekleşen süre PDKS'den gelir.
- Her kullanıcı kendi PDKS hesabıyla giriş yapar ve yalnız kendi raporunu görür. [Oturum politikası](docs/rules/session-policy.md) ve [kaynak politikası](docs/rules/source-policy.md) kimlik, kalıcılık ve erişim sınırlarını yönetir.
- [Mesaim demosu](docs/demo.md), ortak ekran ve hesapları yakalanmış kayıtlarla giriş gerektirmeden sunar.
- Oturum açmış kullanıcı [yemek menüsünü](docs/rules/meal-menu.md) ve seçilen güne ait Pofi yorumunu görüntüler.
- Pofi [durumları](docs/rules/pofi.md), albüm, [not defteri ve günlük faaliyetleri](docs/pofi-notes.md) ve [sürprizleri](docs/rules/pofi-surprises.md) mesai ekranına eşlik eder.
- Masaüstü uygulaması pencere kapatılınca arka planda çalışır. Kullanıcının açtığı masaüstü ve kişisel Telegram kanalları [çıkış hedefini hatırlatır](docs/rules/notifications.md).
- Üretim web ve masaüstü sürümleri [GA4 kullanım ölçümünü](docs/analytics.md) kullanır. Hesap eşleştirmesi ayrı bir takma kimlikle yapılır; PDKS giriş bilgileri ve mesai kayıtları olay alanlarına eklenmez.

## Brand Commitments

Pofis / Pofi / “Mesaiye biraz Pofi”. Özgün karakter ve [ton rehberi](docs/brand/pofi-tone-guide.md) korunur. Görsel roller ve etkileşimler [DESIGN](DESIGN.md), etkin dosyalar [görsel kaynaklar](docs/brand/assets.md) sahibindedir.

## Evidence on Hand

Davranış sözleşmeleri [kural belgelerinde](docs/rules/README.md), kabul durumu ve tekrarlanabilir kontroller [doğrulama rehberinde](docs/verification.md), açık geliştirme işleri [görev listesinde](tasks/todo.md) tutulur.

## Product Principles

Veri dürüstlüğü, düşük bilişsel yük, açık modül sahipliği ve gözlenen bilgiye dayalı doğal Türkçe. Güncel davranış kural belgeleriyle, arayüz DESIGN ile yönetilir. Uygulama kodu açık sınırlar, okunabilir akış ve bağımsız davranış testleriyle geliştirilir.
