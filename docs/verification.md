# Doğrulama rehberi

Kontrolü değişen davranışa göre seçin. Beklenen sonucu ürün sözleşmesinden alın; otomatik test, fixture tarayıcı kabulü ve gerçek kaynak kabulünün kapsamlarını ayrı belirtin.

## Kabul durumu

22 Ekim 2026'da kullanıcı, görev listesindeki “Sonraki işler” dışındaki test ve kabullerin tamamlandığını bildirdi. Bu kabul; platform/kurulum/güncelleme, yayın performansı ve GA4, gerçek PDKS/hesap ayrımı ve arayüz kontrollerini kapsar. Aşağıdaki yöntemler değişen yolların tekrar doğrulanması için korunur; açık geliştirme işleri [görev listesindedir](../tasks/todo.md).

## Yerel kontroller

Geliştirme kontrolleri yerelde çalıştırılır. GitHub Actions'ta paket yayını için elle başlatılan [sürüm akışı](release.md#bir-sürüm-yayımlama) bulunur. Otomatik Pofi Mini PR workflow'u mevcut değildir. Sürüm akışı tür kontrolünü, davranış testlerini ve platform paket kabullerini çalıştırır.

```powershell
bun test ./src ./electron ./scripts/electron
bun run typecheck
bun run build
```

Önce etkilenen test dosyalarını çalıştırın. Hesap ve ortak politika değişikliklerinde ilgili bağımlı davranışları da kontrol edin. Üretim derlemesi, derleme veya çalışma zamanı etkisi olan değişikliklerin son kontrolüdür; görsel iterasyon `bun run dev` ile yapılır.

`bunfig.toml` test kökü `src` olduğundan yalın `bun test` yalnız bu dizini kapsar. Tam paket için yukarıdaki üç dizinli komutu kullanın. Test seçme ve sadeleştirme kararları [test değeri denetimindedir](test-value.md).

