# Açık işler

Bu liste yerelde çalışan kurum içi Pofis uygulamasının açık işlerini tutar. Davranış sözleşmeleri [kural haritasında](../docs/rules/README.md), kabul yöntemi [doğrulama rehberindedir](../docs/verification.md).

## Ubuntu 24.04 LTS x64 desteği

Yerel hazırlık yapıldı; gerçek Ubuntu kabulü ve yayın bekliyor. Destek kapsamı ve kurulum sözleşmesi [masaüstü rehberinde](../docs/desktop.md#ubuntu-2404-lts-x64-ve-ortak-unix-kurulumu), test komutları [doğrulama rehberindedir](../docs/verification.md#linux-ve-ortak-unix-installer-kabulü).

- [ ] Yeni macOS kaynaklı Linux paket zincirini yetkili workflow çalıştırmasında doğrula: ARM64 ortak çıktı, Linux ELF/izin/tar.gz kontrolleri ve üç hedefin recovery/aktarımı. Ayrı Linux runner kullanılmaz; [yayın sözleşmesi](../docs/release.md#cache-ve-süre-ölçümü).
- [ ] Hedef Ubuntu cihazı/izole VM üzerinde paket açılışı, ortak installer, tek örnek, açıkken onaylı güncelleme, geri alma ve profil koruyan kaldırmayı çalıştır. Bildirim kabulü hem sıfır çıkış kodunu hem tamamlanma mesajını gerektirir. Mevcut Windows ortamında Linux/WSL bulunmadığı için native kabul çalıştırılmadı.
- [ ] Gerçek Ubuntu GNOME masaüstünde AppArmor ilk kurulumu, menü kısayolu, tepsi/arka plan, yerel bildirim, anahtarlık/Telegram, uyku dönüşü ve PDKS giriş/rapor kabulünü tamamla. Xvfb bu kabulün yerine geçmez.

## Sürüm yayını kabulü

- [ ] Aynı Windows runner ve kabul kapsamıyla paket zincirinin en az %50 hızlanmasını yetkili Actions çalıştırmasında ölç: yaklaşık 107 saniyelik referansa karşı hedef en fazla 54 saniye. Native ZIP, Windows sunucu ASAR'ı, eşzamanlı Next/test hazırlığı, Next içindeki tek tür kontrolü ve kabul tekrarlarının kaldırılması yerelde doğrulandı; toplam hedef henüz sağlanmadı.
- [ ] Güncel kaynakla Windows ve ARM64 paket açılış/kurulum/güncelleme kabulünü, Intel statik paket kontrollerini tamamla. macOS'ta onaylı güncelleme sonrasında pencerenin görünür açıldığını ve installer'ın hazır sonucunu aldığını doğrula. Açılıştaki senkron Keychain durum sorgusu kaldırıldı; gerçek Keychain ve güncelleme kabulü bekliyor. Native macOS'ta başarısız/iptal edilen kabulün test ana/yardımcı süreçlerini kapattığını ve ilk hedef hatasının kardeş üretimleri durdurduğunu da doğrula. Genel kabul betikleri GA4 trafiğini engeller. Yayın workflow'u hedef sürüme yönelik kullanıcı yetkisiyle başlatılır; [yayın sözleşmesi](../docs/release.md).
- [ ] GA4 `G-MV4MG71CDB` akışında Geliştirilmiş ölçümü kapat; Raporlama kimliğini User-ID içeren Gözlemlenen veya Harmanlanmış olarak ayarla ve `app_release` olay boyutunu tanımla. Yayın sonrasında Anlık rapor/Kullanıcı keşfinde web/masaüstü kimliklerini doğrula; [ölçüm sözleşmesi](../docs/analytics.md).

## Gerçek cihaz ve PDKS kabulü

- [ ] Yeni paketle Windows/macOS üzerinde **Yeni sürüm var → Komutu kopyala → terminalde çalıştır → onaylı kapanış → yeni sürüm** zincirini doğrula. Windows paket açılışı ve gerçek IPC okuması yerelde geçti; ortak modal örnek manifest ve test pano yazıcısıyla doğrulandı. Gerçek pano kabulü izole CI/VM betiğindedir; macOS cihaz ve canlı güncelleme kabulü bekler. [Güncelleme sözleşmesi](../docs/desktop.md#açılışta-sürüm-denetimi).

- [ ] macOS 12 ARM64 ilk kurulum ve 43 → 43 güncellemesini; macOS 13+ ARM64 gerçek 44 → 43 profil/installer geçişini, imza, Gatekeeper ve uyku/uyanmayı doğrula. Intel gerçek cihaz kabulünü ayrı izle; Intel yayını statik kontrollerle ilerler. Windows gerçek motor geçişi tamamlandı; [motor geçişi kabulü](../docs/desktop.md#motor-geçişi-kabulü).
- [ ] Geçerli gerçek PDKS oturumuyla güncelleme sonrası devamı ve mevcut TTL'yi kontrol et. Hedef pakette hata ekranı → teknik ayrıntıları kopyala → yapıştır zincirini doğrula; [masaüstü kabulü](../docs/desktop.md#tekrarlanabilir-kabul).
- [ ] Menüde kişisel bağlantısı olmayan gerçek yönetici hesabıyla giriş → kişisel turnike raporu → Pofi notları → yeniden giriş zincirini doğrula. Kullanıcı adının harf/takma ad eşdeğerliğini kaynakla ayrıca kontrol et.
- [ ] Son hareketi giriş olan gerçek günde kayıtlı süre, canlı tahmin ve hedefi birlikte kontrol et. Ara giriş/çıkış tekrarlarından sonra gelen tek güvenilir girişte canlı mesainin ilerlediğini ve önceki tekrar uyarılarının korunduğunu doğrula.
- [ ] Gerçek PDKS haftasında saniyeli kilitli kayıt, izin sonrası hedef, sıfır süreli açık günün yeni kayıtla borç alması, devir/kapasite bakiyesi ve günlük hedef–çıkış eşitliğini doğrula. Kayıtsız/belirsiz günün planla ilişkisini de kontrol et; [plan sözleşmesi](../docs/rules/work-plan.md).
- [ ] Gerçek hesapta eski rapor, kısa önbellek, kurtarma bekleme süresi, yeniden bağlantı ve 8 saatlik oturum bitişini doğrula.
- [ ] İki gerçek hesap/tarayıcıyla kimlik, kaynak çerezi ve rapor ayrımını doğrula.
- [ ] İstanbul gece yarısı, gün/hafta geçişi ve yeni kaynak hareketlerinin ekrana yansımasını kontrol et.

- [ ] Paketli Windows ve macOS cihazlarda bildirim izni/görünümü/tıklama, tepsi/menü çubuğu, uyku dönüşü ve gerçek çıkışı doğrula. Kullanıcının kendi Telegram botuyla açıkça başlattığı deneme mesajını kontrol et; [bildirim sözleşmesi](../docs/rules/notifications.md).

## Arayüz kabulü

- [ ] Tasarım ölçeğinde kalan yerel istisnaları sahiplerinde değerlendir: `globals.css` 1 px radius, `pofis.css` 5 px radius ve 23 px yazı, `pofi/room.css` 24 px radius, `notification-lab.css` 2 px radius. Anlamlı rolleri [DESIGN](../DESIGN.md) içinde belgele veya ortak basamakla eşleştir. Güncel günün tablo işareti görsel bağlamıyla değerlendirilsin.
- [ ] Kullanıcı, [yemek menüsünü](../docs/rules/meal-menu.md) masaüstü/mobilde kontrol etsin: menüyü aç → gün değiştir → yeniden aç; gün ve not eşleşmesini, skeleton'ı, korunan modal yüksekliğini, kapatma butonunu ve banner taşmasını doğrulasın. Kısa menü, boş gün ve hata durumlarını da incelesin. Görsel kabul kullanıcıda.
- [ ] Kullanıcı mesai planında serbest süre girişini ve +/- çizgilerini, manuel kilitli günden açık günlere uygulamayı, Sıfırla ile manuel kilidin kaldırılmasını ve tamamlanmış günlerin kayıt görünümünü doğrulasın. İki Tamamla seçeneğinin açılırken yerleşimi kaydırmadığını, eylem sırasını ve dar ekran yerleşimini kontrol etsin. Görsel kabul kullanıcıda.
- [ ] Kullanıcı giriş–çıkış raporunda kapalı gün satırında turnike uyarısı görünmediğini, günün ayrıntısını açınca neden/saat ve ham hareketlerin bulunduğunu doğrulasın. Görsel kabul kullanıcıda.
- [ ] 404 sahnesini, tema depolama bildirimini ve eksik notta defter gezinmesini masaüstü/mobil tarayıcıda doğrula. Boş normal havuzda nötr mesajı, önceki/sonraki gün gezinmesini ve özel gün notunu kontrol et.
- [ ] Pofi'nin canlı/kayıtlı `%114 → %115` geçişinde `overworked` görselini ve “Hedefin üzerinde.” başlığını tarayıcıda doğrula.
- [ ] Fiziksel mobil cihazda dokunmatik grafik ve modal tutamağından sürükleme davranışını kontrol et.
- [ ] Safari ve ekran okuyucuyla temel gezinme, durum etiketleri ve dialog odağını kontrol et.
- [ ] Rapor hazırlığı veya saat izdüşümü istisnasının ortak hata sınırına geçişini ve yeniden denemeyi kontrollü tarayıcı senaryosuyla doğrula.

## Sonraki işler

- [ ] Windows paket işini 120 saniyenin altına indir. Son yayın kapalı ölçümde Windows 139 s, iki mimarili macOS 84 s; macOS 90 s hedefi tamamlandı. Aşama sürelerini [yayın rehberinden](../docs/release.md#cache-ve-süre-ölçümü) izle.
- [ ] [Mevcut Pofi görsel setlerinin](../docs/brand/pofi-review-2026-10-15/README.md) uygulamaya alınacak dosyalarını kullanıcıyla belirle; yeni üretim ihtiyacını bu seçime göre netleştir.

Kurum sunucusunda dağıtım gündeme geldiğinde Docker, HTTPS/ingress, kalıcı oturum, disk izinleri ve kapasite kontrollerini [dağıtım rehberinden](../docs/deployment.md#dağıtım-kabulü) aç. [Tek süreç sınırları](../docs/architecture/multi-user-sessions.md) bu dağıtımın sözleşmesidir.
