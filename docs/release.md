# Pofis sürüm yayını

Ana uygulama deposu private kalır. [Release workflow'u](../.github/workflows/desktop-release.yml), public `mertcreates/pofis-landing` deposunun GitHub Releases bölümüne paketleri aktarır ve yalnız installer/manifest dosyalarını bu deponun `main` dalına gönderir. Cloudflare Workers Git entegrasyonu siteyi yayımlar. Uygulama kaynak deposu Cloudflare'a bağlanmaz.

## Bir kez yapılacak kurulum

1. Bağımsız landing projesinin incelenmiş içeriğini `mertcreates/pofis-landing` public deposunun `main` dalına yayımla. Paket ZIP'lerini Git'e ekleme.
2. GitHub'da yalnız bu public depoya erişen, **Contents: read and write** yetkili fine-grained PAT oluştur. Private uygulama deposunda Settings → Secrets and variables → Actions → Repository secrets altında **POFIS_RELEASE_TOKEN** adıyla secret ekle. Token'ı kaynak dosyasına veya workflow girdisine yazma. GitHub Free private depolarda environment secret desteklemediği için repository secret kullanılır. Yayın workflow'u ve betik yalnız `master` dalında elle başlatılan çalıştırmayı kabul eder; token süresi veya depo koruma kuralları yayını durdurabilir.
3. [Cloudflare Workers bağlantısı](#cloudflare-workers-bağlantısı) yalnız public landing deposunu yayımlar. `pofis.app` bağlantısı hazırdır; release mevcut Git entegrasyonunu kullanır.
4. Private depoda GitHub Actions kullanımını aç. Ücretli kullanımı engelleyen bütçe sınırını yapılandır. Actions kotasını ve macOS runner tüketimini GitHub kullanım ekranından izle. Paketleri sürüm varlıklarında sakla.
5. Bu depodaki incelenmiş workflow ve betikleri `master` dalına gönder. Bu maddeler dış sistem değişiklikleridir; yerel uygulama bunları gerçekleştirmez.

## Landing geliştirme ve dağıtım hazırlığı

Public landing README'si Pofis'i kısa bir ürün tanıtımı, slogan ve site bağlantısıyla sunar. Landing'in teknik işletim bilgileri bu rehberde tutulur.

Yan yana duran `Pofis/` ve `pofis-landing/` yerleşiminde landing projesinde Bun 1.4.3 ile `bun install --frozen-lockfile`, `bun run dev`, `bun run typecheck` ve `bun run build` kullanılır. Geliştirme adresi `http://localhost:3001`, statik yayın çıktısı `out/` dizinidir. Next.js static export çıktısını Cloudflare Workers sunar.

Build, dağıtım girdilerini ve üretilen statik dosyaları doğrular: manifest biçimi, paket adresinin hedef GitHub deposuna ait olması, siteye yanlışlıkla ZIP/EXE/özel dosya konması ve statik dosya sınırı kontrol edilir. Canlı paketin yayımlandığı ayrıca doğrulanır. Ana uygulamadan installer ve manifest hazırlama komutlarının sahibi [masaüstü rehberidir](desktop.md).

## Cloudflare Workers bağlantısı

Landing, `mertcreates/pofis-landing` deposunun `main` dalından Cloudflare Workers üzerinden otomatik yayımlanır; `pofis.app` bu yayına bağlıdır. Mevcut Git/domain ayarları korunur.

Build komutu `bun install --frozen-lockfile && bun run build`, statik çıktı `out/` dizinidir. Release otomasyonu ana uygulama deposunda, site yayını Workers Git entegrasyonunda çalışır.

Landing'in `public/_headers` dosyası installer ve manifestlere `Cache-Control: no-store` uygular. Canlı HTTPS kabulü bu başlıkları ayrıca doğrular. Uygulama ZIP'leri GitHub Releases üzerinden sunulur.

Paketli Electron uygulaması açılışta bu manifestlerden kendi hedefine ait olanı kullanır. Yeni sürüm bildirimi ve kurulum komutunu kopyalama davranışı [masaüstü sözleşmesinde](desktop.md#açılışta-sürüm-denetimi) yönetilir.

## Sürüm ve manifest

Uygulama sürümünün sahibi [package.json](../package.json) dosyasıdır. Yeni paket içeriği yeni bir `x.y.z` sürümüyle yayımlanır; landing projesinin paket sürümü bundan bağımsızdır.

Public `latest.json` dosyaları ve footer'daki uygulama sürümü yayımlanmış paketlerden üretilir. İlk yayın manifesti oluşturur; sonraki yayınlarda mevcut manifest üzerinden sürüm düşürme koruması uygulanır. Otomasyon üç doğrulanmış paketten gerçek manifestleri üretir; bu dosyalar yalnız paketler anonim indirilebildikten sonra canlıya gönderilir.

Installer sürüm düşürmez. Daha yüksek sürümlü bir geliştirme paketinden düşük sürüme geçiş gerekiyorsa önce normal kaldırma yolu kullanılır; kullanıcı profili korunur.

## Yayın sonrası HTTPS kabulü

1. `https://pofis.app/` sayfasını, macOS ve Windows PowerShell sekmelerini, iki komutu ve kopyalama düğmesini kontrol et. macOS komutu: `curl -fsSL https://pofis.app/install.sh | bash`.
2. `https://pofis.app/install.ps1` ve `https://pofis.app/install.sh` düz metin ve UTF-8, üç `https://pofis.app/releases/<hedef>/latest.json` adresi JSON dönmeli. Installer ve manifestlerde `Cache-Control: no-store` bulunmalı; içerikler beklenen dosyalarla eşleşmeli.
3. Public manifestlerdeki ZIP'leri anonim indir; boyut ve SHA-256 değerlerini karşılaştır.
4. Windows'ta `irm https://pofis.app/install.ps1 | iex` komutuyla kurulum → otomatik açılış → simgeden açılış → aynı komutla güncel sürüm kontrolünü tamamla. Yeni sürümde [onaylı kapanışın](desktop.md#açık-uygulamada-onaylı-güncelleme) iptal, normal kapanış ve ayrı zorla kapatma onayını; veri koruma, eski sürüm temizliği ve kaldırmayı doğrula. macOS'ta aynı kapanış zincirini `curl -fsSL https://pofis.app/install.sh | bash` üzerinden doğrula.

Bu adımlar canlı hosting ve paket yayını sonrasında uygulanır. Yerel hazırlığın kanıt sınırı aşağıda açıklanır.

## Bir sürüm yayımlama

1. `package.json` sürümünü yeni `x.y.z` değerine getir; değişiklikleri inceleyip `master` dalına gönder.
2. GitHub → Actions → **Pofis sürümünü yayımla** → Run workflow; `master` dalını seç. Sürüm, çalıştırılan commit'in `package.json` dosyasından otomatik alınır ve tüm platformlara aktarılır.
3. Akışın tamamlanmasını bekle. Push/PR kontrolleri ayrı [CI akışında](../.github/workflows/ci.yml) çalışır; push otomatik release başlatmaz.

Paket üretimini ve kabul sürelerini ölçmek için **Paketler doğrulandıktan sonra sürümü yayımla** seçimini kapat. Bu çalıştırma sürüm taslağı/kurtarma/aktarım ve site yayını adımlarını atlayıp üç paketi yeniden üretir. Süreler Actions adımlarında ve özetinde görünür; normal yayında seçim açıktır.

Ölçüm mevcut `package.json` sürümüyle çalışır; sürüm artırmak gerekmez. İlk kontrol yalnız sürüm biçimini ve `package.json` eşleşmesini doğrular. Yayımlanmış sürümün kaynak commit'ini kontrol eden `publish.cjs` adımları ölçümde çalışmaz. Her job temiz çalışma alanında yeni yerel paket üretir. Workflow değişikliği `master` dalına gönderildikten sonra GitHub arayüzünden seçim kapatılabilir veya şu komut kullanılabilir:

```sh
gh workflow run desktop-release.yml --repo mertcreates/Pofis --ref master -f publish=false
```

Electron 43'e ilk geçişte workflow başlatılmadan [motor geçişi kabulünü](desktop.md#motor-geçişi-kabulü) ve ARM64 macOS 12 cihaz kabulünü tamamlayın. Intel gerçek cihaz kabulleri ayrı izlenir; kullanıcı kararıyla Intel yayını statik kontrollerle ilerler. Workflow testten sonra otomatik yayın ve landing push adımlarına ilerler. Üç hedef aynı tam Electron sürümünü kullanır; motor düşürülse de yeni paket daha yüksek Pofis sürümüyle yayımlanır. Açık platform kabulleri [görev listesinde](../tasks/todo.md) tutulur.

| Hedef | Derleme ortamı | Dağıtım dosyası |
| --- | --- | --- |
| Windows x64 | `windows-2022` | `Pofis-<sürüm>-win32-x64.zip` |
| macOS Apple Silicon | `macos-15` | `Pofis-<sürüm>-darwin-arm64.zip` |
| macOS Intel | Aynı `macos-15` runner, Rosetta altında x64 Bun | `Pofis-<sürüm>-darwin-x64.zip` |

Üç hedef [aynı build betiğini](../scripts/electron/ci-build.cjs) kullanır. Windows ve ARM64 işleri kilitli bağımlılıklar, tür kontrolü ve testlerden sonra Electron kurulumunu ve pano kabulünü Next derlemesi/paketlemeden önce çalıştırır. Intel paketi aşağıdaki statik kontrollerden geçer. Windows ve ARM64 için izole runner masaüstünde pano kabulü, gerçek paket üzerinde native bağımlılık ve ortak pencere/süreç kabulü çalışır. Windows ayrıca gerçek ZIP ve landing komutuyla izole PowerShell kurulum, güncelleme, hata, temizlik ve kaldırma kabulünü çalıştırır. Temiz cihaz kabulünü indirilen paketle hedef cihazda yap.

macOS paketleyici native dosyaları ve iç bundle’ları içten dışa ad-hoc imzalar; entitlement/runtime bayraklarını koruyup dış `.app` imzasını en son üretir. `--deep` yalnız imza doğrulamasında kullanılır; ZIP `ditto` ile izin ve bağlantıları korur. Dağıtım ad-hoc imza kullanır. Ortak Bash 3.2 installer'ı iki mimaride kullanılır. ARM64 paketi gerçek ZIP ile ilk kurulum, simgeden açılış, aynı sürüm/ikinci açılış, güncelleme, bozuk indirme, dolu port, gerçek sunucu hatasının raporlanması, profil kalıcılığı ve kurulum kilidi kabulünü çalıştırır. İndirilen uygulamanın Gatekeeper davranışı temiz hedef cihazda kontrol edilir.

## Cache ve süre ölçümü

Tek Apple Silicon runner kaynakları ve iki Next cache'ini hazırlar. [Koordinatör](../scripts/electron/macos-ci.cjs), ARM64 paket üretimi ile [Intel Rosetta/Bun ve bağımlılık hazırlığını](../scripts/electron/prepare-intel.sh) birlikte başlatır. ARM64 paketi hazır olunca kurulum/güncelleme kabulü başlar; Intel hazırlığı da tamamlanınca x64 derlemesi bu kabulle birlikte ilerler. İki Next derlemesi sırayla çalışır. Koordinatör iki zincirin de sonucunu bekler; paket aktarımı ikisi de başarılı olduğunda başlar. Aynı commit Intel için ayrı klonlanır; bağımlılıklar, Electron kurulumu, standalone çıktısı, landing dosyaları ve süre özetleri mimarilere göre ayrılır. Intel Next derlemesi Rosetta altında x64 Bun 1.4.3 ile çalışır; SWC ve sharp kurulu x64 bağımlılıklarla aynı mimaride yüklenir. Paketleme/imza, statik kontrol, ZIP ve sürüm dosyası aktarımı ARM64 Bun ile yürür; paketleyici ve ZIP üreticisi hedef mimariyi açıkça alır. `npm_config_arch=x64`, Electron kurulumunun hedefini belirler.

Intel paketi [statik kontrolden](../scripts/electron/macos-static-check.cjs) geçer: zorunlu dosyalar, sharp/libvips varlığı, tüm Mach-O dosyalarında x86_64 ve derin imza doğrulanır. ZIP bütünlüğü, boyut ve SHA-256 ayrıca kontrol edilir. Tür/birim testleri ve gerçek uygulama kabulü Windows ile ARM64'te çalışır; Intel açılış/kurulum/güncelleme kabulü ayrı cihaz kontrolüdür. macOS kabul fixture'ları APFS CoW (`/bin/cp -c -R`), doğrudan üst bundle imzası ve hızlı arşivleme ile hazırlanır.

`actions/cache` Bun paketlerini ve Electron indirmelerini runner'ın geçici dizininde saklar. Windows ile macOS indirmeleri ayrıdır; macOS indirme cache'i iki mimarinin arşivlerini içerir. İndirme anahtarı Bun sürümü, hedef ve kilit dosyasına bağlıdır; aynı bağımlılıklarda commit başına yeniden yüklenmez. Next yalnız `.next/cache` dizinini saklar; mimari, Bun sürümü, kilit dosyası ve kaynak commit'iyle anahtarlanır. Next yalnız aynı kilit dosyasıyla önceki commit'ten geri yüklenir. Her hedef yeniden derlenir; `node_modules`, standalone çıktısı, profil ve dağıtım paketi cache'e eklenmez.

Build betiği aşamaları duvar saatiyle ölçer; alt süreç çıktıları loga anında aktarılır. Electron kurulumu, masaüstü testleri, pano, Next, paketleme/imza, paket kabulü, ZIP/manifest ve installer kabulü ayrı görünür. Paket açılış/statik kontrol ile ZIP üretimi aynı mühürlenmiş paketi okuyarak birlikte ilerler; ikisi tamamlanınca installer kabulüne geçilir. Hatalar aşama süresiyle raporlanır ve aktarımı durdurur. `package` komutu installer kabulü öncesinde durur; `accept` hazır ZIP'in kurulum kabulünü çalıştırır; `build` ikisini tamamlar. `bun test` uygulamanın TypeScript testlerini, açık `bun test ./electron ./scripts/electron` komutu `.cjs` masaüstü testlerini çalıştırır. Cache aktarım süreleri Actions adımlarında görünür. Hedef Windows ve macOS paket işlerini 120 saniyenin altında tamamlamaktır; yayın ve canlı HTTPS doğrulaması ayrıca ölçülür. Runner üzerindeki toplam süre ve sıcak cache kazancı yetkili Actions çalıştırmasıyla doğrulanır.

## Yayın sırası ve hata davranışı

[Yayın betiği](../scripts/electron/publish.cjs):

1. Sürümü, public hedef depoyu, uygulamanın `master` dalını ve sürüm düşürülmediğini doğrular; draft release açar.
2. Windows ve macOS işleri üç hedefin doğrulanmış ZIP'lerini draft'a yükler. İki macOS hedefinin ayrı asset'leri paralel aktarılır; her hedef kendi manifestini en son yükler. Windows `install.ps1`, macOS işi iki mimari için mimariyle adlandırılan `install-darwin-<mimari>.sh` asset'lerini yükler. İki macOS installer'ının aynı canonical kaynakla eşleşmesi doğrulanır; public sitede ortak `install.sh` sunulur.
3. Tüm işler başarılıysa paketler tekrar indirilip boyut/SHA-256 ile doğrulanır; üç public manifest ve iki installer hazırlanır. Landing typecheck/static build çalışır.
4. Release yayımlanır. Üç ZIP anonim HTTPS üzerinden tekrar indirilip doğrulanır. Ancak bu kontrol geçerse landing değişiklikleri Mert Ercan (`me@mertercan.com`) kimliğiyle commit edilip `main` dalına gönderilir. Git'e yalnız beş izinli public dosya girebilir; kaynak ve ZIP aktarımı reddedilir.
5. Cloudflare commit'i yayımlar. Betik en fazla beş dakika HTTPS landing, üç manifestin tam içeriği/cache başlıkları ve iki installer'ın içeriği/başlıklarını kontrol eder; tüm kontroller geçince beklemeden tamamlanır. Installer metni BOM olmadan LF ile hazırlanır; karşılaştırma CRLF/LF farkını yok sayar, gerçek içerik değişikliğini reddeder. Her başarısız denemede bekleme nedeni loga yazılır. Süre dolarsa workflow başarısız olur; mevcut paketi silmez veya başarı göstermez.

Release işlemleri ortak concurrency grubunda sıralanır. Bir build hedefi başarısızsa tüm matrix işleri bittikten sonra `cleanup` işi aynı sürüm ve kaynak commit'ine ait otomasyon taslağını, yüklenen paketleriyle birlikte siler. Yayımlanmış sürümler ve başka kaynak commit'ine ait taslaklar silinmez; silme hatası görünür biçimde işi başarısız yapar. İptal edilen akış bu temizliği başlatmaz. Sonraki denemede **Run workflow** veya **Re-run all jobs** ile tüm akış başlatılır; bu seçim tüm kurtarma ve birleştirme adımlarını çalıştırır. Taslak silinmiş ve sürüm henüz yayımlanmamışsa düzeltme commit'i aynı sürüm numarasıyla yeni taslak oluşturabilir.

Taslağın korunduğu diğer hata durumlarında yeniden deneme aynı **sürüm ve kaynak commit'i** ile devam eder: tamamlanmış platform paketleri hash doğrulanarak draft/yayımlanmış release'den alınır ve aynı doğrulanmış paketlerle devam edilir. Platform kurtarma adımı yalnız otomasyonun kendi draft'ında ilgili platformun eksik dosyalarını temizler. Son birleştirme aşaması ve yayımlanmış release mevcut dosyaları korur. Yeni kaynak içeriği yeni sürüm numarasıyla yayımlanır. Release gövdesinde yalnız build commit kimliği bulunur.

Final yayın tüm hedeflerin başarıyla tamamlanmasına bağlıdır. Release yayımlandıktan sonra anonim indirme veya Workers/push başarısız olursa önceki canlı manifest korunur; son adımlardan sonra Workers gecikirse workflow başarısız raporlanır. Aynı sürümle yeniden çalıştırma yayımlanmış paketleri kullanıp kalan yayın adımlarını tamamlar. Branch koruması, yetki hatası veya çakışmada akış durur ve çözüm için açık hata verir.

## Kanıt sınırı

Yerel birim testleri sürüm/manifest, public dosya sınırı, kaynak commit eşleşmesi ve bozuk indirme reddini doğrular. Native paketler CI üzerinde, yayımlanan dosyalar anonim indirme ve Workers HTTPS adımlarında doğrulanır. Kullanıcının 20 Ekim 2026 tarihli teyidine göre Windows/macOS gerçek cihaz ve canlı güncelleme kabulleri tamamlanmıştır; iki platform aktif kullanımdadır. Güncel kabul durumu [masaüstü rehberinde](desktop.md), yeni yayınların kabul adımları bu rehberde yönetilir.

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
