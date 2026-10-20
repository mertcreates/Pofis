# Electron 43 ile macOS 12 desteğine geçiş planı

Durum: **Yerel geçiş uygulandı; macOS native kabulü ve yayın bekliyor.**

Audit tarihi: 20 Ekim 2026. İncelenen kaynak commit'i: `891656c7f1b9d0aa7d381958a11b0b10d10739fe`.

## 1. Amaç ve kapsam

Pofis'in tek dağıtım kanalını koruyarak Windows x64, macOS Apple Silicon ve macOS Intel paketlerini aynı Electron 43 sürümüyle üretmek; masaüstü macOS kapsamını Monterey 12 ailesine genişletmek.

Kullanıcı yönlendirmesi: tek kanal devam edecek. Electron bakımının biteceği tarih tek başına geçişi durdurma gerekçesi sayılmayacak. Karar mevcut özellikler, verinin korunması, gerçek cihaz sonuçları ve somut motor sorunları üzerinden verilecek.

Bu belge ilk audit bulgularını ve geçişin kalan kabul işlerini tutar. Kullanıcının uygulama yetkisiyle kaynak 0.4.1 / Electron 43.8.1'e geçirildi. Ortak uygulama kabuğu, platform sahipleri ve tek dağıtım kanalı korunuyor. Push ve canlı yayın için hedef sürüme yönelik açık kullanıcı yetkisi gerekir.

### Uygulama durumu — 20 Ekim 2026

- Tam Electron 43.8.1 bağımlılığı ve Bun kilidi güncellendi; uygulama sürümü 0.4.1. Yanlış 44.9.0 runtime'ı paketleyicinin yeni sürüm kontrolünde gerçekten reddedildi.
- Mevcut ortak smoke kabulüne `--from`, Windows dağıtım kabulüne `--from-release` eklendi. Yeni bir uyumluluk katmanı, platforma özgü uygulama kopyası veya test framework'ü eklenmedi. Mevcut CDP sahibi yeniden kullanıldı.
- Pano kabulü 43 API'lerine geçirildi ve ortak native CI build'ine bağlandı; test sistem panosunu temizlediğinden yalnız `--isolated-desktop` ile geçici CI/VM masaüstünde çalışır. Bu oturumda gerçek sistem panosu kabulü çalıştırılmadı.
- Yeni paketin sharp yüklemesi, Next'in iki libvips DLL'ini dışarıda bıraktığını gösterdi. Ortak dosya izleme kuralı native kitaplıkların kardeş dosyalarını kapsayacak şekilde düzeltildi; son paket gerçek PNG üretti. Negatif önceki paket yükleme hatasıyla bu kontrolün eksik kitaplığı algıladığı görüldü.
- Resmî 0.4.0 Windows ZIP'i manifest boyutu ve SHA-256 ile doğrulandı; içindeki gerçek motor 44.9.0. Gerçek paketle 44.9.0 → 43.8.1 geçişinde tema, canlı/demo planları, kalıcı HttpOnly/Strict çerez ve gerçek `/api/session` tarafından yüklenen sentetik v1 oturum/TTL korundu. Dolu port, tek örnek ve üç kapanış/açılış kabulü geçti; giriş/demo görüntüleri incelendi.
- Resmî npm native paketleri SHA-512 ile doğrulandı: sharp/libvips Mach-O alt sınırı arm64 için 11.0, x64 için 10.15. macOS 12'nin üzerinde bir gereksinim bulunmadı; gerçek macOS paket/imza/cihaz kabulü açık.
- 104 masaüstü/installer testi, 382 uygulama testi ve tür kontrolü geçti. Eşzamanlı yemek demosu geliştirmesindeki eksik modül ana çalışma ağacı derlemesini durdurduğu için son standalone/paket, HEAD + yalnız bu geçiş değişikliklerini içeren izole kaynak kopyasından üretildi. Demo dosyaları korunuyor.
- Yerel Electron indirmesinde mevcut native ZIP açıcı bu Windows ortamında yüklenemedi. Hash'i doğrulanan resmî ZIP sistem aracıyla açıldı ve mevcut `desktop:install` kontrolü geçti; bağımlılığa shim veya kaynak yaması eklenmedi.
- Gerçek 0.4.0 ZIP'inden 0.4.1 ZIP'ine Windows dağıtım kabulü tamamlandı: Restricted bootstrap, aynı sürüm, simgeden açılış, onaylı normal kapanış/güncelleme, tema/plan/dosya koruması, başlangıç/indirme hataları, dolu port, kurulum kilidi ve kaldırma geçti. İlk denemede aynı portu kullanan smoke testiyle çakışma oldu; tek başına tekrarında tamamı geçti.
- İki olumsuz kontrol beklendiği gibi başarısız oldu: eski eksik-DLL adayı yeni native kabulünde reddedildi; geçici profilde motor değişiminden önce bilerek silinen plan yeni motorda saptandı. Duyarlılık deneyi depoya yeni bir test dosyası bırakmadı.

