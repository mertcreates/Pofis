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

## Plan doğrulaması

Beklenen davranışın sahibi [mesai planı sözleşmesidir](rules/work-plan.md). [Plan testleri](../src/domain/rules/work-plan.test.ts) sayısal senaryoları ve sınırları; [izin testleri](../src/domain/rules/work-plan-leave.test.ts) şablon karşılığını düşmeyi, sıfır süre/izin ayrımını, yeniden açmayı, şablon değişikliğini ve kapasite sınırındaki otomatik dağıtımı doğrular. Depolama, rapor/çıkış ve düzenleyici testleri bağlı sonuçları sınar. Tarayıcı kabul betikleri aşağıdaki akışları izole API yanıtları ve sentetik saatle çalıştırır; görünüm betiği yerel demoyu kullanır.

| Betik | Doğruladığı akış |
| --- | --- |
| [Plan kabulü](../scripts/acceptance/work-plan.js) | Kilitler, devir, hafta/şablon düzenleme, sıfırlama, yazma hatası, yeniden yükleme ve demo ayrımı |
| [Gereken süre](../scripts/acceptance/work-plan-required.js) | Kart/stepper eşitliği, doğrudan düzenleme, toplu uygulama, seçili gün önceliği, izin/açma ve kalıcılık |
| [Elle düzenleme](../scripts/acceptance/work-plan-manual.js) | Seçili günü dağıtım dışında tutma ve seçim değişikliğinin alıcılara etkisi |
| [Hafta ilerlemesi](../scripts/acceptance/work-plan-progression.js) | Günlerin tamamlanması, özel hedefler, tekrar hesaplama, hedef çıkış ve hafta navigasyonu |
| [Kapasite](../scripts/acceptance/work-plan-capacity.js) | Kalan günün kapasitesi, hedef çıkış, yeniden yükleme ve 16 saat sınırı |
| [Görünüm](../scripts/acceptance/work-plan-style.js) | Açık/koyu tema kontrastı, 320px taşma, klavye seçimi ve dokunmatik kontroller |

Betikler 3000 portundaki yerel uygulamayla çalışır. Üretilen ekran görüntüleri geçici olarak output/playwright/ içine yazılır; incelemeden sonra temizlenir. Gerçek PDKS ve kurum ortamı kabulünün durumu [görev listesinde](../tasks/todo.md) tutulur.

## Tarayıcı ve gerçek kaynak

[Mesaim demosu](demo.md) ortak bileşenleri yakalanmış verilerle incelemek içindir. [Fixture kabul betiği](../scripts/acceptance/archive-behavior.js) giriş, rapor, plan, Pofi ve hata akışlarını sahte API yanıtlarıyla sınar. Bu kontroller canlı PDKS erişimini veya kurum kapasitesini kanıtlamaz.

Gerçek kaynak ve dağıtım kabulünde kurum ağı, kullanıcı hesabı ve hedef çalışma ortamı kullanılır. `/api/health` uygulamanın ayakta olduğunu gösterir; PDKS bağlantısını kanıtlamaz. Bekleyen senaryolar [görev listesinde](../tasks/todo.md) yönetilir.

Yerel oturum ölçümü için `bun scripts/benchmark-sessions.ts 100` çalıştırılabilir. [Betik](../scripts/benchmark-sessions.ts) sahte kaynak ve izole oturum dosyaları kullanır; geçici sonuç `work/session-benchmark/latest.json` dosyasına yazılır. Sonuç incelendikten sonra temizlenir; gerçek PDKS iş yükü ayrıca ölçülür.

## Sonuçların yönetimi

Sonucu ve kanıtın sınırlarını kullanıcıya bildirin. Tamamlanan doğrulamaların rapor, ekran görüntüsü ve ölçüm çıktılarını temizleyin. Geçerli ürün kararlarını ilgili sözleşmeye, açık bulguları görev listesine taşıyın. Test kodu ve tekrar kullanılabilir kabul betikleri doğrulama yönteminin parçasıdır.
