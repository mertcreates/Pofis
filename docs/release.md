# Pofis sürüm yayını

Ana uygulama deposu private kalır. [Release workflow'u](../.github/workflows/desktop-release.yml), public `mertcreates/pofis-landing` deposunun GitHub Releases bölümüne paketleri aktarır; installer, manifest ve manuel sürüm geçmişini bu deponun `main` dalına gönderir. Cloudflare Workers Git entegrasyonu siteyi yayımlar. Uygulama kaynak deposu Cloudflare'a bağlanmaz.

Linux hedefi için ortak macOS / Ubuntu sekmesi ve güncel doğrulama betiği landing kaynaklarında bulunmalıdır. Begin işi, paket üretiminden ve taslak oluşturmadan önce ortak Unix/Windows komut sözleşmesini kontrol eder. Landing kaynakları eskiyse önce bunların kullanıcı yetkisiyle yayımlanması gerekir; release yalnız aşağıda tanımlanan public dağıtım dosyalarını günceller.

Begin işi landing `main` dalının güncel commit'ini seçip tüm işlere sabitler; landing kaynak değişiklikleri sürümü durdurmaz. Prepare ve publish adımları çalışma kopyasındaki değişiklikleri yalnız yedi üretilen public dosyayla sınırlar. İçerik kataloğu veri nesnesi olarak okunur; yayın token'ıyla landing modülü çalıştırılmaz. Tüm action referansları tam commit SHA'sına sabitlenir.

## Bir kez yapılacak kurulum

1. Bağımsız landing projesinin incelenmiş içeriğini `mertcreates/pofis-landing` public deposunun `main` dalına yayımla. Paket arşivlerini GitHub Releases varlıklarında tut.
2. GitHub'da yalnız bu public depoya erişen, **Contents: read and write** yetkili fine-grained PAT oluştur. Private uygulama deposunda Settings → Secrets and variables → Actions → Repository secrets altında **POFIS_RELEASE_TOKEN** adıyla secret ekle. Workflow token'ı bu repository secret üzerinden okur. Yayın workflow'u ve betik yalnız `master` dalında elle başlatılan çalıştırmayı kabul eder; token süresi veya depo koruma kuralları yayını durdurabilir.
3. [Cloudflare Workers bağlantısı](#cloudflare-workers-bağlantısı) yalnız public landing deposunu yayımlar. `pofis.app` bağlantısı hazırdır; release mevcut Git entegrasyonunu kullanır.
4. Private depoda GitHub Actions kullanımını aç. Ücretli kullanımı engelleyen bütçe sınırını yapılandır. Actions kotasını ve macOS runner tüketimini GitHub kullanım ekranından izle. Paketleri sürüm varlıklarında sakla.
5. Bu depodaki incelenmiş workflow ve betikleri `master` dalına gönder. Bu kurulum adımlarını ilgili GitHub ve Cloudflare hesaplarında tamamla.

## Landing geliştirme ve dağıtım hazırlığı

Public landing README'si Pofis'i kısa bir ürün tanıtımı, slogan ve site bağlantısıyla sunar. Landing'in teknik işletim bilgileri bu rehberde tutulur.

Yan yana duran `Pofis/` ve `pofis-landing/` yerleşiminde landing projesinde Bun 1.4.3 ile `bun install --frozen-lockfile`, `bun run dev`, `bun run typecheck` ve `bun run build` kullanılır. Geliştirme adresi `http://localhost:3001`, statik yayın çıktısı `out/` dizinidir. Next.js static export çıktısını Cloudflare Workers sunar.

Build, dağıtım girdilerini ve üretilen statik dosyaları doğrular: manifest biçimi, paket adresinin hedef GitHub deposuna ait olması, siteye yanlışlıkla ZIP/tar.gz/EXE/özel dosya konması ve statik dosya sınırı kontrol edilir. Canlı paketin yayımlandığı ayrıca doğrulanır. Ana uygulamadan installer ve manifest hazırlama komutlarının sahibi [masaüstü rehberidir](desktop.md).

## Cloudflare Workers bağlantısı

Cloudflare Workers, public landing deposunun `main` dalını `pofis.app` adresinde yayımlar.

Build komutu `bun install --frozen-lockfile && bun run build`, statik çıktı `out/` dizinidir. Release otomasyonu ana uygulama deposunda, site yayını Workers Git entegrasyonunda çalışır.

Landing'in `public/_headers` dosyası installer, manifest ve sürüm geçmişine `Cache-Control: no-store` uygular. Sürüm geçmişi ayrıca `application/json` ve `X-Content-Type-Options: nosniff` başlıklarıyla sunulur. Canlı HTTPS kabulü bu başlıkları doğrular. Uygulama ZIP'leri GitHub Releases üzerinden sunulur.

Paketli Electron uygulaması açılışta bu manifestlerden kendi hedefine ait olanı kullanır. Yeni sürüm bildirimi ve kurulum komutunu kopyalama davranışı [masaüstü sözleşmesinde](desktop.md#açılışta-sürüm-denetimi) yönetilir.

## Sürüm ve manifest

Uygulama sürümünün sahibi [package.json](../package.json) dosyasıdır. Yeni paket içeriği yeni bir `x.y.z` sürümüyle yayımlanır; landing projesinin paket sürümü bundan bağımsızdır.

Public `latest.json` dosyaları ve footer'daki uygulama sürümü yayımlanmış paketlerden üretilir. İlk yayın manifesti oluşturur; sonraki yayınlarda mevcut manifest üzerinden sürüm düşürme koruması uygulanır. Otomasyon dört doğrulanmış paketten gerçek manifestleri üretir; bu dosyalar yalnız paketler anonim indirilebildikten sonra canlıya gönderilir.

Installer sürüm düşürmez. Daha yüksek sürümlü bir geliştirme paketinden düşük sürüme geçiş gerekiyorsa önce normal kaldırma yolu kullanılır; kullanıcı profili korunur.

### Uygulama içi sürüm geçmişi

[Manuel katalog](../src/data/changelog.json), uygulamadaki **Sürüm geçmişi** ekranının tek içerik sahibidir. Yalnız yayımlanacak veya daha önce yayımlanmış sürümleri yeniden eskiye taşır; her kayıtta sürüm, yayın tarihi ve en az bir **Yenilikler**, **Düzeltmeler** veya **Bakım** maddesi bulunur. Metinler kullanıcıya yönelik doğal Türkçeyle elle yazılır; commit geçmişinden veya GitHub Release gövdesinden üretilmez.

Yeni sürüm hazırlanırken `package.json` ile kataloğun ilk kaydı aynı sürüm olmalıdır. Tarih `YYYY-MM-DD` biçiminde geçerli bir takvim günüdür; hazırlıkta planlanan tarih yazılır ve yayın başka güne kalırsa yayımdan önce güncellenir. Geçmiş kayıtlar Git geçmişi ve gerçek yayın bilgileriyle karşılaştırılarak elle düzenlenir; küçük değişiklikler kullanıcıya etkisine göre birleştirilir.

Yeni özellik yayımlanmadan önce yapılan düzeltmeleri özelliğin son hâliyle birlikte anlat. Düzeltmeler bölümüne önceki yayımlanmış deneyimdeki sorunları al; iç test araçlarını ve uygulama ayrıntılarını kullanıcıya etkisi yoksa kataloğa ekleme.

Begin sürüm eşleşmesini ve katalog biçimini taslak oluşturmadan önce doğrular. Prepare kataloğu `public/releases/changelog.json` yoluna kopyalar; publish hazırlanan dosyanın kaynakla tam eşleşmesini sürümü yayımlamadan önce kontrol eder. Canlı HTTPS kabulü de aynı içerikle birlikte yukarıdaki başlıkları doğrular.

Sürüm geçmişini destekleyen uygulamalar `/api/changelog` üzerinden public kataloğu okur. Public kataloğun ilk sürümü paket kataloğundaki ilk sürümle aynı veya daha yeniyse public içerik kullanılır. Daha eski katalog, ağ veya içerik hatasında paketle gelen geçmiş korunur. Menü en yeni kayıttan, footer uygulamanın kendi sürümünden, güncelleme modalı hedef sürümden açılır; hedef kaydı bulunamazsa geçmişin başı gösterilir.

Bu katalog GitHub Release açıklamasından ayrıdır. Aşağıdaki otomatik notlar public GitHub sürüm sayfasını; manuel katalog uygulama içindeki kalıcı geçmişi yönetir.

### Otomatik sürüm notları

Sürüm taslağı oluşturulurken [not üreticisi](../scripts/electron/release-notes.cjs), public depoda en son yayımlanan kararlı sürümün `Kaynak commit` değeri ile çalıştırılan `GITHUB_SHA` arasındaki Git geçmişini okur. Begin işi bu karşılaştırma için tam kaynak geçmişini alır; diğer işler mevcut checkout kapsamını korur. İlk yayında mevcut geçmiş kullanılır. Önceki sürümün kaynak kimliği yoksa, commit erişilemiyorsa veya yeni commit'in atası değilse yayın hazırlığı açıklayıcı hatayla durur.

Notlar **Yenilikler**, **Düzeltmeler**, **Performans ve bakım** başlıklarında toplanır; boş bölümler gösterilmez. Ayrıştırıcı mevcut geçmişteki `feat(pofi): …`, `fix: …`, `perf: …`, `refactor: …` biçimlerini ve `Add …`, `Support …`, `Fix …`, `Refine …`, `Improve …` gibi serbest başlıkları tanır. Conventional önekleri kaldırılır; `!` uyumluluk değişikliği olarak belirtilir. Tekrarlar bölüm içinde tekilleştirilir. CI, test, dokümantasyon, sürüm artırma ve iç paketleme/runtime başlıkları elenir; tanınmayan başlıklar otomatik aktarılmaz. Başlıklar çevrilmez veya anlamları yeniden yazılmaz; commit gövdeleri public notlara eklenmez.

Bir commit için Türkçe, kullanıcıya yönelik metin vermek veya otomatik sınıflandırmayı değiştirmek için commit gövdesine şu satırları ekle. Bu satırlar o commit'in başlığının yerini alır; birden fazla not eklenebilir. `chore` notları performans ve bakım bölümüne gider.

```text
Release-note: feat: Masaüstü ve Telegram için isteğe bağlı mesai hatırlatıcıları eklendi.
Release-note: fix: Haftalık plan toplamları düzeltildi.
Release-note: perf: Uygulamanın açılışı hızlandırıldı.
```

Bir başlığı sürüm notlarından çıkarmak için tek satır `Release-note: skip` kullan. Hatalı `Release-note:` biçimi hazırlığı durdurur. Metin düz Markdown metni olarak kaçışlanır. Uygun not yoksa ilk yayında başlangıç metni, sonraki sürümlerde ayrıca not eklenmediğini söyleyen kısa metin kullanılır.

Notlar taslakta bir kez üretilir. Aynı sürüm ve kaynak commit ile tekrar çalıştırmak mevcut notları korur. Kaynak doğrulaması sürüm etiketi ve otomasyonun kaynak commit alt bilgisi üzerinden yapılır; açıklamanın kullanıcıya yönelik kısmı düzenlenebilir. Alt bilgiyi koru. Not üretimi yerel Git kullanır; ek servis veya token gerektirmez.

## Yayın sonrası HTTPS kabulü

1. `https://pofis.app/` sayfasını, macOS / Ubuntu ve Windows PowerShell sekmelerini, iki komutu ve kopyalama düğmesini kontrol et. macOS/Ubuntu ortak komutu: `curl -fsSL https://pofis.app/install.sh | bash`.
2. `https://pofis.app/install.ps1` ve `https://pofis.app/install.sh` düz metin ve UTF-8, dört `https://pofis.app/releases/<hedef>/latest.json` adresi JSON dönmeli. Installer ve manifestlerde `Cache-Control: no-store` bulunmalı; içerikler beklenen dosyalarla eşleşmeli. `https://pofis.app/releases/changelog.json` içeriğini ve başlıklarını [katalog sözleşmesine](#uygulama-içi-sürüm-geçmişi) göre kontrol et.
3. Public manifestlerdeki dört paket arşivini (Windows/macOS ZIP, Linux tar.gz) anonim indir; boyut ve SHA-256 değerlerini karşılaştır.
4. Windows'ta `irm https://pofis.app/install.ps1 | iex` komutuyla kurulum → otomatik açılış → simgeden açılış → aynı komutla güncel sürüm kontrolünü tamamla. Yeni sürümde [onaylı kapanışın](desktop.md#açık-uygulamada-onaylı-güncelleme) iptal, normal kapanış ve ayrı zorla kapatma onayını; veri koruma, eski sürüm temizliği ve kaldırmayı doğrula. macOS'ta aynı kapanış zincirini `curl -fsSL https://pofis.app/install.sh | bash` üzerinden doğrula.

Bu adımlar canlı hosting ve paket yayını sonrasında uygulanır. Yerel hazırlığın kanıt sınırı aşağıda açıklanır.

## Bir sürüm yayımlama

1. `package.json` sürümünü yeni `x.y.z` değerine getir; [manuel kataloğun](#uygulama-içi-sürüm-geçmişi) ilk kaydını aynı sürüm ve yayın tarihiyle hazırla. Değişiklikleri inceleyip `master` dalına gönder.
2. GitHub → Actions → **Pofis sürümünü yayımla** → Run workflow; `master` dalını seç. Sürüm, çalıştırılan commit'in `package.json` dosyasından otomatik alınır ve tüm platformlara aktarılır.
3. Akışın tür kontrolü, testler ve platform paket kabullerini tamamlamasını bekle. Actions yalnız elle başlatılan bu sürüm akışını çalıştırır. Günlük geliştirme kontrollerini [yerelde](verification.md#yerel-kontroller) çalıştır.

Paket üretimini ve kabul sürelerini ölçmek için **Paketler doğrulandıktan sonra sürümü yayımla** seçimini kapat. Bu çalıştırma sürüm taslağı/kurtarma/aktarım ve site yayını adımlarını atlayıp dört paketi yeniden üretir. Süreler Actions adımlarında ve özetinde görünür; normal yayında seçim açıktır.

Ölçüm mevcut `package.json` sürümüyle çalışır; sürüm artırmak gerekmez. İlk kontrol yalnız sürüm biçimini ve `package.json` eşleşmesini doğrular. Yayımlanmış sürümün kaynak commit'ini kontrol eden `publish.cjs` adımları ölçümde çalışmaz. Her job temiz çalışma alanında yeni yerel paket üretir. Workflow değişikliği `master` dalına gönderildikten sonra GitHub arayüzünden seçim kapatılabilir veya şu komut kullanılabilir:

```sh
gh workflow run desktop-release.yml --repo mertcreates/Pofis --ref master -f publish=false
```

Electron sürümü değiştiğinde workflow öncesinde [motor geçişi kabulünü](desktop.md#motor-geçişi-kabulü) hedef cihazlarda tamamlayın. Intel paketi CI'da statik olarak doğrulanır. Yayın seçeneği açık workflow, testten sonra otomatik yayın ve landing push adımlarına ilerler. Dört hedef aynı tam Electron sürümünü kullanır; motor düşürülse de yeni paket daha yüksek Pofis sürümüyle yayımlanır.

| Hedef | Derleme ortamı | Dağıtım dosyası |
| --- | --- | --- |
| Windows x64 | `windows-2022` | `Pofis-<sürüm>-win32-x64.zip` |
| macOS Apple Silicon | `macos-15` | `Pofis-<sürüm>-darwin-arm64.zip` |
| macOS Intel | Aynı `macos-15` runner, ARM64 Bun ve x64 Electron | `Pofis-<sürüm>-darwin-x64.zip` |
| Ubuntu x64 | Aynı `macos-15` runner, ARM64 Bun ve Linux x64 Electron; statik kabul | `Pofis-<sürüm>-linux-x64.tar.gz` |

Dört hedef [aynı build betiğini](../scripts/electron/ci-build.cjs) kullanır. Windows ve ARM64'te pano, gerçek paket/pencere/süreç ve görsel/font kabulü; Windows'ta ayrıca gerçek ZIP ve landing komutuyla installer kabulü çalışır. Intel ve Linux statik kontrolleri aşağıda açıklanır. Paketleyicinin stdout'a yazdığı tam klasör yolu sonraki aşamalara aktarılır. Temiz cihaz kabulünü indirilen paketle hedef cihazda yap.

Paket içeriği, macOS imzalama ve installer davranışı [masaüstü rehberinde](desktop.md#ortak-platform-sözleşmesi) yönetilir. ARM64 installer kabulü gerçek ZIP ile çalışır; Gatekeeper temiz hedef cihazda doğrulanır.

## Cache ve süre ölçümü

Windows ZIP üretimi ve ASAR düzeni [paket sözleşmesinde](desktop.md#ortak-platform-sözleşmesi), kurulum/güncelleme/onarım testlerinin süreç ve arşiv kapsamı [tekrarlanabilir kabulde](desktop.md#tekrarlanabilir-kabul) yönetilir.

Uygulama testleri ve masaüstü testleri eşzamanlı çalışır; ön kontrol süresini en geç tamamlanan kontrol belirler. Masaüstü testleri `--parallel=4` ile en fazla dört test dosyasını birlikte çalıştırır. Windows'ta Next testlerden sonra derlenir; testlerle örtüşmesi küçük runner'larda CPU baskısı ve süreç zaman aşımı ürettiği için bu aşamalar sıralıdır. Bütün kontroller ve Next tamamlanmadan pano kabulü veya paketleme başlamaz. Bildirim ve preload dosyaları standalone derlemesinde bir kez üretilir; pano kabulü ve paketleme hazır çıktıyı kullanır. Her kontrolün hatası paketlemeyi durdurur. Next derlemesi aynı `tsconfig.json` kapsamındaki kaynak ve testlerin tür kontrolünü de yapar; tür hatası paketlemeyi durdurur. Yerel kontrol `bun run typecheck` komutudur.

Paket aktarımı arşiv boyutunu, SHA-256 değerini ve manifesti doğrular; landing dosyalarını yeniden üretmez. Ortak site hazırlığı, hedeflerin aktarımı tamamlandıktan sonra installer ve public manifestleri yazar.

Windows kurulum kabulünde her zincir kendi geçici kurulumunu ve profilini kullanır; 3210 portundaki dış sürecin korunduğu doğrulanır.

Tek Apple Silicon runner kaynakları ve ARM64 Next cache’ini hazırlar. [Koordinatör](../scripts/electron/macos-ci.cjs), ARM64 paket üretimiyle Intel ve Linux çalışma dizinlerinin kilitli bağımlılık kurulumlarını birlikte başlatır. Next bir kez ARM64 Bun ile derlenir; iki x64 paket aynı çıktıyı `POFIS_SHARED_STANDALONE` üzerinden kullanır. [Taşınabilirlik kontrolü](../scripts/electron/standalone.cjs) her ortak sunucu kopyasında native dosyaları reddeder. SWC derleme aracıdır; sharp/libvips masaüstü trace’lerinden çıkarılır. Kaynaklar, Electron kurulumu, landing dosyaları ve süre özetleri hedefler için ayrı tutulur. Bun ve paketleme araçları runner mimarisinde kalır; Electron indirme platformu/mimarisi hedefe göre seçilir. ARM64 paketi taslaktan kurtarıldığında doğrulanmış ZIP bir kez açılır ve sunucu iki hedef için paylaşılır. Kurtarılan hedefler yeniden üretilmez. Üç zincirin tamamı başarılı olunca paket aktarımı başlar.

Intel paketi [statik kontrolden](../scripts/electron/macos-static-check.cjs) geçer: zorunlu dosyalar, tüm Mach-O dosyalarında x86_64, derin imza ve ZIP bütünlüğü doğrulanır. Linux paketi [statik kontrolden](../scripts/electron/linux-static-check.cjs) geçer: kilitli Electron sürümü, ELF64 little-endian x86_64 mimarisi, helper’lar, çalıştırma izinleri, preload/bildirim çıktısı ve taşınabilir sunucu doğrulanır. macOS üzerinde tar.gz üretilir ve arşiv okunabilirliği kontrol edilir; site hazırlığı boyut/SHA-256 ve manifesti doğrular. Linux ikilisi macOS üzerinde çalıştırılmaz. Tür/birim testleri ve gerçek uygulama kabulü Windows ve ARM64’te sürer; Linux ve Intel gerçek cihaz kabulleri ayrıca izlenir. Ubuntu paket açılışı, installer ve bildirim kabulü [doğrulama rehberindedir](verification.md#linux-ve-ortak-unix-installer-kabulü).

`actions/cache` Bun paketlerini ve Electron indirmelerini runner'ın geçici dizininde saklar. Windows ile macOS indirmeleri ayrıdır; macOS indirme cache'i iki macOS mimarisi ve Linux x64 arşivlerini içerir. İndirme anahtarı Bun sürümü, hedef ve kilit dosyasına bağlıdır; aynı bağımlılıklarda commit başına yeniden yüklenmez. Kurtarma tüm hedefler için önce ana çalışma dizininde tamamlanır. Hiçbir hedef yeniden üretilmeyecekse indirme cache'i yüklenmez; Intel/Linux çalışma dizinleri yalnız ilgili hedef yeniden üretilecekse oluşturulur. Next cache'i yalnız native hedef yeniden derlenecekse yüklenir; mimari, Bun sürümü, kilit dosyası ve kaynak commit'iyle anahtarlanır. Next yalnız aynı kilit dosyasıyla önceki commit'ten geri yüklenir. `node_modules`, standalone çıktısı, profil ve dağıtım paketi cache'e eklenmez.

Build betiği aşamaları duvar saatiyle ölçer; alt süreç çıktıları loga anında aktarılır. Electron kurulumu, masaüstü testleri, pano, Next, paketleme/imza, paket kabulü, arşiv/manifest ve installer kabulü ayrı görünür. Paket açılış/statik kontrol ile arşiv üretimi aynı mühürlenmiş paketi okuyarak birlikte ilerler; ikisi tamamlanınca installer kabulüne geçilir. Hatalar aşama süresiyle raporlanır ve aktarımı durdurur. `package` komutu installer kabulü öncesinde durur; `accept` hazır arşivin kurulum kabulünü çalıştırır; `build` ikisini tamamlar. Cache aktarımı, paket zinciri ve yayın sürelerini aynı runner ve kabul kapsamıyla ayrı karşılaştırın.

## Yayın sırası ve hata davranışı

[Yayın betiği](../scripts/electron/publish.cjs):

1. Sürümü, public hedef depoyu, uygulamanın `master` dalını ve sürüm düşürülmediğini doğrular; draft release açar.
2. Windows ve macOS işleri dört hedefin doğrulanmış paketlerini draft'a yükler. macOS koordinatörü iki macOS hedefi ve Linux hedefinin ayrı asset'lerini paralel aktarır; her hedef kendi manifestini en son yükler. Windows `install.ps1`, macOS işi iki mimari için mimariyle adlandırılan `install-darwin-<mimari>.sh` asset'lerini yükler. İki macOS installer'ının aynı canonical kaynakla eşleşmesi doğrulanır; macOS işi Linux hedefi için `install-linux-x64.sh` kaynak asset’ini de yükler. Ortak public installer’ın sahibi [Unix kurulum sözleşmesidir](desktop.md#ubuntu-2404-lts-x64-ve-ortak-unix-kurulumu).
3. Tüm işler başarılıysa `prepare` paketleri tekrar indirip boyut/SHA-256 ile doğrular; dört public manifest, iki installer ve manuel sürüm geçmişi hazırlanır. Yalnız bu yedi küçük dosya bir günlük immutable artifact'e konur. `validate_site` aynı commit ve artifact ile typecheck/static build çalıştırır; bu runner yayın token'ını almaz. Site derleme çıktısı yayın işine aktarılmaz.
4. Temiz `publish` runner'ı aynı commit'i ve `prepare` tarafından üretilen artifact kimliğini kullanır; installer'ları canonical kaynaklarla, manifestleri sürüm asset'leriyle ve sürüm geçmişini kaynak katalogla karşılaştırır. Release yayımlanır. Dört paket arşivi anonim HTTPS üzerinden tekrar indirilip doğrulanır. Ancak bu kontrol geçerse landing değişiklikleri Mert Ercan (`me@mertercan.com`) kimliğiyle commit edilip `main` dalına gönderilir. Git'e yalnız yedi izinli public dosya girebilir; kaynak ve paket arşivi aktarımı reddedilir. Site kodu ayrı runner'da çalıştığı için arka planda kalan süreçler yayın token'ına erişemez. Bu ayrım iki kısa Windows işi ekler; macOS/Linux üretimini çoğaltmaz.
5. Cloudflare commit'i yayımlar. Betik en fazla beş dakika HTTPS landing, dört manifest, iki installer ve manuel kataloğun içerik/başlıklarını kontrol eder; tüm kontroller geçince beklemeden tamamlanır. Installer metni BOM olmadan LF ile hazırlanır; karşılaştırma CRLF/LF farkını yok sayar, gerçek içerik değişikliğini reddeder. Her başarısız denemede bekleme nedeni loga yazılır. Süre dolarsa workflow başarısız olur; mevcut paketi silmez veya başarı göstermez.

Release işlemleri ortak concurrency grubunda sıralanır. Bir build hedefi başarısızsa matrix diğer runner'daki işi iptal eder. Build sonucu başarısız veya iptal olduğunda `cleanup`, aynı sürüm ve kaynak commit'ine ait otomasyon taslağını yüklenen paketleriyle birlikte siler. Yayımlanmış sürümler ve başka kaynak commit'ine ait taslaklar silinmez; silme hatası görünür biçimde işi başarısız yapar. Sonraki denemede **Run workflow** veya **Re-run all jobs** ile tüm akış başlatılır; bu seçim tüm kurtarma ve birleştirme adımlarını çalıştırır. Taslak silinmiş ve sürüm henüz yayımlanmamışsa düzeltme commit'i aynı sürüm numarasıyla yeni taslak oluşturabilir.

macOS koordinatörü ilk hedef hatasında kardeş üretimleri iptal eder, yeni aşama başlatmaz ve çalışan komutların kapanışını bekleyerek özgün hatayı döndürür. İç CI komutları yeni POSIX grupları istemeden üst komutun grubunda çalışır. İptal ve zaman aşımında `/bin/ps` ile komutun PID/üst PID zinciri ve varsa kendisine ait grup takip edilir; `detached` seçeneği tek başına grubun oluştuğuna veya kapandığına kanıt sayılmaz. Kapanış için 15 saniye tanınır, ardından kalan sahipli süreçler zorla kapatılır ve yeniden kontrol edilir. Zombie süreçler çalışır sayılmaz; süreç tablosu veya sinyal hatası görünür biçimde işi durdurur. LaunchServices ile açılan test uygulamasını macOS kabulü ayrıca kendi geçici paketinin tam executable yollarıyla takip eder: normal çıkış ana süreçle yardımcı süreçlerin bitmesini bekler; son temizlik gerektiğinde yalnız bu süreçleri zorla kapatır. Temizlik başarısızsa hata raporlanır ve geçici paket korunur.

Yerel kabul polling'i bekleyen kontrolü de süre sonunda reddeder; HTTP başlık/gövde okumaları iptal edilebilir. CI alt komutları en fazla 10 dakika, paket açılış kabulü 2 dakika, kurulum/güncelleme kabulü 5 dakika çalışır; kapanış süresi bu sınırlara eklenebilir. Native build/koordinasyon adımı ayrıca 12 dakika ile sınırlıdır. macOS installer kabulü beklenen açılışı alamazsa yalnız kendi geçici Pofis sürecinin kısa yığın örneğini loga yazar; başarılı koşuda örnek alınmaz.

Taslağın korunduğu diğer hata durumlarında yeniden deneme aynı **sürüm ve kaynak commit'i** ile devam eder: tamamlanmış platform paketleri hash doğrulanarak draft/yayımlanmış release'den alınır ve aynı doğrulanmış paketlerle devam edilir. Platform kurtarma adımı yalnız otomasyonun kendi draft'ında ilgili platformun eksik dosyalarını temizler. Son birleştirme aşaması ve yayımlanmış release mevcut dosyaları korur. Yeni kaynak içeriği yeni sürüm numarasıyla yayımlanır. Release gövdesi [otomatik sürüm notlarını](#otomatik-sürüm-notları), kurulum bağlantısını, platformları ve kaynak commit alt bilgisini içerir.

Final yayın tüm hedeflerin başarıyla tamamlanmasına bağlıdır. Release yayımlandıktan sonra anonim indirme veya Workers/push başarısız olursa önceki canlı manifest korunur; son adımlardan sonra Workers gecikirse workflow başarısız raporlanır. Aynı sürümle yeniden çalıştırma yayımlanmış paketleri kullanıp kalan yayın adımlarını tamamlar. Branch koruması, yetki hatası veya çakışmada akış durur ve çözüm için açık hata verir.

## Kanıt sınırı

Yerel birim testleri sürüm/manifest, public dosya sınırı, kaynak commit eşleşmesi ve bozuk indirme reddini doğrular. Native paketler CI'da, yayımlanan dosyalar anonim indirme ve Workers HTTPS adımlarında doğrulanır. Cihaz kapsamı [masaüstü rehberinde](desktop.md), [kabul durumu](verification.md#kabul-durumu) doğrulama rehberindedir.

## Kaynaklar

- [GitHub native runner'ları](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [GitHub Actions cache](https://github.com/actions/cache)
- [Bun indirme cache'i](https://bun.sh/docs/install/cache)
- [Next CI build cache'i](https://nextjs.org/docs/app/guides/ci-build-caching)
- [GitHub Actions kullanım ücretleri ve kotaları](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GitHub kimlik doğrulama](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github)
- [Cloudflare Workers Git entegrasyonu](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/)
- [bsdtar arşiv güvenliği](https://github.com/libarchive/libarchive/blob/master/tar/bsdtar.1)
- [macOS mv -h bağlantı değiştirme](https://github.com/apple-oss-distributions/file_cmds/blob/main/mv/mv.1)
