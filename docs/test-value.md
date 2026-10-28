# Test değeri ve bakım maliyeti

Testler yanlış hesap, veri kaybı, hesaplar arası sızıntı ve bozuk kullanıcı akışlarını yakalamalıdır. Çalıştırma komutları ve kabul zincirleri [doğrulama rehberinde](verification.md), davranışların sahipleri [kural haritasındadır](rules/README.md).

## Test eklerken veya sadeleştirirken

1. Korunan davranışı ve yanlış sonuçta hangi beklentinin başarısız olacağını belirleyin. Beklenen sonucu sözleşmedeki somut senaryodan alın.
2. Gerçek üretim fonksiyonunu veya bileşenini çalıştırın; fixture yalnız dış bağımlılığı sağlasın.
3. Tekrarı kaldırırken aynı riski koruyan testi gösterin. Farklı sınır, hata yolu, tüketici ve kalıcılık aşamalarını ayrı değerlendirin.
4. Görünür metin, erişilebilir ad, durum ve eylem sonucunu sınayın. İç sınıf, ikon veya çocuk düğüm sayısını yalnız kullanıcı sözleşmesi gerektiriyorsa sabitleyin.
5. İçerik havuzlarında geçerlilik, seçim ve tekrar davranışını doğrulayın; güncel metin sayısını sabitlemek içerik bakımını gereksiz yere zorlaştırır.

Test kapsamını risk ve davranış üzerinden değerlendirin. Aynı yardımcıya yönelen hesap, adaptör ve kalıcılık testleri farklı hataları yakalayabilir.

## Korunan riskler

| Alan | Davranış ve test sahibi |
| --- | --- |
| Mesai ve plan | [Plan](../src/domain/rules/work-plan.test.ts), [saniyeli hesaplar](../src/domain/rules/work-plan-audit.test.ts), [kilitler](../src/domain/rules/work-plan-locks.test.ts), [izin](../src/domain/rules/work-plan-leave.test.ts), [açık günler](../src/domain/rules/work-plan-open-days.test.ts), [fazla süre](../src/domain/rules/work-plan-surplus.test.ts) |
| Kayıt ve rapor | [Turnike özeti](../src/domain/rules/recorded-time.test.ts), [kayıt durumu](../src/domain/rules/record-status.test.ts), [rapor tüketimi](../src/domain/report.test.ts) |
| Ortak kural sahipliği | [Mimari sınırlar](../src/domain/rules/rules.test.ts), [politika tüketicileri](../src/domain/rules/policy-consumers.test.ts), [adaptörler](../src/domain/rules/policy-adapters.test.ts) |
| Oturum ve kaynak | [Hesap izolasyonu](../src/server/session-manager.test.js), [disk kaydı](../src/server/session-storage.test.js), [eşzamanlı istekler](../src/server/pdks-concurrency.test.js), [HTTP akışı](../src/server/routes.test.js) |
| İstemci yaşam döngüsü | [Yanıt yarışları ve temizleme](../src/data/pdks-lifecycle.test.ts), [durum geçişleri](../src/data/pdks-state.test.ts), [plan depolama](../src/data/work-plans.test.ts) |
| İçerik ve ölçüm | [Not seçimi](../src/lib/pofi-notes/notebook.test.ts), [faaliyetler](../src/lib/pofi-work/catalogue.test.ts), [yemek yorumları](../src/lib/meals/commentary-selection.test.ts), [GA4 veri alanları](../src/lib/analytics.test.ts) |
| Masaüstü güven sınırları | [Pencere ve IPC](../electron/mini-window.test.cjs), [izinler](../electron/permissions.test.cjs), [taşıma](../electron/transport.test.cjs), [bildirim zamanı ve hesap ayrımı](../src/desktop/notification-runtime.test.ts) |
| Paketleme ve kurulum | [Arşiv sınırları](../scripts/electron/install-archive.test.cjs), [süreç temizliği](../scripts/electron/ci-processes.test.cjs), [kurulumda kapanış](../scripts/electron/install-close.test.cjs), [profil koruma](../scripts/electron/uninstall.test.cjs), [yayın girdileri](../scripts/electron/publish.test.cjs) |

## Sadeleştirme örnekleri

- Fazla süre azaltımı, 41:09:17 toplamı ve kalan günlerin beklenen süreleriyle sınanır.
- Eşit ve son güne dağıtım, aynı saniyeli eksik/fazla süre ve kapasite senaryolarında beklenen gün sonuçlarıyla sınanır; izin, kilit ve kaydetme ayrıca doğrulanır.
- Rapor testi seçilen notun rapora taşınmasını doğrular; haftalık tekrar ve özel gün davranışı not defteri sahibinde sınanır.
- Kilidin erişilebilir adı, basılı durumu ve korunan süresi; saat alanının değeri, tek seçimi ve gün geçişi; cetvelin kayıt uyarısı ve gezinmesi doğrulanır.

## Kanıtın sınırı

Statik React sunumu görünür çıktıyı doğrular. Tıklama, odak, effect yaşam döngüsü ve CSS yerleşimi için [tarayıcı kabulü](verification.md#tarayıcı-ve-gerçek-kaynak) gerekir. Hook yaşam döngüsü testleri gerçek React hook'unu izole renderer içinde çalıştırır.

Politika tüketici testleri sahibin değerini bellekte değiştirip gerçek modülün yeni sonucu kullandığını sınar. Kaynak dönüşümü modül yapısına bağlıdır; bu testleri değiştirirken ortak sahipten kopmayı yakaladıklarını kontrol edin.

Ağ, Electron ve sistem adaptörleri taklit edildiğinde sonuç o sınırdaki kararı kanıtlar. Native anahtarlık, pencere, installer ve gerçek PDKS kabulleri [doğrulama rehberindeki](verification.md) hedef ortamda tamamlanır. Yayın testleri fixture token/ağ kullanır; canlı yayın kabulü [sürüm rehberindedir](release.md#yayın-sonrası-https-kabulü).

Duyarlılığı kontrol etmek için uygun bir testte yanlış sonuç üretip beklentinin başarısız olduğunu gözleyin. Kaynak incelemesiyle bulunan kapsamı ve bu deneyle doğrulanan duyarlılığı ayrı bildirin.
