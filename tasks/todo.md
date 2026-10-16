# Açık işler

Tamamlanan işleri listeden çıkarın. Davranış sözleşmeleri [kural haritasında](../docs/rules/README.md), kabul yöntemi [doğrulama rehberindedir](../docs/verification.md).

## Gerçek PDKS kabulü

- [ ] Son hareketi giriş olan gerçek günde kayıtlı süre, canlı tahmin ve hedefi birlikte kontrol et.
- [ ] Gerçek hesapta eski rapor, kısa önbellek, kurtarma bekleme süresi, yeniden bağlantı ve 8 saatlik oturum bitişini doğrula.
- [ ] İki gerçek hesap/tarayıcıyla kimlik, kaynak çerezi ve rapor ayrımını doğrula.
- [ ] İstanbul gece yarısı, gün/hafta geçişi ve yeni kaynak hareketlerinin ekrana yansımasını kontrol et.

## Kurum dağıtımı

- [ ] Docker imajını hedef ortamda derle ve çalıştır; TZ, dinleme adresi ve volume izinlerini kontrol et.
- [ ] Dış HTTPS/ingress üzerinden giriş → rapor → yenileme → çıkış zincirini ve çerez niteliklerini doğrula.
- [ ] Süreç/pod yeniden başlatmasında kalıcı oturumla devamı; disk hatalarının ve izinlerin işletim davranışını doğrula.
- [ ] Kurumla belirlenen gerçek PDKS iş yükünü ölç; desteklenen kapasiteyi bu sonuçlara göre belirle.

[Dağıtım rehberi](../docs/deployment.md) · [Tek süreç sınırları](../docs/architecture/multi-user-sessions.md). Yerel sentetik yük testleri gerçek PDKS kapasitesini belirlemez. Ortak depo/çoklu replica kararı, ölçüm veya yüksek erişilebilirlik gereksinimi oluştuğunda ele alınır.

## Arayüz kabulü

- [ ] Pofi'nin canlı/kayıtlı `%114 → %115` geçişinde `overworked` görselini ve “Hedefin üzerindesin.” metnini tarayıcıda doğrula. Kural testleri geçti; yerel Playwright kabulünde Chrome bulunamadı ve Edge başlatılamadı.
- [ ] Fiziksel mobil cihazda dokunmatik grafik ve modal tutamağından sürükleme davranışını kontrol et.
- [ ] Safari, forced-colors ve ekran okuyucuyla temel gezinme, durum etiketleri ve dialog odağını kontrol et.
- [ ] Tarayıcı depolaması yazmayı reddettiğinde plan kayıt hatasını ve son kayıtlı planın korunmasını tarayıcıda doğrula.
- [ ] Çalışma zamanı hata sınırının yeniden deneme akışını kontrollü tarayıcı senaryosuyla doğrula.

## Sonraki ürün işleri

- [ ] Kullanıcı onayı için en az 10 Pofi görsel adayı üret. [Hazır promptlar ve mevcut engel](../docs/brand/pofi-review-2026-10-15/README.md).
- [ ] macOS iki mimari paket hedefini ve tek Bun executable dağıtımını ayrıca tasarla ve doğrula. Mevcut standalone çıktı bu paketlerin yerine geçmez.
