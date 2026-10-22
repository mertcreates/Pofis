# Doğrulama rehberi

Kontrolü değişen davranışa göre seçin. Beklenen sonucu ürün sözleşmesinden alın; otomatik test, fixture tarayıcı kabulü ve gerçek kaynak kabulünün kapsamlarını ayrı belirtin.

## Yerel kontroller

Geliştirme kontrolleri yerelde çalıştırılır. GitHub Actions'ta yalnız elle başlatılan [sürüm akışı](release.md#bir-sürüm-yayımlama) bulunur; bu akış tür kontrolünü, davranış testlerini ve platform paket kabullerini çalıştırır.

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

UI metinlerini, DOM davranışını ve yerleşimi demoda kontrol edin. Otomatik testler hesap, takvim, veri doğrulama ve oturum izolasyonu gibi davranış sözleşmelerini korur. Her test somut bir davranış farkını yakalamalı; kendi örnek listesini doğrulayan veya aynı beklentiyi yineleyen kontroller eklenmemelidir. İçerik testleri seçim, tarih, tekrar ve özel gün davranışını sınar; metnin doğallığı editoryal inceleme gerektirir.

## Plan doğrulaması

Beklenen sonuçlar [mesai planı sözleşmesindeki](rules/work-plan.md) somut senaryolardan alınır.

| Otomatik test | Kapsam |
| --- | --- |
| [Plan](../src/domain/rules/work-plan.test.ts) | Sayısal devir, şablon mirası, özel hedef, kilitler, tamamlama ve sınırlar |
| [Manuel kilit](../src/domain/rules/work-plan-locks.test.ts) | Kaydetme/yeniden yükleme, otomatik devir ve iki Tamamla seçeneğinde süreyi koruma; Sıfırla ile kilidi kaldırıp şablona dönüş |
| [Süre girişi](../src/domain/rules/plan-duration.test.ts) | Türkçe/İngilizce birimler, saat:dakika ve ondalık saat biçimleri, geçersiz girişler ve +/- çizgileri |
| [Plan hesap denetimi](../src/domain/rules/work-plan-audit.test.ts) | İki Tamamla dağıtımında saniyeli eksik/fazla süre, izin ve manuel kilit → kaydetme/yeniden yükleme → tam referans hedef; güvenli dakika gösterimi, tekrar Tamamla ve şablonu 5 × 8 saate sıfırlama |
| [Plan düzenleyici](../src/components/plan-editor.test.tsx) | Hedef/fazla süre sunumu, Tamamla kapasitesi, yalnız manuel kilit bulunan haftada Sıfırla ve tamamlanmış günün kayıt görünümü |
| [Fazla süre politikası](../src/domain/rules/work-plan-surplus.test.ts) | Güncel ayarda fazla süreyi ayrı tutma, eksik süre dağıtımı, izin, elle düzenleme ve Tamamla; önceki dağıtım testleri azaltma açıkken dönüş sözleşmesini doğrular |
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

