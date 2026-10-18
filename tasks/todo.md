# Açık işler

Tamamlanan işleri listeden çıkarın. Davranış sözleşmeleri [kural haritasında](../docs/rules/README.md), kabul yöntemi [doğrulama rehberindedir](../docs/verification.md).

## Gerçek PDKS kabulü

- [ ] Son hareketi giriş olan gerçek günde kayıtlı süre, canlı tahmin ve hedefi birlikte kontrol et.
- [ ] Gerçek PDKS haftasında [plan sözleşmesini](../docs/rules/work-plan.md) doğrula: saniyeli kilitli kayıt, izin sonrası hedef, sıfır süreli açık günün yeni kayıtla borç alması, devir/kapasite bakiyesi ve günlük hedef–çıkış eşitliği. Kayıtsız/belirsiz günün planla ilişkisini de kontrol et.
- [ ] Gerçek hesapta eski rapor, kısa önbellek, kurtarma bekleme süresi, yeniden bağlantı ve 8 saatlik oturum bitişini doğrula.
- [ ] İki gerçek hesap/tarayıcıyla kimlik, kaynak çerezi ve rapor ayrımını doğrula.
- [ ] İstanbul gece yarısı, gün/hafta geçişi ve yeni kaynak hareketlerinin ekrana yansımasını kontrol et.

## Windows masaüstü kabulü

- [ ] [Masaüstü rehberindeki](../docs/desktop.md) gerçek PDKS giriş → rapor → yenileme → çıkış zincirini kurum ağı ve gerçek hesapla tamamla.
- [ ] Node/Bun kurulmamış temiz Windows x64 cihazında tek komutla kurulum, simgeden açılış, imzasız ZIP/EXE için SmartScreen uyarıları, güncelleme ve normal çıkışta süreç temizliğini doğrula. PATH kısıtlı yerel kabul temiz cihaz testinin yerine geçmez.
- [ ] Gerçek PDKS oturumunun sürüm güncellemesinde mevcut TTL içinde korunduğunu doğrula.
- [ ] Temiz Windows cihazında Yüklü uygulamalar → Pofis → Kaldır onay/iptal ekranlarını; macOS Apple Silicon/Intel cihazında gerçek `.app` paketini Finder’dan Çöp Sepeti’ne taşıma ve tekrar kurmayı doğrula. İki platformda güncelleme eski paketleri açılış öncesinde temizlemeli; kaldırma kullanıcı profilini korumalı.
- [ ] Gerçek PDKS oturumuyla 3210 başka uygulamadayken açılışı ve port değişiminden sonra oturum devamını doğrula. Yerel paket kabulü boş port, ayar kalıcılığı ve HttpOnly çerez temizleme yolunu kapsar.
- [ ] [Release akışında](../docs/release.md) üç native job ve release → anonim ZIP → Workers HTTPS kabulünü gerçek yetkili çalıştırmada doğrula; ardından canlı Windows tek komut kurulum/güncellemesini sına. Landing public deposu ve pofis.app Workers bağlantısı hazır; yerel testler uzaktan paket yayınının kanıtı değildir.
- [ ] macOS Apple Silicon ve Intel cihazlarında ortak `desktop:prepare/package/release` ile `.app`, helper adları, ad-hoc imza, izin/symlink koruması, tek örnek/Dock/Command-Q ve Node UtilityProcess temizliğini doğrula; aynı `test:desktop:smoke` betiğini çalıştır.
- [ ] Hazırlanan macOS tek komut kurulum/güncelleme akışının iki native CI job'unda gerçek ZIP kabulünü tamamla; temiz Apple Silicon/Intel cihazında Finder/Dock/Spotlight açılışını ve güncelleme sonrasında yeni sürümün açıldığını, ayrıca indirilen pakette Gatekeeper kabulünü doğrula. Yerel Bash testleri native kurulum kanıtı değildir.

## Kurum dağıtımı

- [ ] Docker imajını hedef ortamda derle ve çalıştır; TZ, dinleme adresi ve volume izinlerini kontrol et.
- [ ] Dış HTTPS/ingress üzerinden giriş → rapor → yenileme → çıkış zincirini ve çerez niteliklerini doğrula.
- [ ] Süreç/pod yeniden başlatmasında kalıcı oturumla devamı; disk hatalarının ve izinlerin işletim davranışını doğrula.
- [ ] Kurumla belirlenen gerçek PDKS iş yükünü ölç; desteklenen kapasiteyi bu sonuçlara göre belirle.

[Dağıtım rehberi](../docs/deployment.md) · [Tek süreç sınırları](../docs/architecture/multi-user-sessions.md). Yerel sentetik yük testleri gerçek PDKS kapasitesini belirlemez. Ortak depo/çoklu replica kararı, ölçüm veya yüksek erişilebilirlik gereksinimi oluştuğunda ele alınır.

## Arayüz kabulü

- [ ] Mesai planında izinli, şablondan kapalı, sıfır süreli açık ve kilitli günleri; kart/stepper süre eşitliğini ve dar ekran yerleşimini görsel olarak doğrula. Planın davranış testleri mevcut; görsel kontrol kullanıcıda.
- [ ] 404 sahnesini, tema depolama bildirimini ve eksik notta defter gezinmesini masaüstü/mobil tarayıcıda doğrula. Normal tema havuzu boşken nötr mesajı, önceki/sonraki gün gezinmesini ve özel gün notunu da kontrol et; yerel tarayıcı bağlantısı zaman aşımına uğradığı için bu kabul bekliyor.

- [ ] Pofi'nin canlı/kayıtlı `%114 → %115` geçişinde `overworked` görselini ve “Hedefin üzerinde.” başlığını tarayıcıda doğrula.
- [ ] Fiziksel mobil cihazda dokunmatik grafik ve modal tutamağından sürükleme davranışını kontrol et.
- [ ] Safari, forced-colors ve ekran okuyucuyla temel gezinme, durum etiketleri ve dialog odağını kontrol et.
- [ ] Rapor hazırlığı veya saat izdüşümü istisnasının ortak hata sınırına geçişini ve yeniden denemeyi kontrollü tarayıcı senaryosuyla doğrula.

## Sonraki ürün işleri

- [ ] [Mevcut Pofi görsel setlerinin](../docs/brand/pofi-review-2026-10-15/README.md) uygulamaya alınacak dosyalarını kullanıcıyla belirle; yeni üretim ihtiyacını bu seçime göre netleştir.
