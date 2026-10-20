# Açık işler

Tamamlanan işleri listeden çıkarın. Davranış sözleşmeleri [kural haritasında](../docs/rules/README.md), kabul yöntemi [doğrulama rehberindedir](../docs/verification.md).

## Gerçek PDKS kabulü

- [ ] Menüde kişisel bağlantısı olmayan gerçek yönetici hesabıyla giriş → kişisel turnike raporu → Pofi notları → yeniden giriş zincirini doğrula. Kullanıcı adının harf/takma ad eşdeğerliğini kaynakla ayrıca kontrol et; mevcut anahtar yalnız dış boşlukları temizler.

- [ ] Son hareketi giriş olan gerçek günde kayıtlı süre, canlı tahmin ve hedefi birlikte kontrol et.
- [ ] Gerçek PDKS haftasında [plan sözleşmesini](../docs/rules/work-plan.md) doğrula: saniyeli kilitli kayıt, izin sonrası hedef, sıfır süreli açık günün yeni kayıtla borç alması, devir/kapasite bakiyesi ve günlük hedef–çıkış eşitliği. Kayıtsız/belirsiz günün planla ilişkisini de kontrol et.
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

- [ ] Mesai planında izinli, şablondan kapalı, sıfır süreli açık ve kilitli günleri; kart/stepper süre eşitliğini ve dar ekran yerleşimini görsel olarak doğrula. Planın davranış testleri mevcut; görsel kontrol kullanıcıda.
- [ ] 404 sahnesini, tema depolama bildirimini ve eksik notta defter gezinmesini masaüstü/mobil tarayıcıda doğrula. Normal tema havuzu boşken nötr mesajı, önceki/sonraki gün gezinmesini ve özel gün notunu da kontrol et; yerel tarayıcı bağlantısı zaman aşımına uğradığı için bu kabul bekliyor.

- [ ] Pofi'nin canlı/kayıtlı `%114 → %115` geçişinde `overworked` görselini ve “Hedefin üzerinde.” başlığını tarayıcıda doğrula.
- [ ] Fiziksel mobil cihazda dokunmatik grafik ve modal tutamağından sürükleme davranışını kontrol et.
- [ ] Safari, forced-colors ve ekran okuyucuyla temel gezinme, durum etiketleri ve dialog odağını kontrol et.
- [ ] Rapor hazırlığı veya saat izdüşümü istisnasının ortak hata sınırına geçişini ve yeniden denemeyi kontrollü tarayıcı senaryosuyla doğrula.

## Sonraki ürün işleri

- [ ] [Mevcut Pofi görsel setlerinin](../docs/brand/pofi-review-2026-10-15/README.md) uygulamaya alınacak dosyalarını kullanıcıyla belirle; yeni üretim ihtiyacını bu seçime göre netleştir.
