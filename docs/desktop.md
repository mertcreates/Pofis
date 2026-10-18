# Pofis masaüstü altyapısı

Pofis, mevcut Next.js standalone uygulamasını Electron'un dahili Node.js runtime'ıyla ayrı bir UtilityProcess içinde çalıştırır. Son kullanıcıda Node.js/Bun kurulumu gerekmez; ayrı Bun executable'ı dağıtılmaz. Geliştirme, test ve build Bun kullanır. Windows x64 ve macOS Apple Silicon/Intel aynı Electron, sunucu, paketleme ve manifest kodunu kullanır. Windows kurulumu kullanıcı başınadır ve yönetici yetkisi istemez. macOS kodu hazırlanmıştır; gerçek macOS derleme/çalıştırma kabulü henüz yapılmamıştır.

## Ortak platform sözleşmesi

[Platform tanımı](../electron/platform.cjs) desteklenen işletim sistemi/mimariyi, executable adlarını, kaynak yollarını ve çıktı dizinini tek yerde belirler. Ayrı Windows/macOS uygulama girişleri veya iş mantığı yoktur. Her paket kendi işletim sistemi ve mimarisindeki Bun/Electron ile hazırlanır; Windows üzerinden macOS paketi üretildiği varsayılmaz. Hazırlama, Electron'un gerçek platform/mimarisini çalıştırarak Bun hedefiyle karşılaştırır; Rosetta veya karışmış çalışma dosyaları nedeniyle farklı hedefler bulunursa paketleme durur.

| Hedef | Uygulama | Paket çıktısı | Dağıtım manifesti |
| --- | --- | --- | --- |
| Windows x64 | `Pofis.exe` | `dist/windows/Pofis-win32-x64-<zaman>/` | `dist/releases/windows/latest.json` |
| macOS Apple Silicon | `Pofis.app` | `dist/macos/Pofis-darwin-arm64-<zaman>/` | `dist/releases/macos/arm64/latest.json` |
| macOS Intel | `Pofis.app` | `dist/macos/Pofis-darwin-x64-<zaman>/` | `dist/releases/macos/x64/latest.json` |

Her hedefte aynı geliştirici komutları kullanılır:

```sh
bun install --frozen-lockfile
bun run desktop:prepare
bun run desktop
bun run desktop:package
bun run desktop:release -PackageDirectory <paket-komutunun-yazdığı-klasör>
bun run test:desktop
bun run test:desktop:smoke <paket-komutunun-yazdığı-klasör>
```

[Derleme betiği](../scripts/electron/build.cjs) `POFIS_STANDALONE=1` ile Next çıktısını hazırlar; `public` ve `.next/static` dosyalarını standalone klasörüne ekler. [Ortak paketleyici](../scripts/electron/package.cjs) bunu `resources/app/server/` altına kopyalar. Yalnız Next'in izlediği üretim bağımlılıkları taşınır; kök `node_modules` ağacı kopyalanmaz. Windows junction bağlantıları dereference edilerek paket kaynak depodan bağımsızlaştırılır. [Ortak dağıtım üreticisi](../scripts/electron/release.cjs) tüm hedeflerde aynı manifest şemasını, sürüm kontrolünü ve SHA-256 hesabını kullanır. Yalnız ZIP üretimi Windows'ta .NET, macOS'ta `ditto` aracına bırakılır; macOS arşivi `.app` izinlerini ve bağlantılarını korur.

[macOS uyarlaması](../scripts/electron/macos.cjs) `.app` ve helper adlarını, bundle kimliklerini ve sürüm alanlarını düzenler; sistemdeki `codesign` ile yerel ad-hoc imza üretip doğrular. Bu, Developer ID veya notarization değildir; Gatekeeper/indirilen uygulama kabulünün yerini tutmaz. Yeni framework/paketleme bağımlılığı eklenmez. macOS'ta `Pofis.app` açılır; profil `~/Library/Application Support/Pofis/` altında tutulur. Tek komutlu macOS kurulum/güncelleme betiği bu Electron altyapısından ayrı, henüz yapılmamış dağıtım işidir.

## Yerel dağıtımı hazırlama

Uygulama simgesinin tek kaynağı [pofi-mark-256.png](../public/pofi/pofi-mark-256.png) dosyasıdır. Pencere ve macOS Dock aynı PNG'yi kullanır. Paketleme, görseli değiştirmeden `dist/electron/icons/` altında ICO ve ICNS üretir; Windows EXE/kısayol simgesine ve macOS uygulama paketine işler.

