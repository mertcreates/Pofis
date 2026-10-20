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

[Kurallar testi](../src/domain/rules/rules.test.ts) modül belgelerini, kural bağlantılarını ve bağımlılık sınırlarını denetler. Bun'ın import tarayıcısıyla türleri silindikten sonra kalan değer, yan etki, yeniden dışa aktarım, `require` ve sabit adresli dinamik importları kontrol eder. Serbest metin ile kodun anlamca tutarlılığı ayrıca incelenir.

Kapsam yüzdesini testlerin yüklediği modüllerle birlikte değerlendirin. Taşıma ve reducer testleri kendi modüllerinin davranışını doğrular. `usePdks` içindeki React effect ve istek sahipliği için bekleyen çıkış, hafta değişimi ve geciken rapor yanıtı zincirini tarayıcıda doğrulayın.

UI bileşenlerinin DOM, metin, yerleşim ve sunum yardımcılarını demo üzerinden elle kontrol edin. Otomatik testler mesai hesabı, takvim sınırları, veri doğrulama, oturum izolasyonu ve diğer davranış sözleşmelerine odaklanır. Beklenen test sonuçlarını ilgili davranış sözleşmesindeki somut senaryolardan çıkarın.

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

[Mesaim demosu](demo.md) ortak bileşenleri örnek kayıtlarla incelemek içindir. Arayüz kabulünü ilgili senaryoyu seçip işlem ve sonuç metinlerini, boş/hata durumlarını ve dar ekran yerleşimini tarayıcıda kontrol ederek yapın. Gerçek PDKS erişimi ve kurum kapasitesi için hedef kurum ortamında kaynak kabulünü yapın.

Gerçek kaynak ve dağıtım kabulünde kurum ağı, kullanıcı hesabı ve hedef çalışma ortamı kullanılır. `/api/health` uygulamanın ayakta olduğunu gösterir. PDKS bağlantısını gerçek giriş ve rapor isteğiyle kontrol edin. Bekleyen senaryolar [görev listesinde](../tasks/todo.md) yönetilir.

Yerel oturum ölçümü için `bun scripts/benchmark-sessions.ts 100` çalıştırılabilir. [Betik](../scripts/benchmark-sessions.ts) sahte kaynak ve izole oturum dosyaları kullanır; geçici sonuç `work/session-benchmark/latest.json` dosyasına yazılır. Sonuç incelendikten sonra temizlenir; gerçek PDKS iş yükü ayrıca ölçülür.

## Masaüstü kabulü

`bun run test:desktop`, [sürüm denetimi testlerini](../electron/updates.test.cjs) de çalıştırır. Test manifestleriyle Windows/macOS hedef seçimi, sayısal sürüm karşılaştırması, bildirim seçimi, sabit kurulum komutu, kapanış sırasında sonucu bırakma ve gerçek 5 saniyelik zaman aşımı doğrulanır. Yerel Electron dialogunun ve panonun işletim sistemi davranışı, ayrıca canlı HTTPS manifestleri hedef cihazda kontrol edilir.

Installer kapanış sözleşmesi `bun test ./scripts/electron/install-close.test.cjs ./scripts/electron/install-macos.test.cjs` ile sınanır. macOS'ta sistem Bash'i, Windows'ta `POFIS_TEST_BASH` ile belirtilen Git Bash kullanılır. Onay reddi, yanıtsız çalıştırma, normal kapanış, ayrı zorla kapatma onayı ve süreçler bitmeden ilerlememe senaryoları işletim sistemi işlemleri taklit edilerek doğrulanır. Windows testi ayrıca izole kurulum yolunda çalışan gerçek bir fixture sürecini zorla kapatıp dışarıdaki sürecin çalışmaya devam ettiğini doğrular. Windows dağıtım kabulü gerçek paketle açık uygulamanın normal kapanışını ve yeni sürümün açılışını da sınar; bu testte yalnız terminal yanıtı sağlanır ve zorla kapatma sorusuna ihtiyaç duyulmadığı kontrol edilir. macOS native kabulü aynı normal kapanış zincirini gerçek `osascript` ile çalıştırır.

[Masaüstü rehberi](desktop.md#tekrarlanabilir-kabul) ortak platform/süreç testlerini, Node/Bun bulunmayan PATH ile paket kabulünü ve gerçek PDKS elle kontrol zincirini yönetir. Windows ve macOS hedefinde `bun run test:desktop` ve paket hazırlandıktan sonra aynı `bun run test:desktop:smoke` çalıştırılır. Windows ZIP'i için ayrıca `bun run test:desktop:distribution` kurulum/güncelleme/temizlik ve veri koruma yollarını izole dizinlerde sınar. macOS sistem araçlarını, gerçek pencereyi, izinleri ve Gatekeeper davranışını hedef macOS cihazında kontrol edin. Gerçek PDKS kabulünde kurum hesabını ve ağını kullanın. Tamamlanan masaüstü kabullerinin güncel durumu [masaüstü rehberindedir](desktop.md).

## Sonuçların yönetimi

Electron motoru değiştiğinde [motor geçişi kabulünü](desktop.md#motor-geçişi-kabulü) gerçek önceki/yeni paketlerle çalıştırın. Aynı paketin sürümünü değiştiren installer fixture'ları profilin farklı Chromium sürümleri arasında okunmasını kanıtlamaz. Ortak paket kabulü native sharp yüklemesini de sınar; pano kabulü yalnız izole CI/VM masaüstünde çalışır. Monterey için iki mimaride gerçek macOS 12 kabulü gerekir.

macOS installer için `bun scripts/electron/macos-distribution-test.cjs --site ../pofis-landing` gerçek macOS runner'ında gerçek ZIP kullanır; iki release job'u bunu otomatik çalıştırır. İlk kurulum/pencere, Finder uygulama yolu, aynı sürüm/tek örnek, alternatif port, indirme hatası, açıkken güncelleme, sürüm yükseltme, gerçek sunucu hatasının raporlanması, profil dosyası kalıcılığı, kurulum kilidi ve çökme sonrası yeniden açılışı sınar. Bash/sürüm/arşiv yolu birim testleri betik sözleşmelerini doğrular. Gatekeeper ve gerçek PDKS oturumu hedef cihazda kontrol edilir.

Sonucu ve kanıtın sınırlarını kullanıcıya bildirin. Tamamlanan doğrulamaların rapor, ekran görüntüsü ve ölçüm çıktılarını temizleyin. Geçerli ürün kararlarını ilgili sözleşmeye, açık bulguları görev listesine taşıyın. Davranış testleri ve demo üzerinden elle tarayıcı kabulü doğrulama yönteminin parçasıdır.
