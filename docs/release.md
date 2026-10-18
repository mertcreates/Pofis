# Pofis sürüm yayını

Ana uygulama deposu private kalır. [Release workflow'u](../.github/workflows/desktop-release.yml), public `mertcreates/pofis-landing` deposunun GitHub Releases bölümüne paketleri aktarır ve yalnız installer/manifest dosyalarını bu deponun `main` dalına gönderir. Cloudflare Pages Git entegrasyonu siteyi yayımlar. Uygulama kaynak deposu Cloudflare'a bağlanmaz.

## Bir kez yapılacak kurulum

1. Bağımsız landing projesinin incelenmiş içeriğini `mertcreates/pofis-landing` public deposunun `main` dalına yayımla. Paket ZIP'lerini Git'e ekleme.
2. GitHub'da yalnız bu public depoya erişen, **Contents: read and write** yetkili fine-grained PAT oluştur. Private uygulama deposunda Settings → Secrets and variables → Actions → Repository secrets altında **POFIS_RELEASE_TOKEN** adıyla secret ekle. Token'ı kaynak dosyasına veya workflow girdisine yazma. GitHub Free private depolarda environment secret desteklemediği için repository secret kullanılır. Yayın workflow'u ve betik yalnız `main` dalında elle başlatılan çalıştırmayı kabul eder; token süresi veya depo koruma kuralları yayını durdurabilir.
3. Aşağıdaki [Cloudflare Pages ayarlarıyla](#cloudflare-pages-ayarları) Git entegrasyonunu yalnız public landing deposuna bağla; `pofis.app` custom domain/DNS/HTTPS bağlantısını tamamla. Cloudflare API token'ı gerekmez.
4. Private depoda GitHub Actions kullanımını aç. Ücretli kullanımı engelleyen bütçe sınırını yapılandır. Private repo Actions kotası ve macOS runner tüketimi sınırlıdır; bu akış sınırsız ücretsiz derleme garantisi vermez. Kalıcı Actions artifact/cache depolaması eklenmez.
5. Bu depodaki incelenmiş workflow ve betikleri `main` dalına gönder. Bu maddeler dış sistem değişiklikleridir; yerel uygulama bunları gerçekleştirmez.

## Landing geliştirme ve dağıtım hazırlığı

Public landing README'si Pofis'i kısa bir ürün tanıtımı, slogan ve site bağlantısıyla sunar. Landing'in teknik işletim bilgileri bu rehberde tutulur.

Yan yana duran `Pofis/` ve `pofis-landing/` yerleşiminde landing projesinde Bun 1.4.3 ile `bun install --frozen-lockfile`, `bun run dev`, `bun run typecheck` ve `bun run build` kullanılır. Geliştirme adresi `http://localhost:3001`, statik yayın çıktısı `out/` dizinidir. Next.js static export çıktısını Cloudflare Pages sunar.

Build, dağıtım girdilerini ve üretilen statik dosyaları doğrular: manifest biçimi, paket adresinin hedef GitHub deposuna ait olması, siteye yanlışlıkla ZIP/EXE/özel dosya konması ve Pages dosya sınırı kontrol edilir. Canlı paketin yayımlandığı ayrıca doğrulanır. Ana uygulamadan installer ve manifest hazırlama komutlarının sahibi [masaüstü rehberidir](desktop.md).

## Cloudflare Pages ayarları

| Alan | Değer |
| --- | --- |
| Git deposu | mertcreates/pofis-landing |
| Production branch | main |
| Framework | Next.js (Static HTML Export) |
| Root directory | Depo kökü |
| Build command | bun install --frozen-lockfile && bun run build |
| Build output directory | out |
| Build image | v3 |
| BUN_VERSION | 1.4.3 |
| NODE_VERSION | 22.16.0 |
| SKIP_DEPENDENCY_INSTALL | 1 |

Ortam değişkenlerini production ve preview için tanımla. GitHub entegrasyonuna yalnız public landing deposu için erişim ver. Release otomasyonu ana uygulama deposunda, site yayını Pages Git entegrasyonunda çalışır.

`pofis.app` adresini Pages → Custom domains üzerinden bağla. Apex domain için Cloudflare zone ve Cloudflare nameserver'ları gerekir. DNS taşınacaksa mevcut MX/TXT ve diğer kayıtları koru; değişiklik için ayrıca kullanıcı yetkisi al.

Landing'in `public/_headers` dosyası installer ve manifestlere `Cache-Control: no-store` uygular. Bu yollar cache kurallarında da aynı politikayı korumalıdır. Pages tek dosya sınırı 25 MiB'dir; uygulama ZIP'leri GitHub Releases üzerinden sunulur.

## Yayın sonrası HTTPS kabulü

1. `https://pofis.app/` sayfasını, macOS ve Windows PowerShell sekmelerini, Windows komutunu ve kopyalama düğmesini kontrol et. macOS installer hazır olana kadar sekmesinde durum metni gösterilir.
2. `https://pofis.app/install.ps1` düz metin ve UTF-8, üç `https://pofis.app/releases/<hedef>/latest.json` adresi JSON dönmeli. Installer ve manifestlerde `Cache-Control: no-store` bulunmalı; içerikler beklenen dosyalarla eşleşmeli.
3. Public manifestlerdeki ZIP'leri anonim indir; boyut ve SHA-256 değerlerini karşılaştır.
4. Windows'ta `irm https://pofis.app/install.ps1 | iex` komutuyla kurulum → otomatik açılış → simgeden açılış → aynı komutla güncel sürüm kontrolünü tamamla. Yeni sürümde veri koruma ve geri dönüşü doğrula.

Bu adımlar canlı hosting ve paket yayını sonrasında uygulanır. Yerel hazırlığın kanıt sınırı aşağıda açıklanır.

## Bir sürüm yayımlama

1. `package.json` sürümünü yeni `x.y.z` değerine getir; değişiklikleri inceleyip `main` dalına gönder.
2. GitHub → Actions → **Pofis sürümünü yayımla** → Run workflow; `main` ve aynı sürüm numarasını seç.
3. Akışın tamamlanmasını bekle. Push/PR kontrolleri ayrı [CI akışında](../.github/workflows/ci.yml) çalışır; push otomatik release başlatmaz.

| Hedef | Native runner | Dağıtım dosyası |
| --- | --- | --- |
| Windows x64 | `windows-2022` | `Pofis-<sürüm>-win32-x64.zip` |
| macOS Apple Silicon | `macos-15` | `Pofis-<sürüm>-darwin-arm64.zip` |
| macOS Intel | `macos-15-intel` | `Pofis-<sürüm>-darwin-x64.zip` |

Üç hedef [aynı build betiğini](../scripts/electron/ci-build.cjs) kullanır. Her biri kilitli bağımlılıkları kurar, tür kontrolünü ve testleri çalıştırır; Next standalone/Electron paketini üretir. Gerçek paket üzerinde ortak pencere/süreç kabulü çalışır. Windows ayrıca gerçek ZIP ve landing komutuyla izole PowerShell ilk kurulum/açılış kabulünü çalıştırır. Bu kısa kabul tam güncelleme/geri dönüş testinin veya temiz cihaz testinin yerine geçmez.

macOS paketleyici ad-hoc imzalı `.app` üretir; ZIP `ditto` ile izin ve bağlantıları korur. Developer ID/notarization eklenmez. macOS tek komut installer'ı henüz yoktur; landing'deki macOS sekmesi kurulum komutu göstermeye başlamaz. Native CI pencere testi, indirilen uygulamanın Gatekeeper kabulünü kanıtlamaz.

## Yayın sırası ve hata davranışı

[Yayın betiği](../scripts/electron/publish.cjs):

1. Sürümü, public hedef depoyu, `main` dalını ve sürüm düşürülmediğini doğrular; draft release açar.
2. Üç native job test edilmiş ZIP'lerini draft'a yükler. Her platformda manifest son yüklenir. Windows `install.ps1` dosyası da asset olur.
3. Tüm işler başarılıysa paketler tekrar indirilip boyut/SHA-256 ile doğrulanır; üç public manifest ve Windows installer hazırlanır. Landing typecheck/static build çalışır.
4. Release yayımlanır. Üç ZIP anonim HTTPS üzerinden tekrar indirilip doğrulanır. Ancak bu kontrol geçerse landing değişiklikleri commit edilip `main` dalına gönderilir. Git'e yalnız dört izinli public dosya girebilir; kaynak ve ZIP aktarımı reddedilir.
5. Cloudflare commit'i yayımlar. Betik en fazla beş dakika HTTPS landing, üç manifestin tam içeriği/cache başlıkları ve Windows installer içeriği/başlıklarını kontrol eder. Başarısızsa workflow başarısız olur; mevcut paketi silmez veya başarı göstermez.

Release işlemleri ortak concurrency grubunda sıralanır. Yeniden denemede aynı **sürüm ve kaynak commit'i** kullanılır: tamamlanmış platform paketleri hash doğrulanarak draft/yayımlanmış release'den alınır, yeniden build edilmez. Yalnız otomasyonun kendi draft'ında ilgili platformun eksik dosyaları temizlenir. Son birleştirme aşaması ve yayımlanmış release dosya silmez. Aynı sürüm farklı kaynak commit'iyle sürdürülemez; yeni içerik için yeni sürüm gerekir. Release gövdesinde yalnız build commit kimliği bulunur; kaynak dosyalar yayımlanmaz.

Bir hedef başarısızsa final yayın başlamaz. Release yayımlandıktan sonra anonim indirme veya Pages/push başarısız olursa önceki canlı manifest korunur; son adımlardan sonra Pages gecikirse workflow başarısız raporlanır. Aynı sürümle yeniden çalıştırma yayımlanmış paketleri kullanıp kalan yayın adımlarını tamamlar. Branch koruması, yetki hatası veya çakışma zorla aşılmaz; force push yapılmaz.

## Kanıt sınırı

Yerel birim testleri sürüm/manifest, public dosya sınırı, kaynak commit eşleşmesi ve bozuk indirme reddini doğrular. Bunlar GitHub Actions, native macOS, public release veya Pages yayınının çalıştığını kanıtlamaz. İlk yetkili uzaktan çalıştırmada üç native job ve canlı HTTPS kabulü izlenmelidir. Gerçek Windows/macOS cihazı, PDKS oturumu ve Gatekeeper/SmartScreen işleri [görev listesinde](../tasks/todo.md) kalır.

## Kaynaklar

- [GitHub native runner'ları](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [GitHub Actions kullanım ücretleri ve kotaları](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GitHub kimlik doğrulama](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github)
- [Cloudflare Pages GitHub entegrasyonu](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)