Geliştirici bilgisayarında Bun 1.4.3 ile:

```powershell
bun install --frozen-lockfile
bun run desktop:package
bun run desktop:release -PackageDirectory dist/windows/Pofis-win32-x64-<zaman>
bun run desktop:serve
```

Paket komutunun yazdığı gerçek klasörü kullanın. Sürüm kök `package.json` dosyasından alınır; yayımlanan bir sürümün içeriği değiştirilmez. Yeni dağıtımda yeni sürüm numarası kullanılır. İlk Electron hazırlaması internet gerektirir. `.env` ve kullanıcı verileri pakete alınmaz. Electron runtime'ı ve Next'in izlediği bağımlılıklar pakette bulunur; ayrı Node/Bun runtime dosyası gerekmez.

Yerel sunucu açıkken Windows PowerShell'de kurulum/güncelleme komutu:

```powershell
& ([scriptblock]::Create((irm http://127.0.0.1:4173/install.ps1).TrimStart([char]0xFEFF))) -ManifestUrl http://127.0.0.1:4173/latest.json
```

Bu komut mevcut Windows hesabına gerçek kurulum yapar ve Pofis'i açar. Sonraki açılışlar Başlat menüsündeki **Pofis** simgesinden yapılır. Güncellemek için aynı komut çalıştırılır. Kurulum sonrası yerel dağıtım sunucusu kapatılabilir.

Hosting yayımlandıktan sonra kullanılabilecek adres (şu an canlı olduğu varsayılmaz):

```powershell
irm https://pofis.app/install.ps1 | iex
```

`install.ps1`, `releases/windows/latest.json` ve manifestin gösterdiği ZIP adresleri yayımlanmalıdır. Cloudflare Pages + GitHub Releases için yerel hazırlık aşağıdadır. İmzasız paketlerde SmartScreen/işletim sistemi uyarıları temiz cihazda ayrıca doğrulanır. SHA-256 indirme bütünlüğünü doğrular; manifestin kaynağı için HTTPS ve yayın hesabının güvenliği gerekir, ücretli kod imzası zorunlu değildir.

## pofis.app yayın hazırlığı

Landing bu depodan ayrılmıştır; varsayılan yerleşim yan yana `Pofis/` ve `pofis-landing/` klasörleridir. Ana uygulama deposu private kalır. Public hedef `mertcreates/pofis-landing`, landing kaynaklarını, installer kopyasını ve manifestleri içerir; ZIP'ler bu deponun GitHub Releases asset'leridir. Git geçmişine veya Pages çıktısına ZIP eklenmez. Ayrı projenin README'si Cloudflare ayarlarını ve yayın sırasını yönetir.

Yerel release üretildikten sonra bu depoda:

```powershell
bun run desktop:site
# Farklı landing konumu:
bun run desktop:site --site C:\Projeler\Mert\pofis-landing
bun test ./scripts/electron/prepare-site.test.cjs
```

[Hazırlama aracı](../scripts/electron/prepare-site.cjs), yerel manifestin gerçek ZIP boyutunu ve SHA-256 değerini doğrular. Hedef public depo adresini landing `package.json` içindeki `repository.url` alanından okur; göreli ZIP adresini `https://github.com/<hesap>/<repo>/releases/download/v<sürüm>/<dosya>.zip` yapar. Yalnız ilgili platformun `public/releases/<hedef>/latest.json` dosyasını ve Windows'ta tek kaynak sahibi [installer'ın](../scripts/electron/install.ps1) `public/install.ps1` kopyasını yazar. Ana kaynaklar ve ZIP kopyalanmaz; hiçbir ağ yayını yapılmaz. Ortak platform tanımı macOS manifest yollarını da belirler; macOS installer kabulü ayrıca bekler.

Landing'de `bun install --frozen-lockfile`, `bun run typecheck` ve `bun run build` çalıştırılır. Build manifest/installer girdilerini ve statik çıktıyı kontrol eder; büyük paketlerin, `.env` dosyalarının ve `node_modules` ağacının siteye eklenmesini reddeder. Footer sürümü manifestten alınır. Kurulum kartı varsayılan macOS ve ikinci Windows PowerShell sekmelerini sunar. macOS installer hazır olana kadar durum metni gösterilir. Windows komutu `irm https://pofis.app/install.ps1 | iex` biçimindedir; HTTP installer kopyası UTF-8 BOM olmadan yazılır, charset=utf-8 başlığıyla sunulur.