Paketleme, süreç ve installer kabulünün ayrıntılı kapsamı [masaüstü rehberindedir](desktop.md#tekrarlanabilir-kabul). Değişikliğe göre şu komutları seçin:

| Kontrol | Komut / sınır |
| --- | --- |
| Electron ve bildirim birimleri | `bun run test:desktop` |
| Kabuk ve dağıtım betiklerinin tüm birimleri | `bun test ./electron ./scripts/electron`; `.cjs` dosyaları için açık dizin seçimi gerekir |
| Paket açılışı | `bun run test:desktop:smoke <paket-klasörü>` |
| Windows installer | `bun run test:desktop:distribution`; landing komutu için `--site ../pofis-landing` |
| macOS installer | Native ARM64 ortamında `bun scripts/electron/macos-distribution-test.cjs --site ../pofis-landing`; Intel statik kontrolü [yayın rehberinde](release.md#cache-ve-süre-ölçümü) |
| Installer kapanışı | `bun test ./scripts/electron/install-close.test.cjs ./scripts/electron/install-macos.test.cjs`; Windows'ta `POFIS_TEST_BASH` Git Bash yolunu gösterir |
| Windows arşiv sınırları | `bun test ./scripts/electron/install-archive.test.cjs`; sistem aracı ve .NET açıcı |
| Güncelleme arayüzü | Güncel standalone sonrasında `bun scripts/electron/update-demo.cjs --verify`; [senaryolar](desktop.md#güncelleme-bildirimini-deneme) |
| Bildirim arayüzü ve IPC | Güncel standalone sonrasında `bun scripts/electron/notification-demo.cjs --verify`; sağlayıcılar fixture'dır |
| Sistem panosu | `bun scripts/electron/clipboard-smoke.cjs --isolated-desktop`; panoyu değiştirdiği için yalnız izole CI/VM masaüstünde |
| Electron motor geçişi | Gerçek önceki/yeni paketlerle [motor geçişi kabulü](desktop.md#motor-geçişi-kabulü) |

Genel paket/kurulum kabulleri `POFIS_TEST_BLOCK_ANALYTICS=1` ile Google trafiğini engeller; loopback erişimi sürer. GA4 alanları ve hesap kimliği [ölçüm testlerinde](analytics.md#doğrulama) sahte `window.dataLayer` ile doğrulanır.

Windows kapanış testleri her senaryoya ayrı fixture kapsamı açar; gerçek zorla kapatma testi yalnız izole kurulumdaki süreci sonlandırır ve dış süreci korur. macOS fixture testleri sistem işlemlerini taklit eder; native kabul gerçek `osascript`, ZIP ve uygulama süreçlerini kullanır. Hedef cihazda Gatekeeper, sistem izinleri, bildirim görünümü ve gerçek PDKS akışını ayrıca doğrulayın. Pano veya fixture sonucu bu kabulün yerine geçmez.

## Linux ve ortak Unix installer kabulü

Ortak installer testleri: `bun test ./scripts/electron/unix-installer.test.cjs ./scripts/electron/install-macos.test.cjs ./scripts/electron/install-linux.test.cjs`. Windows’ta POFIS_TEST_BASH Git Bash yolunu, POFIS_TEST_PYTHON Python executable yolunu gösterir; Linux’ta sistem Bash/Python 3 kullanılır. Platform seçiminde karşı işletim sisteminin kodunun çalışmadığı, argüman ve hata kodu korunumu, güvenli arşiv açma, sürüm politikası, yeni pencere hatasında geri alma ve profil koruyan kaldırma izole fixture’larda sınanır. Python fixture’ları Linux süreç/anahtarlık kabulü sayılmaz.

Linux paketi mevcut macOS runner’ında ortak standalone çıktısıyla üretilir; statik kabulün kapsamı [yayın rehberindedir](release.md#cache-ve-süre-ölçümü). Ayrı Linux runner çalıştırılmaz. macOS üzerinde `bun scripts/electron/linux-static-check.cjs <linux-paket-klasörü>` paketin dosya/mimari/izin sözleşmesini kontrol eder; bu sonuç Linux açılış veya anahtarlık kanıtı değildir.

Native kabul için Ubuntu 24.04 LTS x64 cihazı veya izole VM kullanın. Paket çıktısını `dist/linux/Pofis-linux-x64-<kimlik>` altına, sürüm arşivini ve manifesti `dist/releases/linux/x64` altına alın. Kaynak bağımlılıkları ve Electron Linux runtime’ı da kurulmuş olmalıdır. Xvfb, oturum D-Bus’ı, GNOME anahtarlığı ve masaüstü kütüphanelerini hazırlayın. [AppArmor kabul hazırlığı](../scripts/electron/linux-ci.cjs), `bun scripts/electron/linux-ci.cjs sandbox --isolated-desktop` açık seçeneğiyle yalnız izole Ubuntu ortamında bu checkout’un test executable yollarına izin verir; normal kullanıcı kurulumunu installer yönetir.

Aynı D-Bus/anahtarlık oturumunda önce `bun scripts/electron/smoke.cjs <linux-paket-klasörü>`, ardından `bun scripts/electron/linux-distribution-test.cjs --site ../pofis-landing` çalıştırın. Dağıtım kabulü gerçek Electron/Next paketiyle kurulum ve güncelleme zincirini sınar; terminal yanıtları ve önceden yüklenen AppArmor profili test sınırıdır. `bun scripts/electron/notification-demo.cjs --verify` gerçek anahtarlığı kullanır; Telegram sağlayıcısı ve yerel bildirim görüntüleyicisi fixture’dır. Bildirim kabulünde sıfır çıkış kodu ve tamamlanma mesajı birlikte aranır. GNOME tepsisi, sistem bildirimi, ilk AppArmor onayı ve gerçek PDKS oturumu hedef Ubuntu cihazında ayrıca doğrulanır; [destek kapsamı](desktop.md#ubuntu-2404-lts-x64-ve-ortak-unix-kurulumu).

## Sonuçların yönetimi

Her sonucu kullanılan kaynak, paket ve ortamla birlikte değerlendirin. Sürümü değiştirilmiş installer fixture'ı, farklı Chromium motorları arasında profil geçişini kanıtlamaz. Intel statik kontrolleri pencere/kurulum kabulü, `macos-15` sonucu macOS 12 çalışma kanıtı değildir. Açık kabuller [görev listesinde](../tasks/todo.md) tutulur.

Sonucu ve kanıtın sınırlarını kullanıcıya bildirin. Tamamlanan doğrulamaların rapor, ekran görüntüsü ve ölçüm çıktılarını temizleyin. Geçerli ürün kararlarını ilgili sözleşmeye, açık bulguları görev listesine taşıyın. Davranış testleri ve demo üzerinden elle tarayıcı kabulü doğrulama yönteminin parçasıdır.