Aşağıdaki audit tablosu başlangıç bulgularını, kabul matrisi tamamlanması gereken platform yollarını gösterir. Güncel kalıcı sözleşmeler [masaüstü](../docs/desktop.md#motor-ve-macos-alt-sınırı), [doğrulama](../docs/verification.md) ve [yayın](../docs/release.md) sahiplerinde yönetilir.

### Hedef sürümler

| Bileşen | Audit başlangıcı | Geçiş adayı |
| --- | --- | --- |
| Pofis | Yerel kaynak ve üç canlı public manifest: `0.4.0` | Mevcut duruma göre `0.4.1`; uygulama/yayın öncesi canlı sürümler yeniden okunur |
| Electron | `44.9.0` | Audit sırasında doğrulanan `43.8.1`; uygulama tarihinde güncel kararlı 43 yaması yeniden değerlendirilip tam sürümle kilitlenir |
| Chromium | `152.0.7977.167` | `150.0.7871.250` |
| V8 | `15.2.124.43-electron.0` | `15.0.245.31-electron.0` |
| Node.js | `24.22.0` | `24.22.0` |
| Electron yerel eklenti ABI'si | `149` | `148` |
| Node-API | `10` | `10` |
| macOS alt sınırı | Electron 44: macOS 13 | Electron 43: macOS 12; paket ve cihaz kabulüyle doğrulanacak |

Motor sürümü düşerken Pofis uygulama sürümü yükselir. Mevcut installer ve manifest sürüm karşılaştırmaları uygulama sürümünü kullanır. Böylece aynı güncelleme komutları ve aynı üç manifest yolu kullanılabilir.

## 2. Audit sonucu ve bulgular

**Sonuç:** Mevcut Pofis işlevlerini Electron 43'e taşımayı engelleyen bir üretim API bağımlılığı bulunmadı. İzole Windows deneyleri olumlu. Tam paket ve macOS 12 kabulü tamamlanmadan destek ilanı/yayın kararı verilmemeli.

Öncelikler geçiş işinin sırasını belirtir; güvenlik açığı şiddeti değildir.

| No | Öncelik | Gözlenen durum | Sahip ve yapılacak iş |
| --- | --- | --- | --- |
| F1 | P1 | CI macOS paketlerini `macos-15` ve `macos-15-intel` üzerinde sınar. Bu sonuç Monterey kabulünü kanıtlamaz. | [Workflow](../.github/workflows/desktop-release.yml), [macOS kabulü](../scripts/electron/macos-distribution-test.cjs): iki mimaride macOS 12 cihaz/uygun VM kabulü ekle. |
| F2 | P1 | Windows ve macOS dağıtım testleri tek paketin sürümünü değiştirerek yeni sürüm fixture'ı üretir. İki farklı Electron motoruyla profil geçişini sınamaz. | [Windows kabulü](../scripts/electron/distribution-test.cjs), [macOS kabulü](../scripts/electron/macos-distribution-test.cjs), [fixture üretimi](../scripts/electron/fixtures/release-variants.ps1): gerçek eski/yeni paketleri aynı izole profille çalıştıran kabul ekle. |
| F3 | P1 | Her iki installer yeni paketi etkinleştirip eski sürümleri temizledikten sonra açılış sonucunu bekler. Açılış hatası otomatik olarak eski pakete dönmez. Bu mevcut ve testlerle belgelenmiş sözleşmedir. | [Windows installer](../scripts/electron/install.ps1), [macOS installer](../scripts/electron/install.sh), [masaüstü sözleşmesi](../docs/desktop.md): yayın öncesi paket kabulünü ve ileri sürümle toparlanmayı planla. |
| F4 | P2 | Pano kabul betiği 44'teki `ClipboardItem`, `clipboard.read()` ve yeni `clipboard.write()` biçimini kullanır. 43.8.1'de `ClipboardItem` yok. | [Pano kabulü](../scripts/electron/clipboard-smoke.cjs): 43 sözleşmesine uyarla; sahte pano verisiyle izole test masaüstünde çalıştır. |
| F5 | P2 | Paketleyici çalışan Electron'un platform/mimarisini doğrular; motor sürümünü kök bağımlılıktaki tam sürümle karşılaştırmaz. Yanlış runtime aynı hedefte fark edilmeden paketlenebilir. | [Paketleyici](../scripts/electron/package.cjs): kopyalama öncesinde çalışan `process.versions.electron` değerini kilitli sürümle karşılaştır; uyumsuzluğu hata yap. |
| F6 | P2 | Aynı Node sürümüne rağmen Electron ABI'si değişiyor. Windows'taki güncel `sharp` iki motorda çalıştı; macOS ve yeni standalone paketlerin yerel dosyaları henüz doğrulanmadı. | [Paketleyici](../scripts/electron/package.cjs), [Next ayarı](../next.config.ts), [Bun kilidi](../bun.lock): yeni native paketleri ve Mach-O minimum OS değerlerini incele. |
| F7 | P2 | Mevcut pano kabulü `ci-build.cjs` akışında çağrılmıyor. `bun test` için varsayılan kök `src/`; masaüstü testleri ayrıca çalıştırılıyor. | [CI orkestrasyonu](../scripts/electron/ci-build.cjs), [Bun ayarı](../bunfig.toml): ilgili kabulün gerçekten çalıştığını görünür kıl. |
| F8 | P2 | Destek belgeleri Apple Silicon/Intel hedeflerini anlatıyor; sayısal macOS alt sınırı ve 44 → 43 geçiş kabulü tanımlı değil. | [Masaüstü](../docs/desktop.md), [doğrulama](../docs/verification.md), [yayın](../docs/release.md): alt sınırı ve yeni kabul zincirini kendi sahiplerinde tanımla. |
| F9 | P2 | Yerel `dist/windows` altındaki üç hazır paket `0.1.0`; canlı manifestler `0.4.0`. Güncel `.next/standalone/server.js` bulunmuyor. | Yeni kabulde hash'i doğrulanmış gerçek `0.4.0` paketlerini ve güncel kaynaktan hazırlanmış adayları kullan. Eski yerel paketleri güncel referans sayma. |

### Üretim arayüzü ve özellik farkları

- [Ana süreç](../electron/main.cjs), [sunucu yöneticisi](../electron/server.cjs), [sunucu girişi](../electron/server-entry.cjs), [izinler](../electron/permissions.cjs), [dış bağlantılar](../electron/external-links.cjs) ve [güncelleme bildirimi](../electron/updates.cjs) incelendi. `utilityProcess.fork`, `protocol.handle`, `session.fetch`/`bypassCustomProtocolHandlers`, pencere/menü/tek örnek ve kullanılan izin API'leri 43 sözleşmesinde mevcut.
- Güncelleme komutunu kopyalayan `clipboard.writeText` 43'te mevcut ve senkron. Arayüzün [teknik ayrıntı kopyalaması](../src/components/request-error-details.tsx) `navigator.clipboard.writeText` kullanıyor. API varlığı gerçek işletim sistemi pano kabulüyle tamamlanacak.
- 44'ün otomatik pencere durumu kalıcılığı, zoom modu API'si, caret browsing ve menü rozeti gibi yeni özellikleri kullanılmıyor. Pofis Electron `autoUpdater` kullanmıyor; 44.7'nin bu modüldeki yeni indirme/delta özelliklerine bağımlı değil.
- İncelenen 151/152 web platformu yeniliklerine doğrudan kullanım bulunmadı. Chromium/V8 değişiminde görünüm, popover, odak, tarih biçimi ve hydration kabulü yine gerekli.
- 44'te duyurulan her düzeltme kaybolmuyor. Örneğin Network Service yeniden başladıktan sonra `session.fetch` hatası ve UtilityProcess mesaj kaybı düzeltmeleri 43.8.0'a da aktarılmış. İlk 43.0.0 yerine güncel 43 yamasını seçmek bu yüzden önemli.
- 44 sürüm notlarındaki macOS açılış/sleep-wake, Windows dialog imleci ve `ResizeObserver` kaynaklı çökme gibi düzeltmelerin tümünün aday 43'e aktarıldığı bu auditte kanıtlanmadı. Bu kayıtlar doğrudan kayıp ilan edilmez; ilgili PR/backport durumu kontrol edilir, Pofis'i etkileyen yol için cihazda yeniden üretim/kabul yapılır.
- Bu çalışma kapsamlı bir Electron/Chromium CVE taraması değildir. Belirli bir açığın Pofis'te erişilebilir olduğu veya olmadığı sonucunu vermez.

## 3. Kalıcılık sözleşmesi

| Veri | Güncel sahibi | Geçiş beklentisi |
| --- | --- | --- |
| Profil dizini | `app.getPath("appData")/Pofis`, installer'da aynı kullanıcı profili | Dizin ve bundle kimliği korunur; tema/plan/çerez depoları aynı profilde açılır. |
| Tarayıcı origin'i | `http://127.0.0.1:3210`, Electron oturumuna özel protokol yönlendirmesi | Gerçek sunucu boş porta taşınsa da tarayıcı origin'i sabit kalır. |
| Tema | `pofis:theme:v1`, [görünüm sahibi](../src/data/use-appearance.ts) | Seçilen tema yeni motorda okunur ve yeniden başlatmada korunur. |
| Mesai planı | `pofis:work-plans:v1`, [plan deposu](../src/lib/plan-storage.js) | Varsayılan plan, hafta planı, özel hedef, izin ve sıfır süreli açık günler aynı sözleşmeyle okunur. |
| Demo planı | `demo:pofis:work-plans:v1`, [depolama kapsamı](../src/data/work-plans.ts) | Canlı plan ile demo planı ayrı kalır. |
| Uygulama çerezi | `pofis_session`, HttpOnly / SameSite Strict | Geçerli token taşınır; renderer token'ı okuyamaz. |
| Sunucu oturumu | Profil altındaki `sessions/`, v1 JSON ve `tough-cookie` jar'ı | Kayıt sunucu tarafından yüklenebilir; `self.pofiKey`, kaynak çerezleri ve mevcut bitiş zamanı korunur. |
| Oturum süresi | [Oturum politikası](../src/domain/rules/session-policy.ts), sabit 8 saat | Geçiş TTL'yi uzatmaz. Süresi dolmuş/iptal edilmiş oturum 401 ve yeniden giriş davranışını korur. |

Chromium'un yeni motorun yazdığı profili eski motorla açma sözleşmesi tüm veriler için kayıpsızlık garantisi vermez. Okunamayan kullanıcı verileri diskte tutulabilir; önbellek yeniden oluşturulabilir. Bu nedenle yeni profilin açılması ile mevcut 44 profilinin okunması ayrı kabul edilir. Ayrıntı: [Chromium User Data Storage](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_storage.md).

Yeni bir profil dizini veya veri şeması bu geçiş için gerekli görünmüyor. Bir uyumsuzluk kanıtlanırsa ilgili veri sahibinde en küçük çözüm değerlendirilir; kullanıcı verisini silme veya yeniden girişe zorlayan yeni sözleşme kullanıcı kararı olarak ele alınır.

## 4. Audit sırasında elde edilen kanıt

### Tamamlanan kontroller

| Kontrol | Sonuç | Sınır |
| --- | --- | --- |
| Çalışma ağacı | Audit başlangıcında temiz | Plan belgesi ve görev bağlantısı bu çalışma kapsamında eklenecek |
| `bun --bun tsc --noEmit` | Geçti | Tipli mevcut kaynak; Electron CommonJS kodu için runtime kanıtı sağlamaz |
| `bun test src/domain/rules/rules.test.ts` | 10 geçti, 0 hata | Kural mimarisi ve belge bağlantıları |
| `POFIS_TEST_BASH` ile `bun test ./electron ./scripts/electron` | Normal yerel ortamda 104 geçti, 0 hata | Bun fixture testleri; gerçek Monterey, imza veya paket geçişi kanıtı değil |
| Resmî npm `electron@43.8.1` paketi | npm SHA-512 bütünlüğü doğrulandı | Proje bağımlılığı kurulmadı/değiştirilmedi |
| Resmî Windows x64 Electron ZIP'i | SHA-256 doğrulandı | `ce7eedcef94de0d12b9ba54d5244f5a323c00e17b5cdea2ef0e4f440e1a74c4c` |
| Gerçek motorlarla izole sentetik profil | `44.9.0 → 43.8.1 → 44.9.0` geçti | Windows x64, gizli pencereler; güncel Pofis `server.cjs`, `server-entry.cjs`, `permissions.cjs` ve sahte HTTP sunucusu |
| Profil koruma deneyinin olumsuz kontrolü | Bilerek boş profil kullanıldığında `dark` yerine `null` görülerek deney başarısız oldu | Karşılaştırma kayıp depolamayı yakalıyor |
| Protokol deneyi | Sabit origin, POST gövdesi, HttpOnly çerez taşıma ve dış HTTP origin'i için 403 korundu | Yerel fixture; gerçek PDKS isteği yapılmadı |
| Başlık/çerez karşılaştırması | Latin-1 başlığın renderer'da görülen sonucu 44 ile aynı; iki ayrı `Set-Cookie` saklandı | Bu karşılaştırma motor farkını sınar; genel başlık kodlama doğruluğu iddiası vermez |
| Renderer ve süreç | `require`/`process` görünmüyor; sandbox ve context isolation açık; gerçek UtilityProcess başlayıp kapanıyor | Üretim Next derlemesi ve tam uygulama UI kabulü yapılmadı |
| Güncel bağımlılık ağacındaki `sharp@0.35.5` | İki motorda 1×1 PNG üretimi başarılı; Node-API 10 | `ELECTRON_RUN_AS_NODE`; yeni standalone paketin DLL/dylib eksiksizliğini veya macOS eklentilerini kanıtlamaz |
| Üç canlı public manifest | Windows, arm64 ve x64 için `0.4.0` okundu | ZIP içerikleri ve canlı paket motorları tek tek indirilip denetlenmedi |

İlk masaüstü test denemesinde sandbox süreç, dosya yeniden adlandırma ve test kayıt defteri işlemlerini engelledi. Aynı kaynak ve testler normal yerel ortamda geçti. İlk başarısız sonuçlar Electron 43 regresyonu olarak sınıflandırılmadı.

Eski yerel `0.1.0` paketinde `sharp` zorla yükleme denemesi mevcut 44 motorunda da başarısız oldu; paket ağacında libvips DLL'leri bulunmadı. Bu eski paket güncel ürün için referans alınmadı. Güncel bağımlılık ağacında iki motorla yapılan ayrı test başarılı; yeni paket bağımlılık bütünlüğü uygulama planında açık kabul olarak kaldı.

**Açık kanıt:** mevcut `main.cjs` ile güncel Next standalone'ın tam paketli çalışması, gerçek `0.4.0` paketiyle uygulama güncellemesi, macOS 12/13+ native kabulü, gerçek pano ve geçerli PDKS oturumunun taşınması. Sentetik çerez ve oturum dosyası işaretçisi, oturum yöneticisinin gerçek v1 kayıt yüklemesini kanıtlamaz.

## 5. Uygulama sırası

### A. Referansı ve kabul girdilerini sabitle

- [x] Uygulamaya başlamadan canlı üç manifesti yeniden oku. Yeni Pofis sürümünü mevcut en yüksek sürümden büyük seç; bugün öneri `0.4.1`.
- [ ] Mevcut yayın paketlerini resmî manifest URL'lerinden test dizinine indir; manifest boyutu ve SHA-256 ile doğrula. Her hedefte gerçek motor sürümünü ayrıca kaydet.
- [ ] Güncel kararlı Electron 43 yamasını, ilgili kritik hata/backport kayıtlarıyla birlikte seç; üç hedefin binary'lerinin mevcut olduğunu doğrula.
- [ ] Eski/yeni uygulama, motor, işletim sistemi/mimari ve kaynak commit eşleşmelerini kabul girdisi yap. Gerçek kullanıcı profili yerine testin oluşturduğu profilleri kullan.

Çıkış: tekrar kullanılabilir iki motorlu kabul girdileri ve aynı üç hedef için tek aday sürüm. Yalnız manifest sürümünü değiştirerek oluşturulan fixture gerçek motor geçişinin yerine geçmez.

### B. Kabul açıklarını kapat

Sahipler: `scripts/electron/clipboard-smoke.cjs`, `scripts/electron/smoke.cjs`, iki dağıtım kabulü ve `ci-build.cjs`.

- [x] Mevcut kabul betiklerini yeniden kullanarak gerçek eski/yeni paket girdisi alan bir motor geçişi kabulü ekle. Gerekirse dar bir `scripts/electron/engine-transition-test.cjs` orkestrasyonu kullan; uygulama iş mantığını test içine kopyalama.
- [ ] 44'te tema ve ürün sözleşmesine uygun tam plan kaydet; geçerli fixture oturumu oluştur; normal kapat. Yeni ve daha yüksek Pofis sürümünü 43 motoruyla aynı profile kur. Depolama değerlerini, ekrandaki sonuçları, `/api/session` ve oturum dosyası yüklemesini doğrula.
- [ ] Yeniden açılış, dolu 3210 portu, aynı sürümü tekrar kurma ve demo/canlı plan ayrımını bu profil üzerinde sına.
- [ ] Süresi dolmuş oturum, çıkış, oturum dosyası hatası ve kaynak hatasında mevcut davranışları fixture'larla doğrula. Geçiş TTL'yi değiştirmesin.
- [ ] Veri kaybı, yanlış origin veya okunamayan çerez üreten olumsuz kontrollerin kabulü düşürdüğünü göster.
- [ ] Pano betiğini 43 API'sine uyarla. Teknik ayrıntıyı kopyalama, güncelleme komutunu kopyalama ve renderer pano okumasının reddini gerçek işletim sistemi panosunda sına. Panoya yazan testi izole CI/VM masaüstünde çalıştır; yalnız metin yedeği alıp tüm kullanıcı pano biçimlerinin korunduğunu varsayma.
- [ ] `ClipboardItem` bağımlılığının kalktığını ve yeni kabulün CI'da çağrıldığını doğrula. Sadece test dosyasının depoda bulunması kabul sayılmasın.

Çıkış: iki farklı motor ve iki farklı uygulama sürümü kullanan, veri kaybını algılayan kabul.

### C. Motoru kilitle ve paket kaynağını doğrula

Sahipler: `package.json`, `bun.lock`, `scripts/electron/package.cjs`.

- [x] Electron'u seçilen tam 43 sürümüne geçir; lockfile'ı bu değişikliğin gerektirdiği kapsamda güncelle. Next/React/Bun sürümleri için bu auditte değişiklik gereksinimi bulunmadı.
- [x] Pofis sürümünü seçilen yeni sürüme yükselt. Mevcut sürümün paket içeriğini değiştirme.
- [x] Paketleyicinin gerçek runtime sorgusuna motor sürümünü ekle; kök bağımlılıkla eşleşmeyen motoru paket kopyalamasından önce reddet. Çalışan platform/mimari doğrulamasını koru.
- [x] Yanlış Electron sürümüyle paketlemenin durduğunu test et. Motor sürümü, Chromium, Node ve ABI bilgisini teknik kabul çıktısında göster; kullanıcı akışına teknik seçim ekleme.
- [x] Kullanıcı profili yolu, `app.pofis.client` kimliği, sabit origin, manifest şeması ve üç public hedef yolu mevcut sahiplerinde korunsun.

Çıkış: üç hedefte aynı kilitli motor; yanlış runtime ile paket üretimi engellenmiş.

### D. Üç native paketi üret ve incele

- [ ] Her hedefi kendi işletim sistemi/mimarisi üzerinde temiz bağımlılıklar ve yeni standalone çıktıyla üret. Bun geliştirme/build aracıdır; kullanıcı paketi Electron'un dahili Node'unu kullanmaya devam etsin.
- [ ] `bun install --frozen-lockfile`, tür kontrolü, `bun test`, açık masaüstü/installer testleri ve `desktop:package` çalıştır. Mevcut doğrulama sahiplerini kullan.
- [ ] Yeni standalone ağacında `.node`, DLL ve dylib dosyalarını envanterle; gereken yan kitaplıkların pakette bulunduğunu doğrula. Node-API kullanan eklentileri ve ABI'ye bağlı eklentileri ayır; aynı Node sürümünü otomatik ABI uyumu sayma.
- [ ] macOS ana bundle, helper, framework ve çalışma zamanında yüklenebilen yerel dosyaların mimarisini ve Mach-O minimum OS bilgisini incele. Desteklenen macOS 12 sürümünü aşan bir native gereksinimi paket düzeyinde çöz.
- [ ] Electron 43'ün gerçek `LSMinimumSystemVersion` alanını koru; yeniden adlandırma sonrasında ana bundle/helper alanlarını doğrula. Sadece plist değerini düşürmek uyumluluk kanıtı değildir.
- [ ] Ad-hoc imzayı üret; açılış, demo ve tekrar açılıştan sonra `codesign --verify --deep --strict` doğrulamasını yap. Quarantine/Gatekeeper davranışını cihaz kabulünde ayrıca incele.
- [ ] Yeni pakette `test:desktop:smoke` ve platformun dağıtım kabulünü Node/Bun içermeyen PATH ile çalıştır. `.env`, gerçek profil ve kaynak dışı dosyaların pakete girmediğini mevcut paketleme sözleşmesiyle kontrol et.

Çıkış: Windows x64, macOS arm64 ve macOS x64 için doğrulanmış yerel aday paketler.

### E. Gerçek platform kabulünü tamamla

| Ortam | Başlangıç | Zorunlu kabul |
| --- | --- | --- |
| Windows x64 | Gerçek mevcut yayın + 44 profili | Yeni Pofis/43'e güncelleme; tema/plan/oturum; normal/alternatif port; kapanış; yeniden açılış |
| macOS 12 Intel | Temiz profil ve 43 kurulumu | Sistem araçları, imza/Gatekeeper, Finder açılışı, menü/kısayollar, pano, aynı sürüm ve 43 tabanlı yeni Pofis sürümüne güncelleme |
| macOS 12 Apple Silicon | Temiz profil ve 43 kurulumu | Aynı kabul; yerel arm64 seçimi ve Rosetta altındaki installer donanım seçimi |
| macOS 13+ Intel | Gerçek mevcut yayın + 44 profili | Gerçek 44 → 43 güncellemesi; mevcut veriler ve uygulama işlevleri |
| macOS 13+ Apple Silicon | Gerçek mevcut yayın + 44 profili | Aynı kabul; Dock/Finder, pencere ve sunucu süreçleri |
| macOS 12'nin altı | Yeni aday paket | Geçerli minimum OS kontrolünün anlaşılır hata ile etkinleştirmeden önce reddetmesi; mevcut kurulum/profilin korunması |

macOS 12 üzerinde 44'ü çalıştırmayı gerektiren bir test tanımlanmaz: 44 bu işletim sistemini desteklemiyor. 44 → 43 profil geçişi macOS 13+ üzerinde; Monterey desteği kendi işletim sisteminde doğrulanır.

Her desteklenen ortamda giriş → rapor → tema/planı değiştir → normal çıkış/kapanış → yeniden aç → değerleri doğrula zincirini tamamla. Demo üzerinden hafta seçici/popover, plan modalı, klavye odağı, açık/koyu tema, Pofi ve teknik ayrıntı kopyalamasını kontrol et. `tr-TR` / İstanbul tarih-saatleri ve hydration konsolu temiz olmalı; [ortak tarih sahibinin](../src/domain/time.ts) boşluk normalizasyonunu koru.

Gerçek PDKS kabulünde kullanıcının kurum ağı/hesabı üzerinden geçerli oturumun taşınmasını ve giriş → rapor → yeniden açılış → çıkış zincirini doğrula. Sentetik oturum sonucunu gerçek kaynak kabulü diye raporlama. Repo görev listesindeki bağımsız geniş PDKS kabullerini ayrı kapsamlarıyla koru.

Mevcut macOS 15 CI runner'ları korunabilir; macOS 12 kanıtı gerçek cihazdan veya Apple donanımındaki uygun VM'den gelir. Kabul kaydında kesin `12.x.y` ve donanım/mimari belirtilir. Yalnız 12.7.x üzerinde yapılan test, 12.0'ın cihazda doğrulandığı anlamına gelmez.

Çıkış: destek ilanının kapsadığı işletim sistemi/mimarilerde açık kabul. Gerekli macOS 12 ortamı yoksa uygulama hazırlığı ilerleyebilir; ilgili destek/yayın kabulü açık kalır.

### F. Belgeleri ve tek kanallı yayını tamamla

- [ ] `docs/desktop.md` içinde kabul edilmiş macOS alt sınırını, motor kararını ve test edilmiş cihaz sürümlerinin sınırını tanımla.
- [ ] `docs/verification.md` ve `docs/release.md` içinde iki motorlu kabulü ve yayın öncesi önkoşulları bağla. `README.md`, `PRODUCT.md`, `docs/deployment.md` ve `docs/architecture/multi-user-sessions.md` kapsam/oturum/dağıtım ifadelerini bu sahiplerle eşleştir; ayrıntıyı çoğaltma.
- [x] Monterey'deki güvenlik ekranının adını da kapsayacak şekilde installer açılış hatası yönlendirmesini kontrol et. Mevcut `Sistem Ayarları → Gizlilik ve Güvenlik` ifadesi eski sistemde farklı olabilir; kısa ve sürümler arasında anlaşılır metin kullan.
- [ ] Yerel belge bağlantılarını ve kural mimarisi testini doğrula; tamamlanan geçiş işlerini görev listesinden kaldır. Kalıcı kararları konu sahiplerine taşı; plan tamamlandığında bu geçici uygulama belgesini kaldır.
- [ ] Kullanıcıya üç hedefin kanıtını ve kalan somut boşlukları sun. Yayın için tam Pofis sürümüne ve mevcut public hedefe yönelik açık yetki al.
- [ ] Yetkili yayın, mevcut `.github/workflows/desktop-release.yml` ve aynı üç manifest ile yapılır. Bu workflow taslak hazırlama, paket yükleme, release yayımlama ve landing push adımlarına gider; sadece test çalıştırmak amacıyla başlatılmaz.
- [ ] İlk geçişin Monterey/gerçek profil kabulünü workflow'u başlatmadan önce tamamla. Kabul edilen kaynak commit'i, tam Electron sürümü ve lockfile yayın girdisi olarak sabitlensin; CI'da yeniden üretilen paketlerin motoru ve kabul sonuçları da doğrulansın. Testten sonra değişen kaynak/runtime girdisi için etkilenen kabul yeniden çalıştırılsın.
- [ ] Yerel hazırlıkta `desktop:release` yalnız ZIP/manifest üretir; canlı yayın ayrıca kullanıcı yetkisine bağlıdır. Yerel site kabulü geçici `--site` dizini kullansın; canlı landing kopyası yayın akışında güncellensin.
- [ ] Yayın sonrasında üç manifestin yeni Pofis sürümünde olduğunu, HTTPS/cache başlıklarını, anonim ZIP boyut/hash'lerini ve iki kurulum komutunu doğrula. Canlı indirilmiş macOS 12 paketinde ilk açılış/güncelleme kabulünü tamamla.

Çıkış: aynı kanal üzerinden üç platforma tek yeni Pofis sürümü; doğrulanmış canlı kurulum.

## 6. Yayın kararı ve toparlanma

### Yayın için gerekli sonuçlar

- [ ] Eski gerçek yayın → yeni 43 paketi geçişinde profil okunuyor; tema ve planlar aynı ürün sonucunu veriyor.
- [ ] Geçerli sunucu oturumu doğru kullanıcıyla ve mevcut bitiş zamanı ile yükleniyor; süre dolumu/çıkış izolasyonu korunuyor.
- [ ] İki macOS 12 mimarisi için paket, native bağımlılık, sistem araçları, imza ve gerçek açılış kanıtı mevcut.
- [ ] Pano kabulü ve yeni paket runtime sürüm kontrolü çalışıyor; üç native paketin tüm zorunlu testleri geçti.
- [ ] Pofis sürümü mevcut yayınlardan büyük; üç hedef aynı kaynaktan ve aynı motor sürümünden üretiliyor.
- [ ] Pofis'in kullandığı yolda kanıtlanmış, çözülmemiş bir motor çökmesi/veri kaybı veya somut erişilebilir güvenlik bulgusu kalmadı.

Veri kaybı, okunamayan profil/oturum, yanlış runtime paketi, macOS 12'yi aşan yerel bağımlılık veya hedef cihazda açılmayan paket ilgili yayını durdurur. İlgili bulgu çözülüp etkilenen kabul tekrar çalıştırılır. Bakım takvimi bu koşullardan ayrı değerlendirilir.

### Sorun halinde izlenecek yol

1. Yayın öncesinde kabul başarısızsa adayın bulgusunu düzelt; mevcut public sürüm ve manifestleri koru.
2. Yayın sonrasında normal yol, **daha yüksek Pofis sürümüyle Electron 43 üzerinde düzeltme** yayımlamaktır. Installer uygulama sürümünü düşürmez; aynı sürümün paketini değiştirmez.
3. Otomatik eski paket/profil geri yükleme bugün yoktur. Açılış hatası görünür raporlanır; kullanıcı profili korunur. İşletim sistemi/kayıt hatalarını motor kaynaklı sorunlardan ayır.
4. Test amaçlı geri açma/recovery denemelerinde kapalı sentetik profilin ayrı kopyasını kullan. Gerçek kullanıcı verilerini silme veya eski bir yedekle üzerine yazma işlemi ayrı açık yetki gerektirir.
5. Electron 44'e geri dönmek, tek kanalda macOS 12 desteğini yeniden kaldırır. Böyle bir motor kararı ve sonuçları kullanıcıya sunulur; macOS 12 kullanıcılarına açamayacakları bir paket otomatik çözüm olarak kabul edilmez.

## 7. Bakım yaklaşımı

43 serisi için mevcut resmî takvimde bakım sonu 5 Ocak 2027. Bu tarih Pofis'in çalışmasını veya uygulama güncellemelerini teknik olarak durdurmaz. Gelecekteki motor kararını şu somut durumlar tetikler:

- Pofis'in kullandığı yolda bulunan ve 43 üzerinde çözümü olmayan güvenlik/kararlılık sorunu.
- Kullanıcı cihazlarında yeniden üretilmiş çökme, veri kaybı veya bağlantı uyumsuzluğu.
- Güncel ürün gereksiniminin Chromium 150/Node 24/Electron 43 ile karşılanamaması.
- Yeni işletim sistemi veya bağımlılık değişiminin mevcut paketi bozması.

43 yama güncellemeleri aynı kanal ve kabul yöntemiyle değerlendirilir. Bakım sonrasında dış düzeltmelerin otomatik geleceği varsayılmaz; ilgili bulgu, erişilebilir yol ve çözüm maliyeti kullanıcıya somut olarak sunulur.

## 8. Birincil kaynaklar

- [Electron 44: macOS 12 desteğinin kaldırılması, yeni API'ler ve 43'e aktarılan iyileştirmeler](https://www.electronjs.org/blog/electron-44-0).
- [Electron 43.8.1 resmî npm metadata'sı](https://registry.npmjs.org/electron/43.8.1): tam sürüm, npm bütünlüğü ve kurulum bağımlılıkları. Paketteki `README.md`, `electron.d.ts`, `abi_version` ve `checksums.json` ayrıca okundu.
- [Electron 43.8.0 düzeltmeleri](https://releases.electronjs.org/release/v43.8.0): Node 24.22.0, `session.fetch` ve UtilityProcess backport'ları.
- [Electron 44.9.0](https://releases.electronjs.org/release/v44.9.0), [44.8.0](https://releases.electronjs.org/release/v44.8.0), [44.7.0](https://releases.electronjs.org/release/v44.7.0), [44.6.0](https://releases.electronjs.org/release/v44.6.0), [44.5.0](https://releases.electronjs.org/release/v44.5.0), [44.4.0](https://releases.electronjs.org/release/v44.4.0), [44.3.0](https://releases.electronjs.org/release/v44.3.0), [44.2.0](https://releases.electronjs.org/release/v44.2.0), [44.1.0](https://releases.electronjs.org/release/v44.1.0): özellik ve düzeltme etkisi incelemesi; tüm PR'lar için 43 backport eşitliği çıkarılmadı.
- [Chromium profil downgrade sözleşmesi](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_storage.md).
- [Chrome 151](https://developer.chrome.com/blog/new-in-chrome-151), [Chrome 152](https://developer.chrome.com/blog/new-in-chrome-152): incelenen web platformu yenilikleri.
- [Electron destek takvimi](https://releases.electronjs.org/schedule), [destek politikası](https://www.electronjs.org/docs/latest/tutorial/electron-timelines).
- Canlı manifestler: [Windows](https://pofis.app/releases/windows/latest.json), [Apple Silicon](https://pofis.app/releases/macos/arm64/latest.json), [Intel](https://pofis.app/releases/macos/x64/latest.json). Audit sırasında üçü de `0.4.0`; sonraki uygulama/yayın adımında tekrar okunacak.