Yayın sırası: önce `v<sürüm>` GitHub release asset'i yayımlanır ve anonim indirme doğrulanır; ardından güncel installer/manifest ile Pages sitesi yayımlanır. Pages `out/` dizinini sunar. `public/_headers`, `/install.ps1` ve `/releases/*` için `Cache-Control: no-store` tanımlar. Bu yolları örten başka CDN önbellek kuralı eklenmez. Yerel hazırlık GitHub paketinin varlığını, Cloudflare build ortamını veya HTTPS/DNS kabulünü kanıtlamaz. GitHub/Pages yayını ve DNS değişiklikleri ayrı kullanıcı yetkisi gerektirir.

Pages apex `pofis.app` bağlantısı Cloudflare zone ve nameserver ayarı gerektirir; mevcut DNS kayıtları korunarak ayrı yayın adımında yapılır. Canlı kabulde script/manifestin HTML yerine doğru içeriği döndürdüğü, cache başlıkları, anonim ZIP hash'i ve gerçek Windows kurulum/açılış/güncelleme zinciri doğrulanır. [Pages ayarları](https://developers.cloudflare.com/pages/configuration/build-configuration/), [özel başlıklar](https://developers.cloudflare.com/pages/configuration/headers/), [apex domain koşulları](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## Depo ve çıktı yerleşimi

| Konum | Sorumluluk |
| --- | --- |
| `electron/` | İnce kabuk, başlangıç sonucu ve Node UtilityProcess yaşam döngüsü |
| `scripts/electron/` | Hazırlama, paketleme, kurulum ve tekrar kullanılabilir kabul betikleri |
| `dist/windows/` | Açılmış Windows paketleri |
| `dist/macos/` | Apple Silicon/Intel `.app` paketleri; hedef cihazda üretilir |
| `dist/releases/windows/` | Dağıtılacak `install.ps1`, `latest.json`, sürüm klasörlerinde ZIP ve `manifest.json` |
| `dist/releases/macos/<mimari>/` | Aynı şemadaki manifestler ve `.app` ZIP arşivleri |
| `dist/electron/` | Üretilmiş ICO/ICNS ve geçici kabul çıktıları |

`dist/` Git/Docker bağlamı dışındadır. `.next/` mevcut yerinde kalır. Geliştirmede `bun run desktop:prepare` ardından [Pofis.vbs](../scripts/electron/Pofis.vbs) terminal açmadan kaynak kabuğu başlatır; `bun run desktop` da kullanılabilir.

## Kurulum ve güncelleme sözleşmesi

[Installer](../scripts/electron/install.ps1) Windows/mimari, yazılabilir dizin, manifest sürümü, boyut, SHA-256, arşiv yolları, gerekli dosyalar ve executable mimarisini kontrol eder. HTTPS kullanılır; yalnız yerel test için loopback HTTP kabul edilir. Windows PowerShell 5.1 desteklenir. Arşiv dışına yazma, sembolik bağlantı ve yinelenen dosyalar reddedilir.

- Uygulama `%LOCALAPPDATA%/Programs/Pofis/versions/<kimlik>/` altına kurulur; etkin sürüm `installed.json` ile belirlenir. `install.lock` aynı kökte eşzamanlı işlemleri engeller.
- Güncel sürüm yeniden indirilmez/kurulmaz; dosyaları kontrol edilir, kısayolu onarılır, uygulama açılır veya mevcut pencere öne gelir. Sürüm düşürülmez; aynı sürümün farklı hash taşıması reddedilir.
- Yeni paket `versions/<kimlik>/` altında pasif dizinde hazırlanır. Tüm doğrulamalar geçtikten sonra atomik `installed.json` kaydıyla etkinleştirilir; derin Next dosya yollarını içeren dizin taşınmaz. Pofis çalışıyorsa kullanıcıdan kapatıp komutu tekrar çalıştırması istenir; süreç zorla kapatılmaz, etkin sürüm değiştirilmez.
- Etkinleştirme sonrasında gerçek pencere açılışı doğrulanır. Başarısız açılışta önceki kurulum kaydı/kısayol geri getirilir ve önceki sürüm açılmaya çalışılır. İlk kurulum başarısızsa etkin kurulum kaydı bırakılmaz. Önceki ve hatalı sürüm klasörleri tanı/geri dönüş için korunur; disk temizliği otomatik yapılmaz.
- Profil `%APPDATA%/Pofis/`, sunucu oturumları `sessions/` altındadır. Sürüm dosyalarından bağımsızdır.

