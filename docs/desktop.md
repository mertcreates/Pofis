# Pofis masaüstü altyapısı

Pofis, mevcut Next.js standalone uygulamasını Electron'un dahili Node.js runtime'ıyla ayrı bir UtilityProcess içinde çalıştırır. Geliştirme, test ve build Bun kullanır. Windows x64 ve macOS Apple Silicon/Intel aynı Electron, sunucu, paketleme ve manifest kodunu kullanır. Windows kurulumu kullanıcı yetkileriyle, kullanıcı başına yapılır. Windows ve macOS sürümleri aktif kullanımdadır. Yayımlanmış 0.4.0 sürümünün gerçek cihaz ve canlı güncelleme kabulleri kullanıcının 20 Ekim 2026 tarihli teyidiyle tamamlanmıştır.

## Motor ve macOS alt sınırı

Masaüstü hedefleri kilitli `43.8.1` Electron sürümünü kullanır. [Electron 44](https://www.electronjs.org/blog/electron-44-0) macOS alt sınırını 13'e yükseltir; 43 ile hedef alt sınır macOS Monterey 12'dir. İki mimaride Monterey açılış, imza/Gatekeeper ve native kabulü tamamlanmadan bu sürüm için macOS 12 desteği doğrulanmış sayılmaz. Açık kabuller [görev listesinde](../tasks/todo.md) izlenir.

Geçişte Chromium 152'den 150'ye, V8 15.2'den 15.0'a iner; Node 24.22.0 korunur. Electron yerel eklenti ABI'si 149'dan 148'e değişir. Masaüstü sunucusu JavaScript ve statik dosyalardan oluşur. Görseller doğrudan sunulur (`images.unoptimized`); kullanılmayan sharp/libvips bağımlılıkları masaüstü çıktısına alınmaz. Paket kabulü gerçek görsel baytlarını ve Geist fontunun yüklenmesini doğrular.

Tek dağıtım kanalı kullanılır; Linux x64 için dördüncü manifest yolu eklenir. Profil yolu, `app.pofis.client` bundle kimliği, sabit `http://127.0.0.1:3210` origin'i ve veri şemaları korunur. Motor düşerken uygulama sürümü yükselir; installer uygulama sürümünü karşılaştırır. Yeni motordaki özellik gereksinimi ve somut hata/backport durumu değerlendirilir; bakım takvimi tek başına platform kapsamını değiştirmez.

## Ortak platform sözleşmesi

Üretim ölçümü ve ağ sınırları [GA4 sözleşmesindedir](analytics.md).

[Platform tanımı](../electron/platform.cjs) desteklenen işletim sistemi/mimariyi, executable adlarını, kaynak yollarını, çıktı dizinini ve `metadataFile` meta veri yolunu tek yerde belirler. Windows, macOS ve Linux hedefleri ortak uygulama girişini ve iş mantığını kullanır. Her paket hedef işletim sisteminde hazırlanır. macOS'ta ARM64 Bun tek Next çıktısını iki hedefle paylaşır; Electron her hedefin kendi mimarisindedir. Hazırlama, Electron'un platform/mimarisini seçilen paket hedefiyle ve motor sürümünü kök bağımlılıktaki tam sürümle karşılaştırır; farklı hedef veya motor bulunursa paket kopyalanmadan durur. Intel runtime doğrulaması `PlistBuddy` ve `lipo -verify_arch x86_64` ile statik sözleşmeyle yapılır; diğer hedeflerde yerel dinamik sorgu kullanılır. `release.json` meta veri yolu platform tanımındaki `metadataFile` üzerinden ortak yönetilir.

| Hedef | Uygulama | Paket çıktısı | Dağıtım manifesti |
| --- | --- | --- | --- |
| Windows x64 | `Pofis.exe` | `dist/windows/Pofis-win32-x64-<zaman>/` | `dist/releases/windows/latest.json` |
| macOS Apple Silicon | `Pofis.app` | `dist/macos/Pofis-darwin-arm64-<zaman>/` | `dist/releases/macos/arm64/latest.json` |
| macOS Intel | `Pofis.app` | `dist/macos/Pofis-darwin-x64-<zaman>/` | `dist/releases/macos/x64/latest.json` |
| Ubuntu 24.04 LTS x64 | `pofis` | `dist/linux/Pofis-linux-x64-<zaman>/` | `dist/releases/linux/x64/latest.json` |

[Ortak sunucu kontrolü](../scripts/electron/standalone.cjs), Next çıktısında native eklenti/kitaplık uzantılarını ve uzantısız Mach-O/PE/ELF dosyalarını reddeder; Next bağlantılarını da takip eder. Bu kontrol yalnız ortak çıktıyı kullanan Intel paketleyicisinde, sunucu dosyaları kopyalandıktan sonra uygulanır. Yeni bir native sunucu bağımlılığı eklenirse hedef mimariye göre paketleme tasarımı gerekir. [Intel statik kontrolü](../scripts/electron/macos-static-check.cjs), Electron ve helper'lar dahil tüm Mach-O dosyalarında x86_64 mimarisini ve derin imzayı doğrular.

Her hedefte aynı geliştirici komutları kullanılır:

```sh
bun install --frozen-lockfile
bun run desktop:prepare
bun run desktop
bun run desktop:package
bun scripts/electron/release.cjs -PackageDirectory <paket-komutunun-yazdığı-klasör>
bun run test:desktop
bun run test:desktop:smoke <paket-komutunun-yazdığı-klasör>
```

[Derleme betiği](../scripts/electron/build.cjs) `POFIS_STANDALONE=1` ve `POFIS_DESKTOP_BUILD=1` ile Next çıktısını hazırlar; `public` ve `.next/static` dosyalarını standalone klasörüne ekler. SWC yalnız derleme makinesinde çalışır. macOS CI, ARM64'te üretilen taşınabilir çıktıyı `POFIS_SHARED_STANDALONE` yoluyla Intel paketleyicisine verir. Intel için Rosetta veya x64 Bun hazırlığı gerekmez. [Ortak paketleyici](../scripts/electron/package.cjs) çıktıyı `resources/app/server/` altına kopyalar. Intel CI, paketleyiciye `x64`, [ZIP üreticisine](../scripts/electron/release.cjs) `-Arch x64` verir. Yalnız Next'in izlediği üretim bağımlılıkları taşınır; kök `node_modules` ağacı kopyalanmaz. Windows junction bağlantıları dereference edilerek paket kaynak depodan bağımsızlaştırılır. Dağıtım üreticisi tüm hedeflerde aynı manifest şemasını, sürüm kontrolünü ve SHA-256 hesabını kullanır. ZIP üretimi Windows'ta .NET, macOS'ta `ditto` aracına bırakılır; macOS arşivi `.app` izinlerini ve bağlantılarını korur.

Oturum JSON'ları çalışma anında kullanıcı profilinde oluşur. [Depolama adaptörü](../src/server/session-storage.js) bu yolları `path.format` ile oluşturur. Turbopack'in dinamik ``path.join(directory, `${id}.json`)`` ifadesini proje genelindeki JSON dosyalarıyla eşleştirmesi böylece önlenir. Paket içeriğini Next tarafından izlenen üretim bağımlılıkları belirler. Next sürümü veya depolama yolları değiştiğinde yeni standalone/paket içeriği ve oturum kalıcılığı birlikte doğrulanır.

[macOS uyarlaması](../scripts/electron/macos.cjs) `.app` ve helper adlarını, bundle kimliklerini ve sürüm alanlarını düzenler; sistemdeki `codesign` ile Mach-O dosyalarını ve iç bundle’ları içten dışa ad-hoc imzalar; Electron’un dosyaya özgü entitlement ve runtime bayraklarını korur. En son dış `.app` imzalanır; `--deep` yalnız doğrulamada kullanılır. İmza türü ad-hoc imzadır. Gatekeeper davranışı indirilen paketle hedef cihazda doğrulanır. macOS'ta `Pofis.app` açılır; profil `~/Library/Application Support/Pofis/` altında tutulur. [macOS installer](../scripts/electron/install-macos.sh) aynı başlangıç sonucu ve manifest sözleşmesini kullanır.

İmzalanacak yollar önce toplanır ve en derindeki bileşenden dışa doğru sıralanır. Framework içindeki `Helpers` ve `Libraries`, framework ana dosyasından önce imzalanır. Uygulama ve helper ana çalıştırılabilir dosyaları ayrıca imzalanmaz; iç bileşenler tamamlandıktan sonra kapsayıcı `.app` ile birlikte imzalanır. Paketleyicide uygulama klasörü ile ana çalıştırılabilir dosya aynı adı taşır.

Masaüstü standalone derlemesinde `experimental.isrFlushToDisk: false` kullanılır. Next.js çalışma zamanı önbelleği bellekte tutulur; imzalı uygulamanın dosyaları korunur. Paket açılış testi macOS'ta uygulama kapandıktan sonra imzayı yeniden doğrular. Web derlemesinin önbellek ayarı değişmez.

### Masaüstünde ortak metin kaynağı

[Bildirim derlemesi](../scripts/electron/build-notifications.cjs) standalone dizinine `pofis-notifications.cjs`, `ui-text.cjs` ve `preload.cjs` üretir. Ana süreç ve utility process ortak metinleri `ui-text.cjs` üzerinden okur. Sandbox preload yerel modül yükleyemediği için kullandığı metinler kendi derlemesine dahil edilir; metinlerin tek kaynağı [ui-text.js](../src/lib/ui-text.js) olarak kalır. BrowserWindow bu derlenmiş preload dosyasını açar.

## Ubuntu 24.04 LTS x64 ve ortak Unix kurulumu

Linux hedefi Windows/macOS ile aynı Electron kabuğunu, sunucuyu, oturumu, ekranları, mesai kurallarını ve bildirim sahiplerini kullanır. Destek hedefi Ubuntu 24.04 LTS x64, varsayılan GNOME oturumu, etkin Ubuntu AppIndicator desteği ve açık GNOME anahtarlığıdır. Gerçek Ubuntu cihaz kabulü tamamlanana kadar bu hedefin doğrulaması açık kalır; [görev listesi](../tasks/todo.md).

macOS ve Linux aynı komutu kullanır:

```sh
curl -fsSL https://pofis.app/install.sh | bash
```

[Unix üreticisi](../scripts/electron/unix-installer.cjs), [macOS](../scripts/electron/install-macos.sh) ve [Linux](../scripts/electron/install-linux.sh) kaynaklarını tek Bash dosyasında birleştirir. İşletim sistemi dosya değişikliğinden önce seçilir; desteklenmeyen sistem hata ile durur. Betik ikinci bir kod indirmez veya eval kullanmaz. Argümanlar ve platform kurulumunun hata kodu korunur. Site hazırlama her Unix hedefinde aynı kaynak commit’inden aynı ortak dosyayı üretir; Windows komutu kendi installer’ını kullanır.

Linux arşivi izinleri koruyan tar.gz biçimindedir. Installer Ubuntu’nun Python 3 standart kitaplığını kullanır; Node.js, Bun veya pip paketi kurulmaz. İndirmenin boyutu ve SHA-256 değeri doğrulanır; arşivde dizin dışına çıkan yollar, bağlantılar, özel dosyalar ve yinelenen hedefler ilk yazıdan önce reddedilir. Paket kimliği, x64 ELF başlığı ve zorunlu uygulama dosyaları denetlenir. Aynı sürüm farklı hash ile değiştirilemez, sürüm düşürülmez. Kullanıcıya ait uygulama/menü dosyasının üzerine yazılmaz.

Varsayılan kurulum kökü `$XDG_DATA_HOME/pofis` (tanımlı değilse `~/.local/share/pofis`), uygulama `app/pofis`, profil `$XDG_CONFIG_HOME/Pofis` (tanımlı değilse `~/.config/Pofis`) olur. Profil uygulama dosyalarından ayrı tutulur. Menü girdisi veri dizininin `applications/app.pofis.client.desktop` dosyasıdır. Açılışta kullanıcı profili açıkça aktarılır; normal menü açılışı ve installer aynı tek örneği kullanır.

Ubuntu 24.04’ün [AppArmor user namespace kısıtı](https://discourse.ubuntu.com/t/ubuntu-24-04-lts-noble-numbat-release-notes/39890) için installer yalnız kurulu Pofis executable yoluna ait `userns` izni üretir. İlk kurulumda sistem dosyasının yolu ve amacı gösterilir; terminalde açık onay alınır, ardından sudo ile profil yüklenir. Sistem genelindeki koruma veya Electron sandbox’ı kapatılmaz. Onay alınamazsa kurulum uygulama değiştirilmeden durur. Profil güncellemelerde aynı executable yoluna bağlı kalır.

Açık uygulama güncellemeden önce ayrı terminal onayıyla tek örnek köprüsü üzerinden kapatılır; kapanmazsa kaydedilmemiş değişiklik uyarısıyla ikinci zorla kapatma onayı alınır. Süreçler kurulum yolu ve kullanıcı sahipliğiyle seçilir. Yeni sürüm açılış sonucunu 45 saniyede doğrular; başarısız yeni pencere/sunucu kapatıldıktan sonra önceki uygulama ve kurulum kaydı geri alınır. Profil bu işlemlerde silinmez. Kurulum ve kaldırmanın dosya değişimi transaction dizinindeki kayıtla izlenir; işlem ortasında kesilirse sonraki komut tamamlanan değişimi temizler veya önceki uygulamayı geri alır. Kapanmayan aday süreçte önceki paket bu dizinde korunur. Süreç kilidi flock ile tutulur; süreç bittiğinde işletim sistemi kilidi bırakır. Disk kaybına karşı fsync garantisi verilmez.

Telegram bağlantısında Linux `basic_text` ve `unknown` saklama arka uçları reddedilir; GNOME anahtarlığı kullanılabilir olmalıdır. Bildirim/tepsi desteği Ubuntu masaüstünde ayrıca doğrulanır. Linux saklama arka ucunu [ortak güvenli saklama denetimi](../src/desktop/secure-storage.ts) seçer.

Kaldırma:

```sh
bash ~/.local/share/pofis/app/uninstall.sh
```

Kaldırıcı kurulum kaydından profil ve menü yolunu okur; uygulamayı onaylı kapatır, yönetilen uygulama ve menü girdisini kaldırır, profili korur. Özel veri dizininde komutta o dizin kullanılır. AppArmor izni yeniden kurulum için sistemde kalır; yalnız kurulumun gösterdiği executable yoluna uygulanır.

Linux CI ortamı, kabul komutları ve kanıtın sınırları [doğrulama rehberinde](verification.md#linux-ve-ortak-unix-installer-kabulü) yönetilir.

## Pano izinleri

[İzin işleyicisi](../electron/permissions.cjs), yalnız ana Pofis penceresinin `http://127.0.0.1:3210` adresindeki ana çerçevesine `clipboard-sanitized-write` izni verir. Böylece hata ekranındaki **Teknik ayrıntıları kopyala** işlemi tarayıcının pano API'siyle çalışır. Pano okuma, alt çerçeveler, diğer pencereler/adresler ve diğer izinler reddedilir. Hem izin kontrolü hem izin isteği aynı sınırı uygular. Güncelleme komutu aşağıdaki sınırlı IPC köprüsünden kopyalanır; renderer'a Node.js erişimi verilmez.

`bun run test:desktop` izin sınırlarını sınar. `bun scripts/electron/clipboard-smoke.cjs --isolated-desktop`, geçici profilde gerçek Electron ve örnek metinle eski ret politikasındaki hatayı, izinli yazmayı, güncelleme komutunun panoya kopyalanmasını ve pano okuma reddini kontrol eder. Sistem panosu profiller arasında ortaktır; bu komut panoyu temizler ve yalnız geçici CI/VM masaüstünde çalıştırılır. Ortak CI build'i Windows, ARM64 ve Linux hedeflerinde bu kontrolü paketlemeden önce çağırır; Intel CI statik paket kontrolleriyle sınırlıdır. Hedef pakette ayrıca hata ekranı → **Teknik ayrıntıları kopyala** → metin alanına yapıştır zincirini doğrulayın.

## Dış bağlantılar

Alt bilgideki “mertcreates.” bağlantısı [Electron ana sürecinden](../electron/main.cjs), [dış bağlantı işleyicisi](../electron/external-links.cjs) üzerinden varsayılan sistem tarayıcısında açılır. İşleyici yalnız `https://mertcreates.com` origin'ini ve kullanıcı bilgisi içermeyen adresleri kabul eder; diğer hedefler ve yeni Electron pencereleri engellenir. Ana pencerenin uygulama dışına gezinme ve yönlendirme sınırı korunur. Tarayıcı açılamazsa adresi elle açmayı öneren hata bildirimi gösterilir.

`bun run test:desktop` gerçek footer adresinin tarayıcıya aktarılmasını, diğer origin/protokollerin engellenmesini ve tarayıcı açılış hatasını sınar. Paket kabulünde “mertcreates.” bağlantısına tıklayıp sistem tarayıcısının açıldığını ve Pofis penceresinin yerinde kaldığını ayrıca kontrol et.

## Açılışta sürüm denetimi

[Electron ana süreci](../electron/main.cjs), paketli uygulamanın penceresi hazır olduktan 3 saniye sonra [güncelleme denetleyicisini](../electron/updates.cjs) bir kez çalıştırır. Geliştirme açılışı kontrol başlatmaz; ikinci örneğin mevcut pencereyi öne getirmesi yeni kontrol oluşturmaz. Kapanış bekleyen zamanlayıcıyı temizler; devam eden isteğin sonucu kapanan veya hata durumundaki uygulamada bildirim açmaz.

Denetleyici platform tanımından `https://pofis.app/releases/windows/latest.json`, `…/macos/arm64/latest.json` veya `…/macos/x64/latest.json` adresini seçer. Ana sürecin Node `fetch` çağrısı önbelleksiz, kimlik bilgisi göndermeden, yönlendirmeyi reddederek ve 5 saniye zaman aşımıyla çalışır. Mevcut sürüm, kullanıcı kimliği veya PDKS bilgisi isteğe eklenmez.

Manifestin şeması, hedefi, `x.y.z` sürümü, boyutu, SHA-256 biçimi ve beklenen public GitHub paket adresi doğrulanır. Sürüm bileşenleri sayısal karşılaştırılır. Daha yeni sürümde giriş ekranında sürüm numarasının yanında, oturum açıkken menünün alt bölümünde **Yeni sürüm var** düğmesi görünür. Düğme ortak [güncelleme modalını](../src/components/shell/desktop-update.tsx) açar:

- **Pofis'in yeni sürümü hazır** — kurulu ve yeni sürüm ile kurulum komutunu yeniden çalıştırma açıklaması.
- **Komutu kopyala** platformun sabit komutunu panoya yazar; başarıda **Kopyalandı** görünür. Sonuç, başlangıçtan beri DOM'da bulunan durum alanından ekran okuyucuya bildirilir. Modal Windows için PowerShell, macOS için Terminal yönlendirmesi sunar. Kopyalama başarısızsa görünen komut elle seçilebilir. Komut manifestten alınmaz; çalıştırmayı kullanıcı başlatır.
- **Daha sonra**, Escape ve kapatma düğmesi modalı kapatır; güncelleme düğmesi erişilebilir kalır. Açılışta modal kendiliğinden açılmaz.

[Preload](../electron/preload.cjs), yalnız sürüm bilgisini okuma, değişikliği dinleme ve sabit komutu kopyalama işlemlerini açar. [IPC sahibi](../electron/update-bridge.cjs), her istekte paketli uygulamayı, pencereyi, ana çerçeveyi ve uygulama origin'ini doğrular. Güncelleme bilgisi ana süreçte saklanır; sayfa yenilenince tekrar okunur. Web ve normal geliştirme açılışında köprü yüklenmez. `contextIsolation`, sandbox ve kapalı Node entegrasyonu korunur.

Aynı veya eski sürüm bildirim açmaz. Ağ, HTTP, JSON veya doğrulama hatası açılışı durdurmaz; yalnız genel bir konsol uyarısı yazılır. Kurulum komutu çalıştırıldığında aşağıdaki onaylı kapanış ve kurulum akışı uygulanır. [Denetleyici testleri](../electron/updates.test.cjs) dört hedefi, sayısal karşılaştırmayı, iptali, kapanışı, geçersiz yanıtları ve zaman aşımını kapsar.

### Güncelleme bildirimini deneme

`bun scripts/electron/update-demo.cjs`, [yerel demo başlatıcısıyla](../scripts/electron/update-demo.cjs) ortak uygulama arayüzünü gerçek Electron ve preload üzerinden örnek `0.1.0 → 0.1.1` sürümleriyle açar. Önce `bun run desktop:prepare` ile güncel standalone çıktısını hazırla. Demo ayrı geçici profil ve örnek manifest kullanır; ölçüm trafiğini engeller. Pencere kapatılınca profil temizlenir. **Komutu kopyala** gerçek platform komutunu panoya yazar. `--verify` seçeneği panoyu değiştirmeyen test yazıcısıyla düğme → modal → kopyalama → Daha sonra → odak dönüşü zincirini kontrol edip kapanır. Gerçek sistem panosu kabulü izole CI/VM masaüstündeki pano betiğinde sürer.

Kabul betiği arayüz ve IPC sonuçlarını koşul gerçekleşene kadar bekler; her durum için 10 saniye, tüm Electron kabulü için 90 saniye sınırı vardır. Kopyalama hatası senaryosunda ana süreçte görünen **Test pano hatası** kaydı beklenen test girdisidir. `--capture` görsel çıktıları kabul zincirinin sonunda `work/update-preview/` altına alır; incelemeden sonra temizle.

## Yerel dağıtımı hazırlama

Uygulama simgesinin tek kaynağı [pofi-mark-256.png](../public/pofi/pofi-mark-256.png) dosyasıdır. Pencere ve macOS Dock aynı PNG'yi kullanır. Paketleme, görseli değiştirmeden `dist/electron/icons/` altında ICO ve ICNS üretir; Windows EXE/kısayol simgesine ve macOS uygulama paketine işler.

Windows paketinde EXE ürün adı ve dosya açıklaması **Pofis** olarak işlenir. Electron 43 bildirim kısayolunun adını bu ürün bilgisinden okur; yalnız `app.setName` çağrısı yeterli değildir. `bun test ./scripts/electron/windows-branding.test.cjs` gerçek Electron EXE kopyasında Pofis adı/ikonu ile korunan motor sürümünü doğrular. Bildirim başlık, gövde ve kanal kimliği [bildirim sözleşmesindedir](rules/notifications.md#sunum-ve-uygulama-kimliği).

Geliştirici bilgisayarında Bun 1.4.3 ile:

```powershell
bun install --frozen-lockfile
bun run desktop:package
bun scripts/electron/release.cjs -PackageDirectory dist/windows/Pofis-win32-x64-<zaman>
bun scripts/electron/serve-releases.cjs
```

Paket komutunun yazdığı gerçek klasörü kullanın. Sürüm kök `package.json` dosyasından alınır; yayımlanan bir sürümün içeriği değiştirilmez. Yeni dağıtımda yeni sürüm numarası kullanılır. İlk Electron hazırlaması internet gerektirir. `.env` ve kullanıcı verileri pakete alınmaz. Electron runtime'ı ve Next'in izlediği bağımlılıklar pakette bulunur; ayrı Node/Bun runtime dosyası gerekmez.

Yerel sunucu açıkken Windows PowerShell'de kurulum/güncelleme komutu:

```powershell
& ([scriptblock]::Create((irm http://127.0.0.1:4173/install.ps1).TrimStart([char]0xFEFF))) -ManifestUrl http://127.0.0.1:4173/latest.json
```

Bu komut mevcut Windows hesabına gerçek kurulum yapar ve Pofis'i açar. Sonraki açılışlar Başlat menüsündeki **Pofis** simgesinden yapılır. Güncellemek için aynı komut çalıştırılır. Kurulum sonrası yerel dağıtım sunucusu kapatılabilir.

### Kendi bilgisayarında geliştirme sürümünü deneme

Yukarıdaki yerel dağıtım akışı çalışma ağacını paketleyip installer üzerinden kurar. Bildirim kanalları kurulumdan sonra **Bildirimler** menüsündeki deneme düğmeleriyle kontrol edilebilir.

Kurulu sürüm ile geliştirme sürümü aynı numaradaysa farklı paket içeriği için yeni sürüm numarası gerekir. Hızlı denemede `bun run desktop:package` çıktısındaki `Pofis.exe`yi ayrı profille açabilirsin:

```powershell
& '<paket-komutunun-yazdığı-klasör>\Pofis.exe' "--user-data-dir=$env:APPDATA\Pofis-Test"
```

Bu profil kendi girişini, planlarını ve bildirim tercihlerini tutar. Windows native bildirimlerinin Başlat menüsü kısayolu/uygulama kimliği kabulü installer ile kurulan pakette yapılır.

`desktop:install`, geliştirme bağımlılığı olan Electron runtime'ını indirir. Kullanıcı hesabına Pofis kurulumu yukarıdaki `install.ps1` komutuyla yapılır.

Canlı Windows kurulum ve güncelleme komutu:

```powershell
irm https://pofis.app/install.ps1 | iex
```

`install.ps1`, `releases/windows/latest.json` ve manifestin gösterdiği ZIP adresleri yayımlanmalıdır. Cloudflare Workers + GitHub Releases için yerel hazırlık aşağıdadır. İmzasız paketlerde SmartScreen/işletim sistemi uyarıları temiz cihazda ayrıca doğrulanır. SHA-256 indirme bütünlüğünü doğrular; manifestin kaynağı için HTTPS ve yayın hesabının güvenliği gerekir, paket ad-hoc/imzasız dağıtım modelini kullanır.

## pofis.app yayın hazırlığı

Landing varsayılan olarak kardeş `pofis-landing/` klasöründedir. Public depo, paket barındırma, Cloudflare ve yayın sırası [sürüm rehberinde](release.md) yönetilir.

Yerel release üretildikten sonra bu depoda:

```powershell
bun scripts/electron/prepare-site.cjs
# Farklı landing konumu:
bun scripts/electron/prepare-site.cjs --site C:\Projeler\Mert\pofis-landing
bun test ./scripts/electron/prepare-site.test.cjs
```

[Hazırlama aracı](../scripts/electron/prepare-site.cjs), yerel manifestin gerçek paket boyutunu ve SHA-256 değerini doğrular. Hedef public depo adresini landing `package.json` içindeki `repository.url` alanından okur; göreli arşiv adresini GitHub Releases HTTPS adresine çevirir; Windows/macOS için ZIP, Linux için tar.gz uzantısını platform sahibinden alır. Yalnız ilgili platformun `public/releases/<hedef>/latest.json` dosyasını ve Windows installer’ını ya da üretilen ortak Unix installer’ını (`install.sh`) yazar. Çıktı, landing deposundaki manifest ve installer dosyalarıdır; yayın [sürüm akışında](release.md) gerçekleştirilir.

Yerel hazırlık dosyaları üretir. Canlı paket, anonim indirme ve HTTPS kabulü kullanıcı yetkisiyle başlatılan [yayın akışında](release.md#bir-sürüm-yayımlama) yapılır.

## Depo ve çıktı yerleşimi

| Konum | Sorumluluk |
| --- | --- |
| `electron/` | İnce kabuk, başlangıç sonucu ve Node UtilityProcess yaşam döngüsü |
| `scripts/electron/` | Hazırlama, paketleme, kurulum ve tekrar kullanılabilir kabul betikleri |
| `dist/windows/` | Açılmış Windows paketleri |
| `dist/macos/` | Apple Silicon/Intel `.app` paketleri; CI iki mimariyi tek Apple Silicon runner'da ayrı ortamlarda üretir |
| `dist/releases/windows/` | Dağıtılacak `install.ps1`, `latest.json`, sürüm klasörlerinde ZIP ve `manifest.json` |
| `dist/releases/macos/<mimari>/` | Aynı şemadaki manifestler ve `.app` ZIP arşivleri |
| `dist/electron/` | Üretilmiş ICO/ICNS ve geçici kabul çıktıları |

`dist/` Git/Docker bağlamı dışındadır. `.next/` mevcut yerinde kalır. Geliştirmede `bun run desktop:prepare` ardından [Pofis.vbs](../scripts/electron/Pofis.vbs) terminal açmadan kaynak kabuğu başlatır; `bun run desktop` da kullanılabilir.

## Kurulum ve güncelleme sözleşmesi

[Installer](../scripts/electron/install.ps1) Windows/mimari, yazılabilir dizin, manifest sürümü, boyut, SHA-256, arşiv yolları, gerekli dosyalar ve executable mimarisini kontrol eder. HTTPS kullanılır; yalnız yerel test için loopback HTTP kabul edilir. Arşiv sistemdeki `System32/tar.exe` ile açılır; araç bulunmazsa .NET açıcı kullanılır. Windows PowerShell 5.1 desteklenir. Tek komutlu kurulum `Restricted` yürütme politikası altında da çalışır; doğrulanmış paketin temizlik fonksiyonlarını bellekten yükler ve sistemin yürütme politikasını değiştirmez. Arşiv dışına yazma, sembolik bağlantı ve yinelenen dosyalar reddedilir.

- Uygulama `%LOCALAPPDATA%/Programs/Pofis/versions/<kimlik>/` altına kurulur; etkin sürüm `installed.json` ile belirlenir. `install.lock` aynı kökte eşzamanlı işlemleri engeller.
- Güncel sürüm yeniden indirilmez/kurulmaz; dosyaları kontrol edilir, kısayolu onarılır, uygulama açılır veya mevcut pencere öne gelir. Sürüm düşürülmez; aynı sürümün farklı hash taşıması reddedilir.
- Yeni paket `versions/<kimlik>/` altında pasif dizinde hazırlanır. Tüm doğrulamalar ve aşağıdaki onaylı kapanış geçtikten sonra dizin kendi konumunda korunarak atomik `installed.json` kaydıyla etkinleştirilir.
- Kayıt yazımında geçici Windows paylaşım/kilit hataları en fazla beş kez, 150 ms aralıkla denenir. Kalıcı hatada Windows hata kodu gösterilir; geçici kayıt temizlenir ve mevcut etkin kayıt korunur.
- Paket doğrulanıp açık Pofis kapatıldıktan sonra yeni sürüm etkinleştirilir; eski sürüm klasörleri pencere açılışını beklemeden kaldırılır. Açılış hatası kullanıcıya bildirilir ve kurtarma kullanıcı tarafından başlatılır. İndirme veya bütünlük hatasında mevcut kurulum korunur.
- Profil `%APPDATA%/Pofis/`, sunucu oturumları `sessions/` altındadır. Sürüm dosyalarından bağımsızdır.

Kurulum parametreleri `-ManifestUrl`, `-InstallRoot`, `-ShortcutPath`, `-UserDataDir` izole testlerde kullanılabilir. Profil kurulum kökünün içinde olamaz. Profil ve oturumlar hassastır; Windows kullanıcı izinleriyle korunur.

### Açık uygulamada onaylı güncelleme

Windows ve macOS installer'ları yeni paketi indirip doğruladıktan sonra çalışan Pofis için boş satır, ASCII kedi ve çizgilerle ayrılan **Pofis | Uygulama açık** bölümünü gösterir. **Yeni sürüm hazır. Devam etmek için açık Pofis kapanacak.** açıklamasının altında `e = Uygulamayı kapat ve güncellemeye devam et` ve `h veya Enter = Güncellemeyi iptal et` seçenekleri yer alır. **Seçimin [e/H]** sorusunda yalnız `e` veya `evet` yanıtı onaydır; boş yanıt ve diğer yanıtlar iptaldir. Aynı sürümde mevcut uygulama açık kalır. Sistem mesajları [Pofis ton rehberini](brand/pofi-tone-guide.md) izler.

Windows terminalinde `bun scripts/electron/install-close-demo.cjs` normal kapanışı, `bun scripts/electron/install-close-demo.cjs --force` normal kapanışın sonuçlanmadığı ikinci onayı gösterir. Her soruda `e`, `h` veya Enter denenebilir. `--preview` eklenirse sorular otomatik `e` yanıtıyla görüntülenir. [Demo](../scripts/electron/install-close-demo.ps1), gerçek installer fonksiyonlarını yükler ve süreç işlemlerini taklit eder; indirme, kurulum, profil erişimi veya gerçek uygulama kapatma yapmaz. [Başlatıcı](../scripts/electron/install-close-demo.cjs) mevcut PowerShell yürütme ilkesini değiştirmeden çalışır.

- İlk onaydan sonra Windows ilgili executable ve profil için `--pofis-quit` isteği gönderir; eski sürümler için pencere kapanışı da istenir; macOS tam uygulama yoluna AppleScript `quit` isteği gönderir. Electron'un normal kapanışı yerel sunucuyu da durdurur. Installer süreçlerin bitmesini en fazla 10 saniye bekler; macOS quit isteğinin kendi zaman aşımı 5 saniyedir.
- Süreçler bitmezse **Pofis | Zorla kapatma onayı** bölümünde **Pofis henüz kapanmadı. Zorla kapatılsın mı?** sorusu ayrıca sorulur ve ayrı satırda kaydedilmemiş değişikliklerin kaybolabileceği açıklanır. `e` seçeneği zorla kapatıp güncellemeye devam edeceğini belirtir. İkinci açık onaydan sonra yalnız ilgili kurulum yolundaki Pofis ve yardımcı süreçler zorla kapatılır; süreç seçimi kurulum yoluyla sınırlandırılır. Yeni sürüm, bu süreçler bittikten sonra etkinleştirilir.
- İlk sorunun iptalinde uygulama çalışmaya devam eder. İkinci sorunun iptalinde güncelleme durur; normal kapanış isteği daha önce gönderilmiş olabilir. İki durumda da kurulu sürüm kaydı ve profil korunur, geçici paket temizlenir ve kurulum başarısız sonuçla durur.
- Güncellemenin devamı açık kullanıcı yanıtına bağlıdır. PowerShell `-NonInteractive` modunda durur. macOS, terminal çıktısı ve `/dev/tty` üzerinden yanıt alır. Etkileşimsiz çalıştırmada Pofis önce elle kapatılır.
- Güncellemeden sonra mevcut başlangıç sonucu sözleşmesi yeni sürümün gerçek PID, executable ve görünür pencere sonucunu doğrular. Kurtarma kullanıcı tarafından başlatılır.

## macOS kurulum ve güncellemesi

```sh
curl -fsSL https://pofis.app/install.sh | bash
```

[Installer](../scripts/electron/install-macos.sh) macOS'un Bash 3.2 ve sistem araçlarını kullanır; Node/Bun, Homebrew, Xcode veya sudo istemez. Kurulum komutu indirilen betiği Bash ile çalıştırır. Rosetta altında da Apple Silicon donanımını tanır; Intel için x64 manifestini seçer. Sistem/paket sürümü ve mimarisi, gerekli dosyalar, ad-hoc imza, ZIP boyutu/SHA-256, arşiv yolları ve `.app` içi sembolik bağlantılar doğrulanır. Sistem `bsdtar` arşivden dizin dışına veya güvensiz bağlantı üzerinden yazmayı reddeder. Quarantine nitelikleri kaldırılmaz.

- Gerçek uygulama paketi `~/Applications/Pofis.app` konumundadır. Kurulum kaydı `~/Library/Application Support/Pofis Installer/installed.json` dosyasıdır. Yeni paket geçici `versions/<kimlik>/` dizininde doğrulanır, uygulama konumuna taşınır ve eski paket açılış beklenmeden temizlenir. Installer'ın yönetmediği mevcut uygulamada kurulum durur ve mevcut paket korunur.
- Profil ve oturumlar `~/Library/Application Support/Pofis/` altında kalır. Güncelleme bu dizini taşımaz veya silmez. Profil ve kurulum dizinleri birbirinin içinde olamaz.
- Aynı sürüm/hash yeniden indirilmez; paket ve pencere doğrulanıp mevcut Pofis öne getirilir. Sürüm düşürme ve aynı sürümde farklı hash reddedilir.
- Güncelleme ayrı dizinde hazırlanır. Bu kurulumun Pofis/yardımcı süreçleri açıksa [onaylı kapanış](#açık-uygulamada-onaylı-güncelleme) uygulanır. Kontroller tamamlandığında uygulama simgesi yeni sürüme çevrilir.
- `open -n` istek kimliğini Electron'a ulaştırır; tek örnek kilidi ikinci sunucuyu engeller. Installer 45 saniye içinde gerçek sürüm/PID/executable ve görünür pencere sonucunu doğrular. Electron hata sonucu döndürürse istek kimliği ve sürümü doğrulandıktan sonra özgün hata mesajı gösterilir; kurulum başarısız çıkar. Başarı için sürüm, süreç kimliği ve görünür pencere sonucu birlikte doğrulanır.
- Dosya taşıma veya kurulum kaydını yazma başarısızsa mevcut uygulama geri yerleştirilir. Yeni sürüm etkinleştikten sonra açılış hatası açıkça bildirilir; eski paket temizlenir ve kurtarma kullanıcı tarafından başlatılır. Kullanıcı verileri korunur.
- Atomik `install.lock` dizini eşzamanlı installer'ları engeller; normal hata/sinyalde kaldırılır. Installer SIGKILL veya sistem çökmesiyle durduysa, başka kurulum çalışmadığı doğrulandıktan sonra mesajda verilen kilit dizini elle kaldırılır. Kilidin kapsamı installer çalıştırmalarıdır.

İzole kabul için `--manifest-url`, `--install-root`, `--app-path`, `--user-data-dir` kullanılabilir; yerel testte loopback HTTP desteklenir. Gatekeeper açılışı engellerse sistemin güvenlik kararı korunur ve anlaşılır hata gösterilir. Apple Silicon CI runner'ı [macOS dağıtım kabulünü](../scripts/electron/macos-distribution-test.cjs) ARM64 ZIP ve gerçek Electron/Next süreçleriyle çalıştırır. Intel paketi aynı Next çıktısı ve x64 Electron ile hazırlanıp statik olarak doğrulanır; Intel açılış/kurulum/güncelleme kabulü otomatik çalışmaz.

## Kaldırma

- Windows: **Ayarlar → Uygulamalar → Yüklü uygulamalar → Pofis → Kaldır**. Kullanıcı başına kayıt `HKCU` altında kullanıcı yetkileriyle oluşturulur. Kaldırıcı onay ister, açık Pofis varsa kapatılmasını söyler ve yalnız yönettiği sürüm dosyalarını, Başlat menüsü kısayolunu ve kaldırma kaydını temizler.
- macOS: Pofis'ten çıkıp Finder'da `~/Applications/Pofis.app` uygulamasını **Çöp Sepeti’ne taşı**. Gerçek `.app` bütün Electron/Next dosyalarını içerir; sürüm arşivi bırakılmaz. Küçük installer kaydı kullanıcı Library dizininde kalabilir; aynı komutla yeniden kurulum desteklenir.
- İki platformda da kullanıcı ayarları, tarayıcı profili ve oturum dosyaları korunur. Kaldırma işletim sisteminin yukarıdaki adımlarıyla yapılır.

## Yaşam döngüsü ve sorumluluklar

| Sahip | Davranış |
| --- | --- |
| Installer | İndirme, doğrulama, sürüm etkinleştirme, kısayol ve açılış sonucunun kontrolü |
| [Electron main](../electron/main.cjs) | Tek örnek kilidi; ikinci açılışta mevcut sağlıklı pencereyi gösterme/odaklama; yükleme ve `ready-to-show` sonrasında görünür pencere |
| [Sunucu yöneticisi](../electron/server.cjs) | Electron `utilityProcess.fork` ile ayrı Node sunucusu; boş port seçimi; süreç kimliğiyle readiness; sahip olduğu süreci kapatma |
| [Sunucu giriş noktası](../electron/server-entry.cjs) | Next standalone `server.js` çalıştırma; kapanış mesajında veya ana süreç kaybolursa çıkma |
| Next.js | Mevcut arayüz, API, PDKS adaptörleri ve ürün kuralları |

Sunucu önce `127.0.0.1:3210` portunu kullanır; port doluysa veya sistem erişimi engelliyorsa işletim sisteminin seçtiği boş loopback portuna geçer. Bağlantı ve süreç yönetimi Pofis'in başlattığı sunucuyla sınırlıdır. Tek örnek kilidi ikinci Pofis açılışını mevcut pencereye yönlendirir. `/api/health` JSON sonucu ve her başlatmaya özgü `X-Pofis-Desktop` başlığı birlikte doğrulanır. Sunucuya 30 saniye tanınır. PDKS oturumu bulunmadığında giriş ekranı açılır.

Electron penceresi `http://127.0.0.1:3210` origin'ini korur. Yalnız uygulamanın Electron oturumunda kayıtlı [HTTP taşıma adaptörü](../electron/transport.cjs), bu adrese gelen istekleri sağlıklı Node sunucusunun gerçek portuna iletir; diğer HTTP origin’lerini reddeder. Sabit uygulama Origin başlığı dahili istekte gerçek sunucu origin’ine uyarlanır; yabancı Origin başlıkları değiştirilmez. Böylece Chromium’un iç ağ isteğindeki CORS kontrolü, port değişiminde fontları reddetmez. Dış pencere adresi ve çerez profili korunur. Böylece port değişiminde localStorage tema/planları ve profil çerezleri aynı yerde kalır. Dış tarayıcıdaki 3210 adresi bu yönlendirmeyi kullanmaz. Başlangıç sonucundaki `origin`, sunucunun gerçek adresidir. [Taşıma testi](../electron/transport.test.cjs), gerçek Electron’da farklı porttan font yüklemesini, HttpOnly çerez devamını, POST gövdesini ve sabit pencere origin’ini doğrular; eski Origin başlığı bilerek korunduğunda regresyon testi başarısız olur.

Installer rastgele istek kimliğiyle başlatır. Electron ancak sağlıklı sunucu ve yüklenmiş/gösterilmiş pencere sonrasında `launch-results/<kimlik>.json` yazar. Installer PID, executable, sürüm ve sonucu doğrular; en fazla 45 saniye bekler. Bu dosya kurulumun kendi isteğiyle ilişkilidir ve okunduktan sonra silinir.

Normal çıkış `before-quit` üzerinden sunucuya kapanış mesajı yollar. Sunucu kapanmazsa 2,5 saniye sonra UtilityProcess `kill()`, bir 2,5 saniye sonra yalnız sahip olunan PID için `SIGKILL` uygulanır. Ana Electron süreci beklenmedik kapanırsa sunucu saniyelik ana PID kontrolünde çıkar. İşletim sistemi/donanım çökmesi ayrı gerçek cihaz kabulüdür. Süreç yönetimi uygulamanın sahip olduğu PID'lerle sınırlıdır.

Sunucu Windows/macOS'ta aynı UtilityProcess yaşam döngüsünü kullanır; Next uygulaması tek sunucu sürecinde çalışır. Pencere kapatılınca Pofis Windows sistem tepsisinde veya macOS menü çubuğunda çalışır. Simge menüsündeki **Pofis’i aç** pencereyi gösterir; **Pofis’ten çık** uygulamayı ve sunucuyu sonlandırır. Command-Q gerçek çıkış yapar. macOS Dock `activate` olayı mevcut pencereyi öne getirir; temel yerel uygulama/Düzenle menüsü Command-Q ve kopyala/yapıştır kısayollarını sağlar. Uygulamanın yaşam döngüsü pencere ve Dock üzerinden yönetilir.

Node integration kapalı, context isolation/sandbox açıktır. Origin dışı üst pencere gezinmesi, yeni pencere, webview, indirme ve cihaz izinleri engellenir. PDKS giriş/rapor/yenileme/çıkış mevcut API'lerdedir. Normal kapanışta [oturum TTL kuralları](rules/session-policy.md) korunur. Masaüstü kendi kullanıcı profilini kullanır. [Kurum ağı koşulları](deployment.md) geçerlidir.

## Mesai bildirimleri

Menüdeki **Bildirimler** hatırlatma tercihlerini açar. Kanal bağlantısı, rapor yenilemesi, heartbeat, şifreli saklama ve tekrar kontrolü [bildirim sözleşmesinde](rules/notifications.md) yönetilir. Komutlar ve fixture/gerçek cihaz ayrımı [doğrulama rehberindedir](verification.md#masaüstü-kabulü).

## Tekrarlanabilir kabul

```powershell
bun run test:desktop
bun run test:desktop:smoke
bun run test:desktop:distribution
# Landing'deki gerçek PowerShell komutu ve public installer kopyası:
bun run test:desktop:distribution --startup-only --site ../pofis-landing
```

[Süreç testleri](../electron/server.test.cjs) izole fixture süreçleriyle timeout/kimlik/port/iptal/temizleme yollarını sınar. [Paket kabulü](../scripts/electron/smoke.cjs) gerçek Electron/Next standalone üzerinde görsel baytları ve font yüklenmesi, giriş formu, oturum API'si, demo, tek örnek, gezinme sınırı ve profil kalıcılığını kontrol eder; `--source` kaynak kabuğunu açar.

[Platform testleri](../electron/platform.test.cjs) dört hedefin yollarını/manifestlerini ve POSIX süreç grubuna gönderilecek sinyal/hata politikasını kontrol eder. macOS sistem araçları, `.app` ve Dock davranışı aynı paket kabul betiğiyle native macOS ortamında doğrulanır.

[Dağıtım kabulü](../scripts/electron/distribution-test.cjs) Windows PowerShell 5.1, Node/Bun içermeyen PATH, geçici kurulum/profil/kısayol ve gerçek ZIP kullanır. İlk kurulum, otomatik açılış, kısayol, ikinci açılış, aynı sürüm, sürüm yükseltme, açık uygulamada güncelleme, bozuk/eksik indirme, port çakışması, gerçek Node sunucusu başlangıç hatası, eski sürüm temizliği ve kaldırma, ana süreç çökmesi, normal kapanış ve veri korumasını sınar. Güncelleme fixture'ları gerçek paketin sürümünü değiştirir; hata fixture'ında gerçek sunucu giriş noktası hata koduyla çıkar. Başarı gerçek süreç ve pencere sonucuyla belirlenir. Testler yalnız geçici kullanıcı profillerini kullanır.

Güncelleme/veri koruma ile başlangıç hatası/onarım zincirleri ayrı kurulum, profil ve kayıt yollarında birlikte çalışır. Güncelleme zinciri bir, onarım zinciri iki fixture ZIP'i üretir; her grup yalnız kullandığı arşivleri hazırlar. Ortak fixture sunucusu iki zincir tamamlanana kadar 3210'u dolu tutar; uygulamalar ayrı geçici portlara geçer. Her zincir kendi uygulamasının başlangıç sonucundaki executable/sürüm/port bilgisini ve sağlık kimliğini doğrular. Onarım zinciri port çakışması, kurulum kilidi ve kaldırma kontrollerini kendi kurulumunda tamamlar. Fixture sunucusunun iki zincir sonrasında yanıt verdiği de doğrulanır. Uygulamadan çıkış isteği ve süreçlerin bitmesini bekleme aynı PowerShell sürecinde yapılır. Üretilen kısayol CDP portu argümanıyla açılır; aynı pencerede tema/plan kaydı hazırlanır. CDP hedefi ve hazır belge beklenir, ardından mevcut uygulamanın başlangıç sonucu ve süreç kimliği doğrulanır. Onarılmış sürümün ilk açılışı, dolu port kabulünü de tamamlar. İki zincir de başarılı olduğunda kabul tamamlanır. Windows installer ZIP'i .NET akışıyla dosyaya yazar; son yönlendirme adresi, zaman aşımı, boyut ve SHA-256 kontrolleri uygulanır.

`--site` seçeneği landing içeriğindeki Windows komutunu ve public installer kopyasını okur. Public kopyanın canonical installer ile yalnız BOM farkı taşıdığını doğrular. Komutun adresi loopback test sunucusuna çevrilir; indirilen betikte yalnız beş parametrenin varsayılanı izole manifest/kurulum/kısayol/profil yollarıyla değiştirilir. Installer iş akışı ve gerçek ZIP korunur. İlk kurulum ve aynı sürümün tekrar açılışı `Restricted` politikası altında çalıştırılır. `--startup-only` bu iki akışı, port çakışması/ikinci açılış, kurulum kilidi, kapanış ve kaldırmayı sınar; tam sürüm yükseltme kabulü normal komuttadır. Canlı GitHub/HTTPS indirmesi ayrıca doğrulanır.

Yeni sürümlerde etkilenen yollar aynı kabul yöntemiyle kontrol edilir. Bekleyen cihaz ve PDKS senaryoları [görev listesinde](../tasks/todo.md) izlenir.

### Motor geçişi kabulü

Her hedefte hash'i doğrulanmış önceki gerçek yayını ve yeni paketi kullanın:

```sh
bun run test:desktop:smoke <yeni-paket-klasörü> --from <önceki-paket-klasörü>
# Windows'ta gerçek eski ZIP → yeni yerel ZIP installer kabulü:
bun run test:desktop:distribution --from-release <önceki-yayının-yerel-latest.json-dosyası>
```

`--from`, iki farklı motoru aynı geçici profilde açar; tema, canlı/demo planları, HttpOnly/Strict çerez, sunucu oturum dosyasının gerçek `/api/session` tarafından yüklenmesi ve bitiş zamanının korunmasını kontrol eder. Sentetik çerez UI isteklerinden ayrı bir yola aittir; API kabulü token'ı doğrudan yerel sunucuya gönderir, gerçek PDKS'e bağlanmaz. Bu kontrol gerçek kurum oturumunun geçerliliğini kanıtlamaz. `--from-release` girdisinin ZIP'i manifestle aynı klasörde bulunmalı; indirme boyutu/hash'i gerçek installer tarafından da doğrulanır. Bu seçenekle ilk güncelleme yeni gerçek pakete yapılır; hata ve toparlanma senaryolarında mevcut sürüm fixture'ları kullanılır.

macOS 12'de ilk kurulum ve 43 → 43 uygulama güncellemesini; macOS 13+ üzerinde her iki mimaride 44 → 43 profil geçişini sınayın. `macos-15` CI sonucu Monterey çalışma kanıtı değildir. Installer yeni sürümün açılış hatasında otomatik eski motora dönmez; veri korunarak daha yüksek uygulama sürümüyle onarım yapılır. 44'e dönüş macOS 12 kapsamını değiştireceğinden ayrıca kullanıcı kararı gerektirir.

Güncelleme akışı açılış bildirimi, platform komutunun kopyalanması ve installer'ın kullanıcı tarafından çalıştırılmasıyla tamamlanır.

API referansları: [Electron app](https://www.electronjs.org/docs/latest/api/app), [Electron paketleme ve macOS bundle düzeni](https://www.electronjs.org/docs/latest/tutorial/application-distribution), [Electron UtilityProcess](https://www.electronjs.org/docs/latest/api/utility-process), [Get-FileHash](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-filehash?view=powershell-5.1).

Kaldırma referansları: [Apple: Mac uygulamalarını kaldırma](https://support.apple.com/en-us/102610), [Microsoft: kaldırma kaydı alanları](https://learn.microsoft.com/en-us/windows/win32/msi/uninstall-registry-key).
