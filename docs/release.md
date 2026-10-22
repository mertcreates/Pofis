# Pofis sürüm yayını

Ana uygulama deposu private kalır. [Release workflow'u](../.github/workflows/desktop-release.yml), public `mertcreates/pofis-landing` deposunun GitHub Releases bölümüne paketleri aktarır ve yalnız installer/manifest dosyalarını bu deponun `main` dalına gönderir. Cloudflare Workers Git entegrasyonu siteyi yayımlar. Uygulama kaynak deposu Cloudflare'a bağlanmaz.

Linux hedefi için ortak macOS / Ubuntu sekmesi ve güncel doğrulama betiği landing kaynaklarında bulunmalıdır. Begin işi, paket üretiminden ve taslak oluşturmadan önce ortak Unix/Windows komut sözleşmesini kontrol eder. Landing kaynakları eskiyse önce bunların kullanıcı yetkisiyle yayımlanması gerekir; release yalnız public installer ve manifest dosyalarını günceller.

Workflow, incelenmiş landing kaynağını `SITE_REVIEWED_COMMIT` ile sabitler. Begin, `main` üzerindeki farkların yalnız altı üretilen public dosyada olduğunu doğrulayıp seçtiği commit'i tüm işlere aktarır. Landing kodu değişirse bu kaynak commit'i incelemeden sonra güncellenir. İçerik kataloğu veri nesnesi olarak okunur; yayın token'ıyla landing modülü çalıştırılmaz. Tüm action referansları tam commit SHA'sına sabitlenir.

## Bir kez yapılacak kurulum

1. Bağımsız landing projesinin incelenmiş içeriğini `mertcreates/pofis-landing` public deposunun `main` dalına yayımla. Paket arşivlerini Git'e ekleme.
2. GitHub'da yalnız bu public depoya erişen, **Contents: read and write** yetkili fine-grained PAT oluştur. Private uygulama deposunda Settings → Secrets and variables → Actions → Repository secrets altında **POFIS_RELEASE_TOKEN** adıyla secret ekle. Token'ı kaynak dosyasına veya workflow girdisine yazma. GitHub Free private depolarda environment secret desteklemediği için repository secret kullanılır. Yayın workflow'u ve betik yalnız `master` dalında elle başlatılan çalıştırmayı kabul eder; token süresi veya depo koruma kuralları yayını durdurabilir.
3. [Cloudflare Workers bağlantısı](#cloudflare-workers-bağlantısı) yalnız public landing deposunu yayımlar. `pofis.app` bağlantısı hazırdır; release mevcut Git entegrasyonunu kullanır.
4. Private depoda GitHub Actions kullanımını aç. Ücretli kullanımı engelleyen bütçe sınırını yapılandır. Actions kotasını ve macOS runner tüketimini GitHub kullanım ekranından izle. Paketleri sürüm varlıklarında sakla.
5. Bu depodaki incelenmiş workflow ve betikleri `master` dalına gönder. Bu maddeler dış sistem değişiklikleridir; yerel uygulama bunları gerçekleştirmez.

## Landing geliştirme ve dağıtım hazırlığı

Public landing README'si Pofis'i kısa bir ürün tanıtımı, slogan ve site bağlantısıyla sunar. Landing'in teknik işletim bilgileri bu rehberde tutulur.

Yan yana duran `Pofis/` ve `pofis-landing/` yerleşiminde landing projesinde Bun 1.4.3 ile `bun install --frozen-lockfile`, `bun run dev`, `bun run typecheck` ve `bun run build` kullanılır. Geliştirme adresi `http://localhost:3001`, statik yayın çıktısı `out/` dizinidir. Next.js static export çıktısını Cloudflare Workers sunar.

Build, dağıtım girdilerini ve üretilen statik dosyaları doğrular: manifest biçimi, paket adresinin hedef GitHub deposuna ait olması, siteye yanlışlıkla ZIP/tar.gz/EXE/özel dosya konması ve statik dosya sınırı kontrol edilir. Canlı paketin yayımlandığı ayrıca doğrulanır. Ana uygulamadan installer ve manifest hazırlama komutlarının sahibi [masaüstü rehberidir](desktop.md).

## Cloudflare Workers bağlantısı

Landing, `mertcreates/pofis-landing` deposunun `main` dalından Cloudflare Workers üzerinden otomatik yayımlanır; `pofis.app` bu yayına bağlıdır. Mevcut Git/domain ayarları korunur.

Build komutu `bun install --frozen-lockfile && bun run build`, statik çıktı `out/` dizinidir. Release otomasyonu ana uygulama deposunda, site yayını Workers Git entegrasyonunda çalışır.

Landing'in `public/_headers` dosyası installer ve manifestlere `Cache-Control: no-store` uygular. Canlı HTTPS kabulü bu başlıkları ayrıca doğrular. Uygulama ZIP'leri GitHub Releases üzerinden sunulur.

Paketli Electron uygulaması açılışta bu manifestlerden kendi hedefine ait olanı kullanır. Yeni sürüm bildirimi ve kurulum komutunu kopyalama davranışı [masaüstü sözleşmesinde](desktop.md#açılışta-sürüm-denetimi) yönetilir.

## Sürüm ve manifest

Uygulama sürümünün sahibi [package.json](../package.json) dosyasıdır. Yeni paket içeriği yeni bir `x.y.z` sürümüyle yayımlanır; landing projesinin paket sürümü bundan bağımsızdır.

Public `latest.json` dosyaları ve footer'daki uygulama sürümü yayımlanmış paketlerden üretilir. İlk yayın manifesti oluşturur; sonraki yayınlarda mevcut manifest üzerinden sürüm düşürme koruması uygulanır. Otomasyon dört doğrulanmış paketten gerçek manifestleri üretir; bu dosyalar yalnız paketler anonim indirilebildikten sonra canlıya gönderilir.

Installer sürüm düşürmez. Daha yüksek sürümlü bir geliştirme paketinden düşük sürüme geçiş gerekiyorsa önce normal kaldırma yolu kullanılır; kullanıcı profili korunur.

## Yayın sonrası HTTPS kabulü

1. `https://pofis.app/` sayfasını, macOS / Ubuntu ve Windows PowerShell sekmelerini, iki komutu ve kopyalama düğmesini kontrol et. macOS/Ubuntu ortak komutu: `curl -fsSL https://pofis.app/install.sh | bash`.
2. `https://pofis.app/install.ps1` ve `https://pofis.app/install.sh` düz metin ve UTF-8, dört `https://pofis.app/releases/<hedef>/latest.json` adresi JSON dönmeli. Installer ve manifestlerde `Cache-Control: no-store` bulunmalı; içerikler beklenen dosyalarla eşleşmeli.
3. Public manifestlerdeki ZIP'leri anonim indir; boyut ve SHA-256 değerlerini karşılaştır.
4. Windows'ta `irm https://pofis.app/install.ps1 | iex` komutuyla kurulum → otomatik açılış → simgeden açılış → aynı komutla güncel sürüm kontrolünü tamamla. Yeni sürümde [onaylı kapanışın](desktop.md#açık-uygulamada-onaylı-güncelleme) iptal, normal kapanış ve ayrı zorla kapatma onayını; veri koruma, eski sürüm temizliği ve kaldırmayı doğrula. macOS'ta aynı kapanış zincirini `curl -fsSL https://pofis.app/install.sh | bash` üzerinden doğrula.

Bu adımlar canlı hosting ve paket yayını sonrasında uygulanır. Yerel hazırlığın kanıt sınırı aşağıda açıklanır.

## Bir sürüm yayımlama

1. `package.json` sürümünü yeni `x.y.z` değerine getir; değişiklikleri inceleyip `master` dalına gönder.
2. GitHub → Actions → **Pofis sürümünü yayımla** → Run workflow; `master` dalını seç. Sürüm, çalıştırılan commit'in `package.json` dosyasından otomatik alınır ve tüm platformlara aktarılır.
3. Akışın tür kontrolü, testler ve platform paket kabullerini tamamlamasını bekle. Actions yalnız elle başlatılan bu sürüm akışını çalıştırır. Günlük geliştirme kontrollerini [yerelde](verification.md#yerel-kontroller) çalıştır.

Paket üretimini ve kabul sürelerini ölçmek için **Paketler doğrulandıktan sonra sürümü yayımla** seçimini kapat. Bu çalıştırma sürüm taslağı/kurtarma/aktarım ve site yayını adımlarını atlayıp dört paketi yeniden üretir. Süreler Actions adımlarında ve özetinde görünür; normal yayında seçim açıktır.

Ölçüm mevcut `package.json` sürümüyle çalışır; sürüm artırmak gerekmez. İlk kontrol yalnız sürüm biçimini ve `package.json` eşleşmesini doğrular. Yayımlanmış sürümün kaynak commit'ini kontrol eden `publish.cjs` adımları ölçümde çalışmaz. Her job temiz çalışma alanında yeni yerel paket üretir. Workflow değişikliği `master` dalına gönderildikten sonra GitHub arayüzünden seçim kapatılabilir veya şu komut kullanılabilir:

```sh
gh workflow run desktop-release.yml --repo mertcreates/Pofis --ref master -f publish=false
```

Electron 43'e ilk geçişte workflow başlatılmadan [motor geçişi kabulünü](desktop.md#motor-geçişi-kabulü) ve ARM64 macOS 12 cihaz kabulünü tamamlayın. Intel gerçek cihaz kabulleri ayrı izlenir; kullanıcı kararıyla Intel yayını statik kontrollerle ilerler. Workflow testten sonra otomatik yayın ve landing push adımlarına ilerler. Dört hedef aynı tam Electron sürümünü kullanır; motor düşürülse de yeni paket daha yüksek Pofis sürümüyle yayımlanır. Açık platform kabulleri [görev listesinde](../tasks/todo.md) tutulur.

| Hedef | Derleme ortamı | Dağıtım dosyası |
| --- | --- | --- |
| Windows x64 | `windows-2022` | `Pofis-<sürüm>-win32-x64.zip` |
| macOS Apple Silicon | `macos-15` | `Pofis-<sürüm>-darwin-arm64.zip` |
| macOS Intel | Aynı `macos-15` runner, ARM64 Bun ve x64 Electron | `Pofis-<sürüm>-darwin-x64.zip` |
| Ubuntu x64 | Aynı `macos-15` runner, ARM64 Bun ve Linux x64 Electron; statik kabul | `Pofis-<sürüm>-linux-x64.tar.gz` |

Dört hedef [aynı build betiğini](../scripts/electron/ci-build.cjs) kullanır. Windows'ta Electron kurulumu/testler ile tür kontrollü Next derlemesi birlikte ilerler. Uygulama ve masaüstü testleri eşzamanlıdır; masaüstü test dosyaları dört Bun worker’ında çalışır. Windows'ta testler ve Next tamamlanınca pano kabulü, ardından paketleme başlar. ARM64'te testler ve pano kabulünden sonra Next derlenir. Intel ve Linux paketleri aşağıdaki statik kontrollerden geçer. Windows ve ARM64 için izole runner masaüstünde pano kabulü, gerçek paket üzerinde görsel/font ve ortak pencere/süreç kabulü çalışır. Windows ayrıca gerçek ZIP ve landing komutuyla izole PowerShell kurulum, güncelleme, hata, temizlik ve kaldırma kabulünü çalıştırır. Temiz cihaz kabulünü indirilen paketle hedef cihazda yap.

Paket içeriği, macOS imzalama ve installer davranışı [masaüstü rehberinde](desktop.md#ortak-platform-sözleşmesi) yönetilir. ARM64 installer kabulü gerçek ZIP ile çalışır; Gatekeeper temiz hedef cihazda doğrulanır.

## Cache ve süre ölçümü

Windows ZIP üretimi sistem `tar.exe` aracını deflate seviye 1 ile kullanır; araç yoksa .NET `Fastest` yolu çalışır. Arşiv biçimi `.zip.partial` geçici uzantısında da açıkça ZIP seçilir. Kabul fixture'ları native ZIP'in `/` ve önceki .NET ZIP'lerinin `\` yollarını okuyabilir. Güncelleme grubu, 3210 başka uygulamaya aitken aynı sürümün indirilmeden yeniden açılmasını doğrular; onarım grubu bu kontrolü tekrarlamadan başarısız sürümden onarımı ve diğer sürecin korunmasını sınar. Kilit kabulünde ilk installer'ın manifest yanıtı, ikinci installer kilit nedeniyle reddedilene kadar tutulur; sabit süre beklenmez.

Uygulama testleri ve masaüstü testleri eşzamanlı çalışır; ön kontrol süresini en geç tamamlanan kontrol belirler. Masaüstü testleri `--parallel=4` ile en fazla dört test dosyasını birlikte çalıştırır. Windows'ta Next bu hazırlıklarla birlikte derlenir; bütün çalışan kontroller ve Next tamamlanmadan pano kabulü veya paketleme başlamaz. Pano kabulü standalone preload dosyasını yazdığı için Next çıktısını bekler. Her kontrolün hatası paketlemeyi durdurur. Next derlemesi aynı `tsconfig.json` kapsamındaki kaynak ve testlerin tür kontrolünü yapar; CI aynı kontrol için ayrıca `tsc` başlatmaz. Tür hatası Next derlemesini durdurur ve paketleme başlamaz. Yerel `bun run typecheck` komutu korunur.

Windows sunucusu [ASAR paketine](desktop.md#ortak-platform-sözleşmesi) alınır; küçük dosyaların ZIP'ten açılması ve sürüm temizliği azalır. Onarılmış uygulama kurulum kilidi ve açıkken kaldırma reddi için çalışır bırakılır; arada kapatılıp yeniden açılmaz. Son kapanışta 3210'daki diğer uygulamanın korunduğu doğrulanır.

Tek Apple Silicon runner kaynakları ve ARM64 Next cache’ini hazırlar. [Koordinatör](../scripts/electron/macos-ci.cjs), ARM64 paket üretimiyle Intel ve Linux çalışma dizinlerinin kilitli bağımlılık kurulumlarını birlikte başlatır. Next bir kez ARM64 Bun ile derlenir; iki x64 paket aynı çıktıyı `POFIS_SHARED_STANDALONE` üzerinden kullanır. [Taşınabilirlik kontrolü](../scripts/electron/standalone.cjs) her ortak sunucu kopyasında native dosyaları reddeder. SWC derleme aracıdır; sharp/libvips masaüstü trace’lerinden çıkarılır. Kaynaklar, Electron kurulumu, landing dosyaları ve süre özetleri hedefler için ayrı tutulur. Bun ve paketleme araçları runner mimarisinde kalır; Electron indirme platformu/mimarisi hedefe göre seçilir. ARM64 paketi taslaktan kurtarıldığında doğrulanmış ZIP bir kez açılır ve sunucu iki hedef için paylaşılır. Kurtarılan hedefler yeniden üretilmez. Üç zincirin tamamı başarılı olunca paket aktarımı başlar.

Intel paketi [statik kontrolden](../scripts/electron/macos-static-check.cjs) geçer: zorunlu dosyalar, tüm Mach-O dosyalarında x86_64, derin imza ve ZIP bütünlüğü doğrulanır. Linux paketi [statik kontrolden](../scripts/electron/linux-static-check.cjs) geçer: kilitli Electron sürümü, ELF64 little-endian x86_64 mimarisi, helper’lar, çalıştırma izinleri, preload/bildirim çıktısı ve taşınabilir sunucu doğrulanır. macOS üzerinde tar.gz üretilir ve arşiv okunabilirliği kontrol edilir; site hazırlığı boyut/SHA-256 ve manifesti doğrular. Linux ikilisi macOS üzerinde çalıştırılmaz. Tür/birim testleri ve gerçek uygulama kabulü Windows ve ARM64’te sürer; Linux ve Intel gerçek cihaz kabulleri ayrıca izlenir. Ubuntu paket açılışı, installer ve bildirim kabulü [doğrulama rehberindedir](verification.md#linux-ve-ortak-unix-installer-kabulü).

`actions/cache` Bun paketlerini ve Electron indirmelerini runner'ın geçici dizininde saklar. Windows ile macOS indirmeleri ayrıdır; macOS indirme cache'i iki macOS mimarisi ve Linux x64 arşivlerini içerir. İndirme anahtarı Bun sürümü, hedef ve kilit dosyasına bağlıdır; aynı bağımlılıklarda commit başına yeniden yüklenmez. Kurtarma tüm hedefler için önce ana çalışma dizininde tamamlanır. Hiçbir hedef yeniden üretilmeyecekse indirme cache'i yüklenmez; Intel/Linux çalışma dizinleri yalnız ilgili hedef yeniden üretilecekse oluşturulur. Next cache'i yalnız native hedef yeniden derlenecekse yüklenir; mimari, Bun sürümü, kilit dosyası ve kaynak commit'iyle anahtarlanır. Next yalnız aynı kilit dosyasıyla önceki commit'ten geri yüklenir. `node_modules`, standalone çıktısı, profil ve dağıtım paketi cache'e eklenmez.

Build betiği aşamaları duvar saatiyle ölçer; alt süreç çıktıları loga anında aktarılır. Electron kurulumu, masaüstü testleri, pano, Next, paketleme/imza, paket kabulü, ZIP/manifest ve installer kabulü ayrı görünür. Paket açılış/statik kontrol ile ZIP üretimi aynı mühürlenmiş paketi okuyarak birlikte ilerler; ikisi tamamlanınca installer kabulüne geçilir. Hatalar aşama süresiyle raporlanır ve aktarımı durdurur. `package` komutu installer kabulü öncesinde durur; `accept` hazır ZIP'in kurulum kabulünü çalıştırır; `build` ikisini tamamlar. `bun test` uygulamanın TypeScript testlerini, açık `bun test ./electron ./scripts/electron` komutu `.cjs` masaüstü testlerini çalıştırır. Cache aktarım süreleri Actions adımlarında görünür. Hedef Windows paket zincirini yaklaşık 107 saniyelik referansa göre en az %50 hızlandırıp 54 saniyenin altında tamamlamaktır; checkout, cache aktarımı ve yayın bu aşama toplamının dışındadır; önceki iki macOS mimarisi için 90 saniye hedefi sağlandı, Linux eklenen üç hedefli macOS işinin süresi yeni yetkili çalıştırmada ölçülür; yayın ve canlı HTTPS doğrulaması ayrıca ölçülür. Runner üzerindeki toplam süre ve sıcak cache kazancı yetkili Actions çalıştırmasıyla doğrulanır.

## Yayın sırası ve hata davranışı

[20 Ekim 2026 ölçümü](https://github.com/mertcreates/Pofis/actions/runs/39448234242), `1bd3745` kaynak commit'inde yayın kapalıyken Windows ve iki mimarili macOS paket kabulünü tamamladı: macOS işi 84 s, Windows işi 139 s. macOS 90 s hedefi sağlandı; Windows 120 s hedefi açık. Sonraki ürün değişiklikleri yeni commit'in paket kabulüyle doğrulanır.

[Yayın betiği](../scripts/electron/publish.cjs):

1. Sürümü, public hedef depoyu, uygulamanın `master` dalını ve sürüm düşürülmediğini doğrular; draft release açar.
2. Windows ve macOS işleri dört hedefin doğrulanmış paketlerini draft'a yükler. macOS koordinatörü iki macOS hedefi ve Linux hedefinin ayrı asset'lerini paralel aktarır; her hedef kendi manifestini en son yükler. Windows `install.ps1`, macOS işi iki mimari için mimariyle adlandırılan `install-darwin-<mimari>.sh` asset'lerini yükler. İki macOS installer'ının aynı canonical kaynakla eşleşmesi doğrulanır; macOS işi Linux hedefi için `install-linux-x64.sh` kaynak asset’ini de yükler. Ortak public installer’ın sahibi [Unix kurulum sözleşmesidir](desktop.md#ubuntu-2404-lts-x64-ve-ortak-unix-kurulumu).
3. Tüm işler başarılıysa `prepare` paketleri tekrar indirip boyut/SHA-256 ile doğrular; dört public manifest ve iki installer hazırlanır. Yalnız bu altı küçük dosya bir günlük immutable artifact'e konur. `validate_site` aynı commit ve artifact ile typecheck/static build çalıştırır; bu runner yayın token'ını almaz. Site derleme çıktısı yayın işine aktarılmaz.
4. Temiz `publish` runner'ı aynı commit'i ve `prepare` tarafından üretilen artifact kimliğini kullanır; installer'ları canonical kaynaklarla, manifestleri sürüm asset'leriyle karşılaştırır. Release yayımlanır. Dört paket arşivi anonim HTTPS üzerinden tekrar indirilip doğrulanır. Ancak bu kontrol geçerse landing değişiklikleri Mert Ercan (`me@mertercan.com`) kimliğiyle commit edilip `main` dalına gönderilir. Git'e yalnız altı izinli public dosya girebilir; kaynak ve paket arşivi aktarımı reddedilir. Site kodu ayrı runner'da çalıştığı için arka planda kalan süreçler yayın token'ına erişemez. Bu ayrım iki kısa Windows işi ekler; macOS/Linux üretimini çoğaltmaz.
5. Cloudflare commit'i yayımlar. Betik en fazla beş dakika HTTPS landing, dört manifestin tam içeriği/cache başlıkları ve iki installer'ın içeriği/başlıklarını kontrol eder; tüm kontroller geçince beklemeden tamamlanır. Installer metni BOM olmadan LF ile hazırlanır; karşılaştırma CRLF/LF farkını yok sayar, gerçek içerik değişikliğini reddeder. Her başarısız denemede bekleme nedeni loga yazılır. Süre dolarsa workflow başarısız olur; mevcut paketi silmez veya başarı göstermez.

Release işlemleri ortak concurrency grubunda sıralanır. Bir build hedefi başarısızsa matrix diğer runner'daki işi iptal eder. Build sonucu başarısız veya iptal olduğunda `cleanup`, aynı sürüm ve kaynak commit'ine ait otomasyon taslağını yüklenen paketleriyle birlikte siler. Yayımlanmış sürümler ve başka kaynak commit'ine ait taslaklar silinmez; silme hatası görünür biçimde işi başarısız yapar. Sonraki denemede **Run workflow** veya **Re-run all jobs** ile tüm akış başlatılır; bu seçim tüm kurtarma ve birleştirme adımlarını çalıştırır. Taslak silinmiş ve sürüm henüz yayımlanmamışsa düzeltme commit'i aynı sürüm numarasıyla yeni taslak oluşturabilir.

macOS koordinatörü ilk hedef hatasında kardeş üretimleri iptal eder, yeni aşama başlatmaz ve çalışan komutların kapanışını bekleyerek özgün hatayı döndürür. İç CI komutları sahiplerinin POSIX süreç grubunu paylaşır; iptal ve zaman aşımı alt süreçlere ulaşır. Kapanış için 15 saniye tanınır, ardından kalan grup zorla kapatılır. LaunchServices ile açılan test uygulamasını macOS kabulü ayrıca kendi geçici paketinin tam executable yollarıyla takip eder: normal çıkış ana süreçle yardımcı süreçlerin bitmesini bekler; son temizlik gerektiğinde yalnız bu süreçleri zorla kapatır. Temizlik başarısızsa hata raporlanır ve geçici paket korunur.

Yerel kabul polling'i bekleyen kontrolü de süre sonunda reddeder; HTTP başlık/gövde okumaları iptal edilebilir. CI alt komutları en fazla 10 dakika, paket açılış kabulü 2 dakika, kurulum/güncelleme kabulü 5 dakika çalışır; kapanış süresi bu sınırlara eklenebilir. Native build/koordinasyon adımı ayrıca 12 dakika ile sınırlıdır. macOS installer kabulü beklenen açılışı alamazsa yalnız kendi geçici Pofis sürecinin kısa yığın örneğini loga yazar; başarılı koşuda örnek alınmaz.

Taslağın korunduğu diğer hata durumlarında yeniden deneme aynı **sürüm ve kaynak commit'i** ile devam eder: tamamlanmış platform paketleri hash doğrulanarak draft/yayımlanmış release'den alınır ve aynı doğrulanmış paketlerle devam edilir. Platform kurtarma adımı yalnız otomasyonun kendi draft'ında ilgili platformun eksik dosyalarını temizler. Son birleştirme aşaması ve yayımlanmış release mevcut dosyaları korur. Yeni kaynak içeriği yeni sürüm numarasıyla yayımlanır. Release gövdesinde yalnız build commit kimliği bulunur.

Final yayın tüm hedeflerin başarıyla tamamlanmasına bağlıdır. Release yayımlandıktan sonra anonim indirme veya Workers/push başarısız olursa önceki canlı manifest korunur; son adımlardan sonra Workers gecikirse workflow başarısız raporlanır. Aynı sürümle yeniden çalıştırma yayımlanmış paketleri kullanıp kalan yayın adımlarını tamamlar. Branch koruması, yetki hatası veya çakışmada akış durur ve çözüm için açık hata verir.

## Kanıt sınırı

Yerel birim testleri sürüm/manifest, public dosya sınırı, kaynak commit eşleşmesi ve bozuk indirme reddini doğrular. Native paketler CI'da, yayımlanan dosyalar anonim indirme ve Workers HTTPS adımlarında doğrulanır. Gerçek cihaz kabul durumu [masaüstü rehberinde](desktop.md), açık işler [görev listesinde](../tasks/todo.md) tutulur.

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