Kurulum parametreleri `-ManifestUrl`, `-InstallRoot`, `-ShortcutPath`, `-UserDataDir` izole testlerde kullanılabilir. Profil kurulum kökünün içinde olamaz. Profil ve oturumlar hassastır; Windows kullanıcı izinleriyle korunur.

## Yaşam döngüsü ve sorumluluklar

| Sahip | Davranış |
| --- | --- |
| Installer | İndirme, doğrulama, sürüm etkinleştirme, kısayol ve açılış sonucunun kontrolü |
| [Electron main](../electron/main.cjs) | Tek örnek kilidi; ikinci açılışta mevcut sağlıklı pencereyi gösterme/odaklama; yükleme ve `ready-to-show` sonrasında görünür pencere |
| [Sunucu yöneticisi](../electron/server.cjs) | Electron `utilityProcess.fork` ile ayrı Node sunucusu; boş port seçimi; süreç kimliğiyle readiness; sahip olduğu süreci kapatma |
| [Sunucu giriş noktası](../electron/server-entry.cjs) | Next standalone `server.js` çalıştırma; kapanış mesajında veya ana süreç kaybolursa çıkma |
| Next.js | Mevcut arayüz, API, PDKS adaptörleri ve ürün kuralları |

Sunucu önce `127.0.0.1:3210` portunu kullanır; port doluysa veya sistem erişimi engelliyorsa işletim sisteminin seçtiği boş loopback portuna geçer. Başka uygulamaya bağlanılmaz ve onun süreci kapatılmaz. Tek örnek kilidi ikinci Pofis açılışını mevcut pencereye yönlendirir; porttaki bir HTTP yanıtı Pofis sahipliği kanıtı sayılmaz. `/api/health` JSON sonucu ve her başlatmaya özgü `X-Pofis-Desktop` başlığı birlikte doğrulanır. Sunucuya 30 saniye tanınır. PDKS oturumu bulunmaması başlangıç hatası değildir.

Electron penceresi `http://127.0.0.1:3210` origin'ini korur. Yalnız uygulamanın Electron oturumunda kayıtlı [HTTP protokol işleyicisi](https://www.electronjs.org/docs/latest/api/protocol#protocolhandlescheme-handler), bu adrese gelen istekleri sağlıklı Node sunucusunun gerçek portuna iletir; diğer HTTP origin'lerini reddeder. Böylece port değişiminde localStorage tema/planları ve profil çerezleri aynı yerde kalır. Dış tarayıcıdaki 3210 adresi bu yönlendirmeyi kullanmaz. Başlangıç sonucundaki `origin`, sunucunun gerçek adresidir.

Installer rastgele istek kimliğiyle başlatır. Electron ancak sağlıklı sunucu ve yüklenmiş/gösterilmiş pencere sonrasında `launch-results/<kimlik>.json` yazar. Installer PID, executable, sürüm ve sonucu doğrular; en fazla 45 saniye bekler. Bu dosya kurulumun kendi isteğiyle ilişkilidir ve okunduktan sonra silinir.

Normal çıkış `before-quit` üzerinden sunucuya kapanış mesajı yollar. Sunucu kapanmazsa 2,5 saniye sonra UtilityProcess `kill()`, bir 2,5 saniye sonra yalnız sahip olunan PID için `SIGKILL` uygulanır. Ana Electron süreci beklenmedik kapanırsa sunucu saniyelik ana PID kontrolünde çıkar. İşletim sistemi/donanım çökmesi ayrı gerçek cihaz kabulüdür. Başka uygulamaların süreçlerine dokunulmaz.

Sunucu Windows/macOS'ta aynı UtilityProcess yaşam döngüsünü kullanır; Next uygulaması çalışma sırasında ek sunucu alt süreçleri oluşturmaz. İki platformda da son pencerenin kapanması uygulamayı tamamen kapatır. macOS Dock `activate` olayı mevcut pencereyi öne getirir; temel yerel uygulama/Düzenle menüsü Command-Q ve kopyala/yapıştır kısayollarını sağlar. Tray veya menü çubuğu paneli eklenmez.