Release değişikliklerinde `bun test --parallel=4 ./scripts/electron ./electron ./src/desktop` kullanılır. İptal/alt süreç temizliği, yayın kaynağı ve paket sınırları izole testlerle; macOS süreç seçimi ve Keychain reddi adaptörlerle sınanır. Süreç sözleşmesi [yayın rehberinde](release.md#yayın-sırası-ve-hata-davranışı), cihaz kontrolleri aşağıdaki masaüstü kabul bölümlerindedir.

| Değişiklik | Kontrol |
| --- | --- |
| Ürün kuralı | [Kural belgesindeki](rules/README.md) somut senaryolar ve bağımlı davranış testleri |
| Tipli kod | Tür kontrolü |
| Görünür akış | Tarayıcıda ilgili giriş → işlem → sonuç zinciri; etkilenen boş/hata/mobil durumları |
| Oturum veya kaynak erişimi | İzolasyon, iptal/TTL, kalıcılık ve kaynak hata testleri; gerekli gerçek hesap kabulü |
| Dağıtım | [Kurum ortamı kabulü](deployment.md#dağıtım-kabulü) |
| Belge | Diff, yerel bağlantılar, kod sahibiyle tutarlılık ve `bun test src/domain/rules/rules.test.ts` |

### Ortak kural ve adaptör testleri

| Test | Kanıtladığı davranış |
| --- | --- |
| [Kural mimarisi](../src/domain/rules/rules.test.ts) | Kural belgeleri, kod bağlantıları ve çalışma zamanı bağımlılık sınırları; değer/yan etki importları, yeniden dışa aktarım, require ve sabit adresli dinamik importlar |
| [Politika tüketicileri](../src/domain/rules/policy-consumers.test.ts) | Sahibin değeri değiştiğinde bildirim formu/varsayılanları, plan ve rapor sınırları, hata metinleri ve yemek takviminin yeni değeri kullanması |
| [Adaptörler](../src/domain/rules/policy-adapters.test.ts) | Web/masaüstü rapor kimliği, demo/profil kimliği, heartbeat iptali, demo süre adımı, Telegram formu/keşfi/girdi sınırı ve masaüstü oturum bitiş koşulu |

Politika testleri gerçek modülleri ayrı Bun süreçlerinde, yalnız sahibin değerlerini bellekte değiştirerek çalıştırır. HTTP ve Electron yanıtları taklittir. Hook kurulmuş oturumla, Telegram formu manuel alan açıkken sunulur. Tarayıcıda bekleyen çıkış → hafta değişimi → geciken rapor yanıtı zincirini ve Telegram modal etkileşimini doğrulayın; React effect yaşam döngüsünün kabulü bu yoldadır.

Test kapsamını yüklenen modüller ve somut davranış beklentileriyle değerlendirin. Belge/kod anlam uyumunu ayrıca inceleyin. İçerik testleri seçim, tarih, tekrar ve özel gün davranışını; editoryal inceleme metnin doğallığını doğrular.

## Günün akışı doğrulaması

[Günün akışı testi](../src/components/attendance/day-flow.test.tsx), giriş yokken sıfır süre/grafik üretilmemesini, Şimdi → Son çıkış ayrımını, hedef öncesi/sonrası işaret konumlarını, saniyeli hedefin korunmasını, kayıt uyarısı sırasında güvenilir canlı sürenin devam etmesini ve eski raporda bilinmeyen sürenin hesaplanmış gibi gösterilmemesini sınar. Gerçek CSS yerleşimi ve odak davranışı bu statik testin kapsamında değildir.

Tarayıcı kabulü:

1. Giriş kaydı olmayan gün → kısa durum görünür; mesai sıfırmış gibi gösterilmez, boş grafik ve lejant yoktur. Eski raporda ilk giriş biliniyorsa hedef çıkış korunur; mesai bilinmiyorsa çizgi görünür ve kalan süre üretilmez.
2. Canlı mesai → Bugünkü mesai ve Hedefe kalan/Hedefi aşan üsttedir; tam eşitlikte Hedefle aynı görünür. Şimdi etiketi ve saati ilerleyen çubuğun ucunu takip eder. Hedef çıkış rayın altında kendi işaretine bağlıdır; hedef aşılana kadar eksenin sonunda, aşılınca geride kalır. İlk giriş eksenin başındadır. Çıkış kaydı geldiyse Şimdi yerine Son çıkış görünür; gün tamamlandı denmez. Saniyeler daha küçük ve ikincildir; sıfır olmayan hedef saniyeleri kaybolmaz. Gece yarısını aşan hedefin tarihi görünür.
3. Belirsiz kayıt → kısa uyarı ve Kayıtları aç eylemi görünür. Eylem bugünün rapor satırını açıp odaklamalıdır; ayrıntılı neden oradadır. Önceki kayıtlarda sorun olsa da güvenilir açık girişin canlı süresi devam etmelidir. Haftalık cetvelden bugünü seçmek Mesai planını açmaya devam etmelidir.
4. Dar kapsayıcı, açık/koyu tema ve büyütülmüş metin → üst bilgiler gerektiğinde alt alta geçmeli, etiketler işaretlerini izleyip kenarlarda kapsayıcı içinde kalmalı ve üst üste binmemelidir. Sıfır hedefte ilk giriş ve hedef etiketleri ayrı satırlarda okunmalıdır. Metin taşmamalı ve Kayıtları aç düğmesinin klavye odağı görünmelidir.

## Plan doğrulaması

Beklenen sonuçlar [mesai planı sözleşmesindeki](rules/work-plan.md) somut senaryolardan alınır.

| Otomatik test | Kapsam |
| --- | --- |
| [Plan](../src/domain/rules/work-plan.test.ts) | Sayısal devir, şablon mirası, özel hedef, kilitler, tamamlama ve sınırlar |
| [Manuel kilit](../src/domain/rules/work-plan-locks.test.ts) | Kaydetme/yeniden yükleme, otomatik devir ve iki Tamamla seçeneğinde süreyi koruma; Sıfırla ile kilidi kaldırıp şablona dönüş |
| [Süre girişi](../src/domain/rules/plan-duration.test.ts) | Türkçe/İngilizce birimler, saat:dakika ve ondalık saat biçimleri, geçersiz girişler, +/- çizgileri; plan saatinde `H:mm` / `HH:mm` / dört rakam, `00:00`–`23:59` sınırı, karşı saati hesaplama ve gün sınırı |
| [Plan hesap denetimi](../src/domain/rules/work-plan-audit.test.ts) | İki Tamamla dağıtımında saniyeli eksik/fazla süre, izin ve manuel kilit → kaydetme/yeniden yükleme → tam referans hedef; güvenli dakika gösterimi, tekrar Tamamla ve şablonu 5 × 8 saate sıfırlama |
| [Plan düzenleyici](../src/components/plan-editor.test.tsx) | Referans hedef, beklenen toplam ve farkın tek özette aynı saniye hassasiyetiyle sunumu; eksikte Tamamla, fazlada Ayarla; kısa kapasite uyarıları ve Tamamla kapasitesi, Sıfırla, tamamlanmış günün kayıt görünümü; gün eylemlerinin sırası, İzinli/Kilitli durumları ve kilitli sabit süre; Planlayıcının kapalı başlaması ve kilitli/kapalı gün görünürlüğü |
| [Saat alanı](../src/components/plan-time-input.test.tsx) | `6 → 06 → 06:30`, belirsiz ilk rakam, bölüm değiştirme/silme, eksik dakika, geçersiz değer ve tam saat yapıştırma, ↑ / ↓ adımları ve gece yarısı döngüsü; DOM odağı ve dokunmatik kabul aşağıdaki zincirdedir |
| [Saat düzenleyici](../src/components/plan-time-planner.test.tsx) | Saat alanının cümle içinde doğrudan sunulması, tek girersem/çıkmak için seçimi ve karşı saat, Türkçe saat eki, gün adı ve hafta sınırı geçişleri, güvenli dakika hesabı, boş ve devre dışı kontroller |
| [Fazla süre politikası](../src/domain/rules/work-plan-surplus.test.ts) | Güncel ayarda fazla süreyi ayrı tutma, eksik süre dağıtımı, izin, elle düzenleme ve Tamamla; önceki dağıtım testleri azaltma açıkken dönüş sözleşmesini doğrular |
| [İzin ve kapasite](../src/domain/rules/work-plan-leave.test.ts) | Şablon karşılığını düşme, açma/sıfırlama ve kapasite sınırında otomatik dağıtım |
| [Sıfır süreli açık gün](../src/domain/rules/work-plan-open-days.test.ts) | Kaydetme → yeniden yükleme → sonraki gün yeni kayıt → yeniden dengeleme; izin, şablon ve sıfırlama |
| [Depolama](../src/data/work-plans.test.ts) | Doğrulama, kalıcılık, yazı hatası ve canlı/demo ayrımı |
| [Rapor](../src/domain/report.test.ts) | Ortak gereken süre, kayıt durumu, Pofi ve hedef çıkış |
| [Kural mimarisi](../src/domain/rules/rules.test.ts) | Belge/kod sahipliği ve bağımlılık sınırları |
| [Haftalık toplam](../src/components/dashboard/weekly-total.test.tsx) | İzinli günün cetveldeki sırası ve dolgusuz durumu, normal kapalı günlerin gizlenmesi, izinli çalışma süresinin görünürlüğü ve toplamda korunması; geçmiş hafta cetvelinin kapalı kalması; bugünün ayrışması ve gelecek günün planlanan süre etiketi; Çalışılan/Hedef ayrımı, kayıtsız ve belirsiz günün uyarısı, bilinen belirsiz sürenin korunması |

### Haftalık cetvelden güne geçiş

[Plan düzenleyici testi](../src/components/plan-editor.test.tsx), cetvelden gelen gün bugünden farklıysa o günün seçildiğini doğrular. Geçiş, kaydırma, dokunma ve odak dönüşü aşağıdaki tarayıcı kabulünde kontrol edilir.

Tarayıcı kabulü:

1. Güncel haftanın geçmiş bir gününü cetvelden seçin → giriş–çıkış raporundaki aynı gün açılır, odaklanır ve görünür alana kayar. Günü kapatıp tekrar seçin; yeniden açılmalıdır. Kayıtsız ve belirsiz geçmiş günlerde de kendi kayıt durumu görünmelidir.
2. Bugünü veya gelecek bir günü seçin → Mesai planı o gün seçili açılır. Bugünün çıkış kaydı varsa da plana gidilmelidir. İzinli gelecek günü seçin; izin durumu korunmalıdır. Modalı kapatın → odak cetveldeki kaynak güne dönmelidir.
3. Tab ile günler arasında ilerleyin → tek odak durağı ve bilgi tooltip'i görünür. Enter/Space doğru geçişi yapmalıdır. Dokunmatik cihazda ilk dokunuş geçişi yapmalı; ikinci dokunuş gerekmemelidir. Raporu kapalı bırakıp saatin ilerlemesini bekleyin → gün yeniden açılmamalı ve sayfa kaymamalıdır. Azaltılmış hareket tercihinde kaydırma anlık olmalıdır.

### Planlayıcı etkileşim kabulü

Planlayıcı düzenini haftalık plan modalında masaüstü ve dar ekranda doğrulayın. Beklenen sonuçların sahibi [haftalık saat seçimi sözleşmesidir](rules/work-plan.md#haftalık-girişçıkış-saati). Aşağıdaki zincir doğrulama yöntemidir; otomatik test tablosu tarayıcı kabulünün yapıldığını belirtmez.

1. Modalın adı Mesai planı, genel şablon sekmesi Çalışma düzeni, bu sekmenin toplamı Haftalık süredir. Haftalık sekme güncel haftada Bu hafta, diğer haftalarda Seçili hafta ve tarih aralığını gösterir. Haftalık hedef, beklenen toplam ve fark varsa Hedefe kalan/Hedefi aşan aynı çerçevesiz özette görünür; süreler sağa hizalıdır. Dar ekranda etiketler kaybolmaz. Eksik toplamda Tamamla, fazla toplamda Ayarla yazan ana eylem nötr alt alanda vurgulu kalır. Gerçekleşmiş ve elle kilitlenmiş günler nötr zemin ve kilit ikonuyla, seçili gün lavanta zemin ve mor kenarlıkla ayrışır. Tab ile odaklanan seçili olmayan günün zemini nötr kalır. Modalı açın → Planlayıcı, İzin/Kilitle eylemlerinin sağındadır ve bölümü kapalıdır. Bölümü açın → “[saat]’te girersem” veya “[saat]’te çıkmak için” doğrudan görünür; saat bölümü odaklanır ve karşı saat cümlenin sağa hizalı sonucu olarak kalır. Saat/dakika bölümlerinin çevresindeki boşluğa tıklayın → en yakın bölüm odaklanır ve seçilir. Masaüstü ve dokunmatik hedef boyutlarını [DESIGN](../DESIGN.md#gezinme-ve-kontroller) ile karşılaştırın.
2. Gereken süre 8 saatken `6`, `3`, `0` yazın → saat `06:30`, “14:30’da çıkarım” önizlenir; ilk rakamdan sonra dakika bölümü aktiftir. “Çıkmak için” seçip `18:00` girin → “10:00’da girmeliyim” görünür. “Girersem” seçip saati değiştirin; `1`, `8` yazın → `18` tamamlanana kadar saat bölümü aktiftir. `9:00`, `09:00` veya `0900` yapıştırın → “17:00’de çıkarım” önizlenir. Enter → değer kaydedilir, alan görünür kalır. Gruptan odak çıkışı → değişen değer kaydedilir, alan `09:00` olur; dışarıda tıklanan kontrol yer değiştirmez. Grup içindeki girersem/çıkmak için düğmesine geçmek kayıt oluşturmaz. Saat ve dakikayı ayrı silip yeniden yazın; boş dakikada Backspace ve sol ok saate dönmelidir. Saatte `1` ardından `:` → `01:––` olur; eksik dakika kayıt oluşturmaz.
3. Geçerli saatin saat bölümünde ↑ / ↓ → bir saat; dakika bölümünde → bir dakika değişir ve aynı bölüm seçili kalır. `06:59` ↑ → `07:00`, `00:00` ↓ → `23:59`; önizleme güncellenir. Boş veya eksik alanda oklar değer oluşturmaz. `12983`, harf, `24:00` veya `12:60` yapıştırın → giriş reddedilir, önceki taslak ve kayıtlı seçim korunur. Eksik `09:` taslağında Enter ile kaydetmeyi deneyin → hata görünür ve kayıt korunur. Kaydedilmemiş değişiklikte Escape → kayıtlı saat alanına döner ve saat bölümü seçilir; değişiklik yokken Escape → bölüm kapalı. Temizleme düğmesi → yalnız o günün saat seçimi kaldırılır.
4. `00:00`, `23:59` ve gece yarısını aşan 20:00 + 8 saat örneğini kontrol edin → sırasıyla geçerli saatler ve Perşembe için 04:00 sonucunun altında “Cuma çıkarım” görünür. Çıkış 06:30 ve süre 8 saat → 22:30 altında “Çarşamba girmeliyim” görünür. Pazartesi günü önceki güne düşen girişte Pazar adının göründüğünü kontrol edin. Sonuç iki satırda kalır; sayısal gün farkı gösterilmez.
5. Gün değiştirip geri dönün, modalı kapatıp açın → bölüm kapalı başlar. Kaydedilmiş saati aynı gün/haftada yeniden açın; başka gün ve haftanın seçiminin korunmasını, sayfa yenilemesini ve depolama hatasında son başarılı kaydın korunmasını kontrol edin. Planı sıfırla başarılıysa bölümün kapandığını doğrulayın.
6. Gün eylemleri İzin → Kilitle → Planlayıcı sırasındadır. İzin seçildiğinde yalnız soldaki düğme İzinli gösterir; aynı düğme izni kaldırır. Sağdaki süre alanı boş kalır ve minimum yüksekliği korunur. Kilit ikonu seçildiğinde vurgulu kapalı kilit, süre alanında kilit ikonlu sabit süre görünür. Aynı ikon düzenlemeyi yeniden açar; açıklaması ve erişilebilir adı Süreyi kilitle / Kilidi aç olur. İkon düğmesinin ölçüsü ve süre alanının yüksekliği durum değişiminde korunur. Manuel kilitte bölüm açılamaz; tamamlanmış, izinli/kapalı günlerde ve Çalışma düzeni sekmesinde görünmez. Farklı süreli başka açık gün varken Açık günlere uygula, süre kontrolünün altında sağa hizalı görünür. Tıklama sonrasında mor zemin oluşmaz; Tab ile odaklanınca kenarlık ve alt çizgi görünür. Seçili gün kilitliyken toplu uygulama kullanılabilir kalır. Dar ekranda kontrollerin sığmasını ve klavye odağının görünmesini kontrol edin.

## Tarayıcı ve gerçek kaynak

[Mesaim demosu](demo.md) ortak bileşenleri örnek kayıtlarla incelemek içindir. Arayüz kabulünü ilgili senaryoyu seçip işlem ve sonuç metinlerini, boş/hata durumlarını ve dar ekran yerleşimini tarayıcıda kontrol ederek yapın. Gerçek PDKS erişimi ve kurum kapasitesi için hedef kurum ortamında kaynak kabulünü yapın.

Gerçek kaynak ve dağıtım kabulünde kurum ağı, kullanıcı hesabı ve hedef çalışma ortamı kullanılır. `/api/health` uygulamanın ayakta olduğunu gösterir. PDKS bağlantısını gerçek giriş ve rapor isteğiyle kontrol edin.

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
| Windows ZIP üretimi | `bun test ./scripts/electron/archive.test.cjs`; .NET ZIP çıktısının sistem aracı ve .NET ile açılması, Unicode dosya/klasör adları ve içerik, gizli dosyalar, boş klasörler, `.zip.partial` ve mevcut hedefin korunması |
| Windows sunucu ASAR'ı | `bun test ./scripts/electron/pack-server.test.cjs`; beklenmeyen Next girişinde kaynağı koruyarak durma. Sunucunun bağımlılık/statik dosyalarıyla çalışması ve kapanması gerçek paket açılış kabulünde; eski paketten güncelleme dağıtım kabulünde doğrulanır. |
| Güncelleme arayüzü | Güncel standalone sonrasında `bun scripts/electron/update-demo.cjs --verify`; [senaryolar](desktop.md#güncelleme-bildirimini-deneme) |
| Sürüm geçmişi | Masaüstü ve 390 px genişlikte menü ile açılış, footer sürümünün kendi durağına gitmesi, beş dokunuşluk sürüm notunun korunması ve kullanıcı odağı değiştirdiğinde sayacın sıfırlanması, güncelleme modalının hedef sürümü açması, klavye odağı, açık/koyu tema ve public katalog kesildiğinde paket geçmişine dönüş |
| Bildirim arayüzü ve IPC | Güncel standalone sonrasında `bun scripts/electron/notification-demo.cjs --verify`; sağlayıcılar fixture'dır |
| Bildirim zamanlaması ve tercih sıfırlaması | `bun test src/domain/rules/notifications.test.ts src/desktop/notification-runtime.test.ts src/desktop/notification-store.test.ts src/desktop/install-notifications.test.ts`; sahte saat/sağlayıcı ve geçici disk kaydı. Beklenen davranış [bildirim sözleşmesinde](rules/notifications.md#gönderim-ve-hesap-ayrımı). |
| Sistem panosu | Önce `bun run desktop:prepare`, ardından `bun scripts/electron/clipboard-smoke.cjs --isolated-desktop`; panoyu değiştirdiği için yalnız izole CI/VM masaüstünde |
| Electron motor geçişi | Gerçek önceki/yeni paketlerle [motor geçişi kabulü](desktop.md#motor-geçişi-kabulü) |

Genel paket/kurulum kabulleri `POFIS_TEST_BLOCK_ANALYTICS=1` ile Google trafiğini engeller; loopback erişimi sürer. GA4 alanları ve hesap kimliği [ölçüm testlerinde](analytics.md#doğrulama) sahte `window.dataLayer` ile doğrulanır.

Sürüm geçmişinin veri ve yayın kontrolleri: `bun test src/domain/changelog.test.ts src/app/api/changelog/route.test.ts ./scripts/electron/prepare-site.test.cjs ./scripts/electron/publish.test.cjs`. Geçerli takvim tarihi, sürüm sırası, public katalogda aynı/yeni sürüm seçimi, eski/bozuk katalog ve ağ hatasında paket geçmişi, hazırlanan katalog değiştirilince yayından önce reddetme sınanır. Ağ yanıtları fixture, dosyalar geçici dizindir; bu sonuç canlı Cloudflare yayını veya paketli Electron gezinme kabulü sayılmaz.

Windows kapanış testleri izole kurulumdaki süreci sonlandırıp dış sürecin korunduğunu doğrular. macOS fixture testleri sistem işlemlerini taklit eder; native kabul gerçek `osascript`, ZIP ve uygulama süreçlerini kullanır. Gatekeeper, sistem izinleri, bildirim görünümü ve gerçek PDKS akışını hedef cihazda doğrulayın.

## Linux ve ortak Unix installer kabulü

Ortak installer testleri: `bun test ./scripts/electron/unix-installer.test.cjs ./scripts/electron/install-macos.test.cjs ./scripts/electron/install-linux.test.cjs`. Windows’ta POFIS_TEST_BASH Git Bash yolunu, POFIS_TEST_PYTHON Python executable yolunu gösterir; Linux’ta sistem Bash/Python 3 kullanılır. Platform seçiminde karşı işletim sisteminin kodunun çalışmadığı, argüman ve hata kodu korunumu, güvenli arşiv açma, sürüm politikası, yeni pencere hatasında geri alma ve profil koruyan kaldırma izole fixture’larda sınanır. Python fixture’ları Linux süreç/anahtarlık kabulü sayılmaz.

Linux paketi mevcut macOS runner’ında ortak standalone çıktısıyla üretilir; statik kabulün kapsamı [yayın rehberindedir](release.md#cache-ve-süre-ölçümü). Ayrı Linux runner çalıştırılmaz. macOS üzerinde `bun scripts/electron/linux-static-check.cjs <linux-paket-klasörü>` paketin dosya/mimari/izin sözleşmesini kontrol eder; bu sonuç Linux açılış veya anahtarlık kanıtı değildir.

Native kabul için Ubuntu 24.04 LTS x64 cihazı veya izole VM kullanın. Paket çıktısını `dist/linux/Pofis-linux-x64-<kimlik>` altına, sürüm arşivini ve manifesti `dist/releases/linux/x64` altına alın. Kaynak bağımlılıkları ve Electron Linux runtime’ı da kurulmuş olmalıdır. Xvfb, oturum D-Bus’ı, GNOME anahtarlığı ve masaüstü kütüphanelerini hazırlayın. [AppArmor kabul hazırlığı](../scripts/electron/linux-ci.cjs), `bun scripts/electron/linux-ci.cjs sandbox --isolated-desktop` açık seçeneğiyle yalnız izole Ubuntu ortamında bu checkout’un test executable yollarına izin verir; normal kullanıcı kurulumunu installer yönetir.

Aynı D-Bus/anahtarlık oturumunda önce `bun scripts/electron/smoke.cjs <linux-paket-klasörü>`, ardından `bun scripts/electron/linux-distribution-test.cjs --site ../pofis-landing` çalıştırın. Dağıtım kabulü gerçek Electron/Next paketiyle kurulum ve güncelleme zincirini sınar; terminal yanıtları ve önceden yüklenen AppArmor profili test sınırıdır. `bun scripts/electron/notification-demo.cjs --verify` gerçek anahtarlığı kullanır; Telegram sağlayıcısı ve yerel bildirim görüntüleyicisi fixture’dır. Bildirim kabulünde sıfır çıkış kodu ve tamamlanma mesajı birlikte aranır. GNOME tepsisi, sistem bildirimi, ilk AppArmor onayı ve gerçek PDKS oturumu hedef Ubuntu cihazında ayrıca doğrulanır; [destek kapsamı](desktop.md#ubuntu-2404-lts-x64-ve-ortak-unix-kurulumu).

## Sonuçların yönetimi

Her sonucu kullanılan kaynak, paket ve ortamla birlikte bildirin. Motor geçişini gerçek önceki/yeni paketlerle, pencere ve kurulum davranışını hedef işletim sisteminde doğrulayın. Statik paket kontrolü dosya/mimari sözleşmesini, fixture testi kendi senaryosunu kanıtlar.

Sonucu ve kanıtın sınırlarını kullanıcıya bildirin. Tamamlanan doğrulamaların rapor, ekran görüntüsü ve ölçüm çıktılarını temizleyin. Geçerli ürün kararlarını ilgili sözleşmeye, açık bulguları görev listesine taşıyın. Davranış testleri ve demo üzerinden elle tarayıcı kabulü doğrulama yönteminin parçasıdır.


## Pofi Mini kabulü

Paketli senaryo kabulü, açık Mini'de diğer pencerenin tema ve plan değişikliğini, odak göstergesini ve yatay taşma sınırını doğrular. Sabitlenmiş panel art arda üç kez çağrıldığında görünür, odakta ve aynı konumda kalmalıdır. İlk açılışın native `show` süresini, aynı pencerenin beş tekrar açılış çağrısını ve gizli renderer'ın iki saniyelik `app.getAppMetrics()` CPU/working-set örneğini yazdırır. Tekrar açılış ölçümünde dış odak değişimlerini ayırmak için panel geçici sabitlenir; her örnekten önce native kapatma isteğiyle gizlenir. Bu ölçümler boyanmış ilk kareyi, uzun süreli bellek kararlılığını veya başka bir işletim sisteminin performansını kanıtlamaz. Aynı paket klasöründen sonra `--capture` eklemek açık/koyu Mini görüntülerini `dist/electron/checks/preview` altına alır; inceleme sonunda temizle.

[Paketli senaryo modu](desktop.md#paketli-senaryo-modu), mesai gününü beklemeden native kabul girdisi sağlar. `bun test ./src/desktop/scenario-runtime.test.ts ./electron/scenarios.test.cjs ./src/data/work-plans.test.ts` ortak saat, gerçek hesaplara verilen girdiler, plan revizyonu, HTTP izolasyonu, geç yanıt, native menü ve IPC yetkisini sınar. Güncel paket sonrasında `bun scripts/electron/scenario-acceptance.cjs <paket-klasörü>` ayrı geçici profilde gerçek Electron/standalone ana pencere ve Mini zincirini çalıştırır; fixture dışı API ile dış HTTP erişimini, sekiz senaryonun seçimini, bağlantı/oturum toparlanmasını ve kapanışı doğrular. Senaryo hesabı ve profili gerçek PDKS'e erişmez; geçici profil kabul sonunda temizlenir. macOS menü çubuğu hizalaması ve Spaces davranışı hedef cihazda elle kontrol edilir.

[Mini pencere davranış testleri](../electron/mini-window.test.cjs) konum, tek pencere, sabitleme, kapanış ve IPC gönderen doğrulamasını sınar. İlk açılışta tek yükleme, tekrar açılışta gezinmeden gösterme, yükleme/renderer hatasından sonra toparlanma, hızlı aç/kapat, ekran değişiminde sınırlandırma, dinleyici temizliği, yüklemede gizleme ve durdurma da kapsanır. macOS Spaces API çağrısı taklit adaptörle denetlenir. [Arka plan testleri](../electron/background.test.cjs) sol/sağ tıklama, ana pencereyi gösterme ve gerçek çıkış ayrımını doğrular.

[PDKS yaşam döngüsü testi](../src/data/pdks-lifecycle.test.ts), gerçek React hook'unu izole Electron renderer'ında sahte HTTP/köprü yanıtlarıyla çalıştırır. HTTP/olay yarışı, eski/eşit zamanlı rapor, arka plan hatası ve toparlanma, tekrar görünürken tek doğrulama, hafta/hesap değişimi, gecikmiş oturum yanıtı ve abonelik temizliği denetlenir. Gerçek PDKS veya kullanıcı profili kullanılmaz. [Saat testleri](../src/data/clock.test.ts) gizliyken timer kurulmadığını ve görünürlük dönüşünde gerçek zamana geçildiğini doğrular.

İlk yükleme sırasında çöken Mini'nin geciken yükleme sonucu yeni pencereyi gösteremez, kapatamaz veya yükleme durumunu temizleyemez. [Pencere testi](../electron/mini-window.test.cjs) eski yüklemenin başarı ve hata sonuçlarını yeni açılış ve hızlı tıklamalarla birlikte sınar.

[Bildirim adaptörü testleri](../src/desktop/install-notifications.test.ts) rapor, hesap geçişi ve oturum bitişinin Mini'ye iletilmesini ve Mini'nin yalnız yenileme çağırabilmesini doğrular. [Plan depolama testleri](../src/data/work-plans.test.ts) diğer pencerenin değişikliğini, canlı/demo ayrımını, temizleme olayını, bozuk kaydın korunmasını ve abonelik temizliğini sınar. [Mini sunum testleri](../src/components/mini/mini-dashboard.test.tsx) saniyeli hedef/kalan/aşan süreyi ve yükleniyor/bağlantısız/hata ayrımını gerçek bileşeni statik sunarak kontrol eder; React effect yaşam döngüsünü ve CSS yerleşimini kanıtlamaz.

Paketli [smoke testi](../scripts/electron/smoke.cjs) gerçek Mini penceresinin açılışını, sabitleme düğmesini, IPC köprüsünü ve ana ekrana dönüşü sınar. Paket kabulleri elle başlatılan [sürüm akışının](../.github/workflows/desktop-release.yml) parçasıdır. Bu kontroller gerçek menü çubuğu görüntüsünün görsel kabulünün yerine geçmez.

- Windows'ta tray sol tık → Pofi Mini, sağ tık → seçenekler; ana uygulama kapatılıp yeniden açıldığında mesai/planın güncellenmesi.
- macOS'ta menü çubuğu sol tık → Pofi Mini, sağ tık → eylem menüsü; başlıktan sürükleme, dışarı tıklama → gizlenme, sabitleme → görünür kalma, Dock eylemleri ve `CommandOrControl+Shift+P`. Sabitlenmiş paneli taşıyıp simgeye art arda tıkla → panel konumunu koruyarak açık kalır ve odaklanır; kısayol ve menü eylemi aynı sonucu verir. Sabitlemeyi kaldır → simge ve kısayol paneli açıp kapatır.
- macOS'ta hedef çıkışa geri sayım, hedef aşıldığında `+` işareti, çıkış kaydında/oturum kapanışında silinme, gün değişiminde silinme ve "Hedefe kalan süreyi göster" seçeneğinin kapatılıp yeniden başlatılınca korunması.
- PDKS girişi yok, rapor hatası, belirsiz kayıt, mesai öncesi, canlı mesai, çıkış sonrası, hedef aşımı ve hafta değişimi → panelin mevcut iş kurallarıyla aynı bilgiyi sunması.
- Mini sabit açıkken ana pencerede plan değiştir → hedef ve haftalık toplam yeniden açmadan güncellenir. Yeni turnike raporu → Mini aynı kaydı gösterir. Çıkış/hesap değişimi veya oturum bitişi → eski rapor temizlenir; geciken yanıt geri getiremez. Yeni giriş → yeni hesabın raporu gösterilir.
- Bozuk plan kaydı veya erişilemeyen depolama → yükleniyor yerine hata ve ana pencereye dönüş görünür. Hedef `16:00:17`, saat `16:00:00` → kalan `17 sn` görünür. Günlük hedefe ulaşıldığında tamamlanma özeti ve süre görünür; belirsiz veya güncel olmayan kayıt tamamlanmış sayılmaz.
- İzinli/kapalı gün → planlı mesai yok özeti ve haftalık toplam görünür; boş günlük hedef alanları gösterilmez. Plan dışı çalışma varsa süre korunur. Haftalık hedefe eksiksiz kayıtlarla ulaşıldığında tamamlanma metni görünür.
- Mesai → hedef tamamlandı → izin → hata/bağlantısız geçişlerinde panel içeriği ölçülür; pencere büyür/küçülür, ana eylemin altında gereksiz boşluk kalmaz. Açık/koyu temada günlük ve haftalık alanlar kart çerçevesi olmadan görünür. Sabit açık paneli sürükle → içerik yüksekliği değişince konumu korunur; ekran sınırında büyürse çalışma alanına alınır. Kısa ekranda yükseklik sınırlanır ve uzun içerik kaydırılarak okunur. Yabancı pencere/alt frame/origin ve geçersiz yükseklik IPC'de reddedilir.
- Oturum açılışında başlatma varsayılan kapalı kalır, menüyle açılıp kapatılır, gerçek macOS oturum açılışıyla doğrulanır.
23 Ekim 2026 itibarıyla [PR #1'in son tam kabul koşusu](https://github.com/bugjardotdev/Pofis/actions/runs/39967421826) Apple Silicon, Intel macOS ve Windows'ta başarılıdır. Bu koşudan sonraki ana dala uyarlama ve dokümantasyon güncellemesi, Actions kotasını korumak için `[skip ci]` ile taşınır; yeni PR başının ayrıca CI'da doğrulandığı anlamına gelmez. Gerçek Mac'te menü çubuğu ve Spaces gibi görsel/işletim sistemi kabulleri henüz yapılmamıştır.
