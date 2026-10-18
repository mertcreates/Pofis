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

[Kurallar testi](../src/domain/rules/rules.test.ts) modül belgelerini, kural bağlantılarını ve bağımlılık sınırlarını denetler. Bun'ın import tarayıcısıyla türleri silindikten sonra kalan değer, yan etki, yeniden dışa aktarım, `require` ve sabit adresli dinamik importları kontrol eder; yasak bağımlılık örnekleriyle denetimin duyarlılığını doğrular. Serbest metin ile kodun anlamca tutarlılığı ayrıca incelenir.

Kapsam yüzdesini testlerin yüklediği modüllerle birlikte değerlendirin. Taşıma ve reducer testlerinin kapsamı, `usePdks` içindeki React effect ve istek sahipliği akışını kapsamaz; bu akış için bekleyen çıkış, hafta değişimi ve geciken rapor yanıtı zincirini tarayıcıda doğrulayın.

## Plan doğrulaması

Beklenen sonuçlar [mesai planı sözleşmesindeki](rules/work-plan.md) somut senaryolardan alınır.

| Otomatik test | Kapsam |
| --- | --- |
| [Plan](../src/domain/rules/work-plan.test.ts) | Sayısal devir, şablon mirası, özel hedef, kilitler, tamamlama ve sınırlar |
| [İzin ve kapasite](../src/domain/rules/work-plan-leave.test.ts) | Şablon karşılığını düşme, açma/sıfırlama ve kapasite sınırında otomatik dağıtım |
| [Sıfır süreli açık gün](../src/domain/rules/work-plan-open-days.test.ts) | Kaydetme → yeniden yükleme → sonraki gün yeni kayıt → yeniden dengeleme; izin, şablon ve sıfırlama |
| [Depolama](../src/data/work-plans.test.ts) | Doğrulama, kalıcılık, yazı hatası ve canlı/demo ayrımı |
| [Rapor](../src/domain/report.test.ts) | Ortak gereken süre, kayıt durumu, Pofi ve hedef çıkış |
| [Kural mimarisi](../src/domain/rules/rules.test.ts) | Belge/kod sahipliği ve bağımlılık sınırları |

## Tarayıcı ve gerçek kaynak

[Mesaim demosu](demo.md) ortak bileşenleri örnek kayıtlarla incelemek içindir. Arayüz kabulünü ilgili senaryoyu seçip işlem ve sonuç metinlerini, boş/hata durumlarını ve dar ekran yerleşimini tarayıcıda kontrol ederek yapın. Bu kontrol gerçek PDKS erişimini veya kurum kapasitesini kanıtlamaz.

Gerçek kaynak ve dağıtım kabulünde kurum ağı, kullanıcı hesabı ve hedef çalışma ortamı kullanılır. `/api/health` uygulamanın ayakta olduğunu gösterir; PDKS bağlantısını kanıtlamaz. Bekleyen senaryolar [görev listesinde](../tasks/todo.md) yönetilir.

Yerel oturum ölçümü için `bun scripts/benchmark-sessions.ts 100` çalıştırılabilir. [Betik](../scripts/benchmark-sessions.ts) sahte kaynak ve izole oturum dosyaları kullanır; geçici sonuç `work/session-benchmark/latest.json` dosyasına yazılır. Sonuç incelendikten sonra temizlenir; gerçek PDKS iş yükü ayrıca ölçülür.

## Sonuçların yönetimi

Sonucu ve kanıtın sınırlarını kullanıcıya bildirin. Tamamlanan doğrulamaların rapor, ekran görüntüsü ve ölçüm çıktılarını temizleyin. Geçerli ürün kararlarını ilgili sözleşmeye, açık bulguları görev listesine taşıyın. Davranış testleri ve demo üzerinden elle tarayıcı kabulü doğrulama yönteminin parçasıdır.