Node integration kapalı, context isolation/sandbox açıktır. Origin dışı üst pencere gezinmesi, yeni pencere, webview, indirme ve cihaz izinleri engellenir. UI'ya ayrı ayrıcalıklı köprü eklenmez. PDKS giriş/rapor/yenileme/çıkış mevcut API'lerdedir. Normal kapanış PDKS çıkışı değildir; mevcut [oturum TTL kuralları](rules/session-policy.md) korunur. Tarayıcı profili masaüstüne otomatik aktarılmaz. [Kurum ağı koşulları](deployment.md) geçerlidir.

## Tekrarlanabilir kabul

```powershell
bun run test:desktop
bun run test:desktop:smoke
bun run test:desktop:distribution
# Landing'deki gerçek PowerShell komutu ve public installer kopyası:
bun run test:desktop:distribution --startup-only --site ../pofis-landing
```

[Süreç testleri](../electron/server.test.cjs) izole fixture süreçleriyle timeout/kimlik/port/iptal/temizleme yollarını sınar. [Paket kabulü](../scripts/electron/smoke.cjs) gerçek Electron/Next standalone üzerinde giriş formu, oturum API'si, demo, tek örnek, gezinme sınırı ve profil kalıcılığını kontrol eder; `--source` kaynak kabuğunu açar.

[Platform testleri](../electron/platform.test.cjs) üç hedefin yollarını/manifestlerini ve POSIX süreç grubuna gönderilecek sinyal/hata politikasını kontrol eder. Windows'taki bu testler macOS üzerinde gerçekten `.app`, `PlistBuddy`, `codesign`, `ditto` veya Dock çalıştırıldığı anlamına gelmez. Aynı paket kabul betiği macOS'ta da çalıştırılmalıdır.

[Dağıtım kabulü](../scripts/electron/distribution-test.cjs) Windows PowerShell 5.1, Node/Bun içermeyen PATH, geçici kurulum/profil/kısayol ve gerçek ZIP kullanır. İlk kurulum, otomatik açılış, kısayol, ikinci açılış, aynı sürüm, sürüm yükseltme, açık uygulamada güncelleme, bozuk/eksik indirme, port çakışması, gerçek Node sunucusu başlangıç hatası ve geri dönüş, ana süreç çökmesi, normal kapanış ve veri korumasını sınar. Güncelleme fixture'ları gerçek paketin sürümünü değiştirir; hata fixture'ında gerçek sunucu giriş noktası hata koduyla çıkar. Başarı yanıtı taklidi yapılmaz. Testler gerçek kullanıcı profilini kullanmaz.

`--site` seçeneği landing içeriğindeki Windows komutunu ve public installer kopyasını okur. Public kopyanın canonical installer ile yalnız BOM farkı taşıdığını doğrular. Komutun adresi loopback test sunucusuna çevrilir; indirilen betikte yalnız dört parametrenin varsayılanı izole manifest/kurulum/kısayol/profil yollarıyla değiştirilir. Installer iş akışı ve gerçek ZIP korunur. `--startup-only` ilk kurulum/açılış, port çakışması/ikinci açılış, kurulum kilidi ve kapanışı sınar; tam sürüm yükseltme/geri dönüş kabulü normal komuttadır. Canlı GitHub/HTTPS indirmesi ayrıca doğrulanır.

Gerçek hesapla **PDKS giriş → rapor → yenileme → çıkış**, temiz Windows cihazında ilk kurulum/SmartScreen ve gerçek oturumun sürüm yükseltmede korunması ayrıca [görev listesinde](../tasks/todo.md) doğrulanır. Sentetik oturum dosyasının korunması gerçek hesabın kabulü değildir.

macOS Apple Silicon/Intel üzerinde ortak paketleyicinin çalıştırılması, yerel imza doğrulaması, gerçek süreç/Dock/klavye davranışı ve Gatekeeper kabulü bekler. macOS kurulum betiği ve hosting yayını ayrı dağıtım işleridir. Tray/panel ve arka plan auto-update bu kapsamda yoktur.

API referansları: [Electron app](https://www.electronjs.org/docs/latest/api/app), [Electron paketleme ve macOS bundle düzeni](https://www.electronjs.org/docs/latest/tutorial/application-distribution), [Electron UtilityProcess](https://www.electronjs.org/docs/latest/api/utility-process), [Get-FileHash](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-filehash?view=powershell-5.1).
