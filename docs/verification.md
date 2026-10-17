# Doğrulama rehberi

Kontrolü değişen davranışa göre seçin. Beklenen sonucu ürün sözleşmesinden alın; otomatik test, fixture tarayıcı kabulü ve gerçek kaynak kabulünün kapsamlarını ayrı belirtin.

## Yerel kontroller

```powershell
bun test
bun run typecheck
bun run build
```

Önce etkilenen test dosyalarını çalıştırın. Hesap ve ortak politika değişikliklerinde ilgili bağımlı davranışları da kontrol edin. Üretim derlemesi, derleme veya çalışma zamanı etkisi olan değişikliklerin son kontrolüdür; görsel iterasyon `bun run dev` ile yapılır.

| Değişiklik | Kontrol |
| --- | --- |
| Ürün kuralı | [Kural belgesindeki](rules/README.md) somut senaryolar ve bağımlı davranış testleri |
| Tipli kod | Tür kontrolü |
| Görünür akış | Tarayıcıda ilgili giriş → işlem → sonuç zinciri; etkilenen boş/hata/mobil durumları |
| Oturum veya kaynak erişimi | İzolasyon, iptal/TTL, kalıcılık ve kaynak hata testleri; gerekli gerçek hesap kabulü |
| Dağıtım | [Kurum ortamı kabulü](deployment.md#dağıtım-kabulü) |
| Belge | Diff, yerel bağlantılar, kod sahibiyle tutarlılık ve `bun test src/domain/rules/rules.test.ts` |

[Kurallar testi](../src/domain/rules/rules.test.ts) modül belgelerini, kural bağlantılarını ve bağımlılık sınırlarını denetler. Serbest metin ile kodun anlamca tutarlılığı ayrıca incelenir.

[Plan kabul betiği](../scripts/acceptance/work-plan.js) yeni ve izole bir Playwright sayfasında, yerel sunucunun 3000 portuyla çalışır. API yanıtları ve saat sentetiktir; devir, kayıtsız/belirsiz gün, tamamlanan günün bütün süre kontrollerinde kilitlenmesi, saniyeli kaydın korunması, PDKS ile şablonun ayrılması, varsayılan/özel hafta, kilitli günleri atlayan dağıtım/toplu düzenleme/sıfırlama, yeniden yükleme, yazma hatası ve demo ayrımını denetler. Açık/koyu masaüstü ve mobil görüntülerini geçici olarak `output/playwright/` içine yazar. Görüntüleri inceledikten sonra temizleyin.

[Plan görünüm betiği](../scripts/acceptance/work-plan-style.js) yerel demoda açık/koyu tema metin kontrastını, 320px ekranın yatay taşmasını ve klavyeyle gün seçimini ve ayrı dokunmatik Chromium bağlamında dokunma alanlarını/süre değişikliğini denetler. Dokunmatik açık/koyu ekran görüntülerini `output/playwright/` içine yazar; incelemeden sonra temizleyin. Gerçek kaynak kullanmaz.

[Hafta ilerleme kabulü](../scripts/acceptance/work-plan-progression.js) haftayı planlama → Pazartesi gerçekleşeni → Salıya geçiş → özgün hedefin korunması → idempotent devir → tamamla → son günün kapanması zincirini ve geçmiş hafta/Ayarlar dönüşünü izole API ile sınar. Toplamlar tam metin veya saniye eşitliğiyle doğrulanır.

## Tarayıcı ve gerçek kaynak

[Kapasite kabulü](../scripts/acceptance/work-plan-capacity.js), Cuma kapalıyken Perşembe 5 sa 20 dk → 14 sa 50 dk, 40 saat hafta hedefi, 22.50 hedef çıkış, yenilemede idempotans ve saniyeli planın 16 saat sınırında durmasını izole API ile doğrular.

[Elle plan düzenleme kabulü](../scripts/acceptance/work-plan-manual.js), Çarşambayı 4 saate indirme → başka gün seçme → 40 saate tamamlama zincirinde Çarşambanın korunmasını ve yalnız gün seçmenin dağıtımı engellememesini izole kayıtlarla doğrular. Kapasite mesajı ve pencere kapatıldığında geçici korumanın temizlenmesi plan kabul betiğinde sınanır.

[Mesaim demosu](demo.md) ortak bileşenleri yakalanmış verilerle incelemek içindir. [Fixture kabul betiği](../scripts/acceptance/archive-behavior.js) giriş, rapor, plan, Pofi ve hata akışlarını sahte API yanıtlarıyla sınar. Bu kontroller canlı PDKS erişimini veya kurum kapasitesini kanıtlamaz.

Gerçek kaynak ve dağıtım kabulünde kurum ağı, kullanıcı hesabı ve hedef çalışma ortamı kullanılır. `/api/health` uygulamanın ayakta olduğunu gösterir; PDKS bağlantısını kanıtlamaz. Bekleyen senaryolar [görev listesinde](../tasks/todo.md) yönetilir.

Yerel oturum ölçümü için `bun scripts/benchmark-sessions.ts 100` çalıştırılabilir. [Betik](../scripts/benchmark-sessions.ts) sahte kaynak ve izole oturum dosyaları kullanır; geçici sonuç `work/session-benchmark/latest.json` dosyasına yazılır. Sonuç incelendikten sonra temizlenir; gerçek PDKS iş yükü ayrıca ölçülür.

## Sonuçların yönetimi

Sonucu ve kanıtın sınırlarını kullanıcıya bildirin. Tamamlanan doğrulamaların rapor, ekran görüntüsü ve ölçüm çıktılarını temizleyin. Geçerli ürün kararlarını ilgili sözleşmeye, açık bulguları görev listesine taşıyın. Test kodu ve tekrar kullanılabilir kabul betikleri doğrulama yönteminin parçasıdır.
