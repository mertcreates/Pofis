# Açık işler

Tamamlanan işleri listeden çıkarın. Davranış sözleşmeleri [kural haritasında](../docs/rules/README.md), kabul yöntemi [doğrulama rehberindedir](../docs/verification.md).

## Electron 43 ve macOS 12 geçişi

- [ ] Kullanıcı yetkisiyle yayın seçimi kapalı Actions ölçümünde Windows paket işinde 120, tek Apple Silicon runner paket işinde 90 saniye hedefini doğrula. `a103642` koşusu başarılı: Windows 133 s, macOS 99 s. Sonraki ölçümde ortak ARM64 Next çıktısıyla Intel paketlemeyi, native sunucu dosyası kontrolünü, taslaktan kurtarılan ARM64 ZIP’in Intel için kullanımını ve birleştirilen kurulum kabul zincirlerini doğrula. Windows yerel tam kurulum kabulü 49,97 s geçti; gerçek macOS ve toplam job süreleri yeni koşuyu bekler. Intel açılış/kurulum/güncelleme kabulü CI kapsamı dışındadır; [yayın sözleşmesi](../docs/release.md#cache-ve-süre-ölçümü).
- [ ] macOS 12 ARM64 ilk kurulum ve 43 → 43 güncellemesini; macOS 13+ ARM64 gerçek 44 → 43 profil/installer geçişini, imza, Gatekeeper ve uyku/uyanmayı doğrula. Intel gerçek cihaz kabulünü ayrı izle; Intel yayını statik kontrollerle ilerler. Kaynak 0.4.2 / Electron 43.8.1'e geçirildi; Windows gerçek ZIP/profil/installer geçişi doğrulandı. [Ortak kabul komutları](../docs/desktop.md#motor-geçişi-kabulü).
- [ ] İzole CI/VM masaüstünde Windows ve ARM64 hedeflerinin gerçek pano kabulünü çalıştır; geçerli gerçek PDKS oturumuyla güncelleme sonrası devamı ve mevcut TTL'yi kontrol et. Intel pano/kurulum/güncelleme kabulü yayın kapısı değildir; Intel paketi statik kontrollerden geçer. Yayın workflow'u hedef sürüme yönelik kullanıcı yetkisiyle başlatılır.

## Gerçek PDKS kabulü

- [ ] Menüde kişisel bağlantısı olmayan gerçek yönetici hesabıyla giriş → kişisel turnike raporu → Pofi notları → yeniden giriş zincirini doğrula. Kullanıcı adının harf/takma ad eşdeğerliğini kaynakla ayrıca kontrol et; mevcut anahtar yalnız dış boşlukları temizler.

- [ ] Son hareketi giriş olan gerçek günde kayıtlı süre, canlı tahmin ve hedefi birlikte kontrol et. Ara giriş/çıkış tekrarlarından sonra gelen tek güvenilir girişte canlı mesainin ilerlediğini ve önceki tekrar uyarılarının korunduğunu doğrula; bu senaryo alan testleri ve örnek API yanıtıyla tarayıcıda doğrulandı.
- [ ] Gerçek PDKS haftasında [plan sözleşmesini](../docs/rules/work-plan.md) doğrula: saniyeli kilitli kayıt, izin sonrası hedef, sıfır süreli açık günün yeni kayıtla borç alması, devir/kapasite bakiyesi ve günlük hedef–çıkış eşitliği. Kayıtsız/belirsiz günün planla ilişkisini de kontrol et.
- [ ] Gerçek hesapta eski rapor, kısa önbellek, kurtarma bekleme süresi, yeniden bağlantı ve 8 saatlik oturum bitişini doğrula.
- [ ] İki gerçek hesap/tarayıcıyla kimlik, kaynak çerezi ve rapor ayrımını doğrula.
- [ ] İstanbul gece yarısı, gün/hafta geçişi ve yeni kaynak hareketlerinin ekrana yansımasını kontrol et.

## Kurum dağıtımı

- [ ] GA4 `G-MV4MG71CDB` akışında Geliştirilmiş ölçümü kapat; Raporlama kimliğini User-ID içeren Gözlemlenen veya Harmanlanmış olarak ayarla ve `app_release` olay boyutunu tanımla. Yetkili yayın sonrasında Anlık rapor/Kullanıcı keşfinde web/masaüstü kimliklerini doğrula. [Ölçüm sözleşmesi](../docs/analytics.md). Yerel üretim/Electron kabulü ölçüm isteklerini iptal ederek alanları ve hesap geçişlerini denetler; canlı akışa test verisi göndermez.
- [ ] Üretim öncesinde kullanıcıya sunulan veri bilgilendirmesine otomatik GA4 ölçümünü ve takma hesap kimliğini ekle; kapsamı [ölçüm sözleşmesiyle](../docs/analytics.md) eşleştir.

- [ ] Docker imajını hedef ortamda derle ve çalıştır; TZ, dinleme adresi ve volume izinlerini kontrol et.
- [ ] Dış HTTPS/ingress üzerinden giriş → rapor → yenileme → çıkış zincirini ve çerez niteliklerini doğrula.
- [ ] Süreç/pod yeniden başlatmasında kalıcı oturumla devamı; disk hatalarının ve izinlerin işletim davranışını doğrula.
- [ ] Kurumla belirlenen gerçek PDKS iş yükünü ölç; desteklenen kapasiteyi bu sonuçlara göre belirle.

[Dağıtım rehberi](../docs/deployment.md) · [Tek süreç sınırları](../docs/architecture/multi-user-sessions.md). Yerel sentetik yük testleri gerçek PDKS kapasitesini belirlemez. Ortak depo/çoklu replica kararı, ölçüm veya yüksek erişilebilirlik gereksinimi oluştuğunda ele alınır.

## Arayüz kabulü

- [ ] Kullanıcı, [yemek menüsünü](../docs/rules/meal-menu.md) masaüstü/mobilde kontrol etsin: menüyü aç → gün değiştir → yeniden aç; günle doğru notun birlikte görünmesini, yüklemede skeleton ve korunmuş modal yüksekliğini, kapatma butonunu ve 1–2 cümlelik banner'ın taşmamasını doğrulasın. Kısa menü, boş gün ve hata durumlarını da incelesin. Otomatik API/seçim/yükseklik testleri mevcut; tarayıcı kabulü kullanıcının isteğiyle kendisinde.

- [ ] Mesai planında izinli, şablondan kapalı, sıfır süreli açık ve kilitli günleri; kart/stepper süre eşitliğini ve dar ekran yerleşimini görsel olarak doğrula. Planın davranış testleri mevcut; görsel kontrol kullanıcıda.
- [ ] 404 sahnesini, tema depolama bildirimini ve eksik notta defter gezinmesini masaüstü/mobil tarayıcıda doğrula. Normal tema havuzu boşken nötr mesajı, önceki/sonraki gün gezinmesini ve özel gün notunu da kontrol et; yerel tarayıcı bağlantısı zaman aşımına uğradığı için bu kabul bekliyor.

- [ ] Pofi'nin canlı/kayıtlı `%114 → %115` geçişinde `overworked` görselini ve “Hedefin üzerinde.” başlığını tarayıcıda doğrula.
- [ ] Fiziksel mobil cihazda dokunmatik grafik ve modal tutamağından sürükleme davranışını kontrol et.
- [ ] Safari, forced-colors ve ekran okuyucuyla temel gezinme, durum etiketleri ve dialog odağını kontrol et.
- [ ] Rapor hazırlığı veya saat izdüşümü istisnasının ortak hata sınırına geçişini ve yeniden denemeyi kontrollü tarayıcı senaryosuyla doğrula.

## Sonraki ürün işleri

- [ ] [Mevcut Pofi görsel setlerinin](../docs/brand/pofi-review-2026-10-15/README.md) uygulamaya alınacak dosyalarını kullanıcıyla belirle; yeni üretim ihtiyacını bu seçime göre netleştir.
