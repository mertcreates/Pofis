# Merkezi, çok kullanıcılı Pofis

## Uygulanan yapı

Tek uygulama süreci, süreç belleğinde oturumlar ve yerel JSON dosyaları kullanılır. Her oturum kendi `PdksClient`, CookieJar ve doğrulanmış kişi kimliğiyle çalışır. Her doğrulanmış kullanıcıya ayrı oturum açılır. Sabit 8 saat TTL korunur.

| Sahip                                                    | Sorumluluk                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [Oturum politikası](../rules/session-policy.md)          | TTL, çerez, heartbeat, lease ve temizlik aralıkları                                        |
| [Oturum yöneticisi](../../src/server/session-manager.js) | Giriş, talep üzerine geri yükleme, iptal ve süre dolumu                                    |
| [Dosya deposu](../../src/server/session-storage.js)      | Asenkron okuma, oturum başına sıralı yazma/silme, geçici dosya üzerinden atomik değiştirme |
| [Kaynak politikası](../rules/source-policy.md)           | Rapor önbelleği, kaynak zaman aşımı ve protokol sınırları                                  |
| [PDKS adaptörü](../../src/server/pdks.js)                | Oturum başına işlem sıralaması ve kaynak protokolü                                         |

## Oturum yaşam döngüsü

Girişte e-posta biçiminde yazılan değerde ilk `@` öncesindeki bölüm kullanıcı adı olarak kullanılır. Oturum yöneticisi bu değeri PDKS adaptörüne iletir; hesap anahtarı da aynı kullanıcı adıyla üretilir. Boşluk ve uzunluk sınırları [oturum politikasında](../rules/session-policy.md) tanımlıdır.

Bellekteki yönetici `pofis.session-manager:account-key-v1` anahtarıyla tutulur. Bu anahtar geliştirme sunucusundaki yönetici ve giriş istemcisi fabrikasını hesap anahtarı sözleşmesine göre oluşturur. API, anahtarsız oturumda `SESSION_EXPIRED` / 401 ile yeniden giriş ister.

1. Girişte ayrı istemci oluşturulur; parola yalnız kaynak girişinde kullanılır. Oturum yöneticisi yeni oturumu kaydeder, mevcut oturumu kapatır ve ardından tarayıcıya yeni token verilir. Yeni kimlik doğrulama veya ilk kayıt başarısızsa mevcut oturum korunur. Eski oturumun diskten silinmesi başarısızsa yeni oturum da iptal edilip dosyası silinmeye çalışılır; istek başarısız döner.
2. İstek yalnız güncel oturum çerezindeki kimliği arar. Bellekte yoksa v1 biçimindeki ilgili dosya asenkron okunur; aynı kimliğin eşzamanlı okumaları birleştirilir. Desteklenmeyen dosya biçimi yeniden kimlik doğrulama gerektirir.
3. Kaynak çerezleri değiştiğinde kayıt asenkron yazılır. Oturum başına yazma/silme sırası korunur. Yeniden adlandırma kısmi JSON görünmesini önler; elektrik kesintisine karşı fsync garantisi verilmez. İstek sırasında kayıt hatasının yanıta, önbelleğe ve özgün kaynak hatasına etkisi [oturum politikasında](../rules/session-policy.md) tanımlıdır.
4. Çıkış bellek kaydını kaldırır, devam eden kaynak isteğini iptal eder, bekleyen yazıların ardından dosyayı siler. Geciken okuma oturumu geri getiremez. Raporun kaynak işi başarıyla tamamlandığında ve hata verdiğinde üyelik ve TTL tekrar doğrulanır. Geçersiz oturum 401 döner ve tarayıcı çerezi temizlenir; aktif oturumun kaynak bağlantı hatası 502 döner.
5. Dosya silme başarısızsa hata döner ve aynı süreç oturumu yeniden yüklemeyi engeller; silme yeniden denenebilir. Bu sınır, yeniden bağlantının geri alınmasındaki silme hatası için de geçerlidir. Silinemeyen kayıt süreç yeniden başlatılınca TTL sonuna kadar yeniden yüklenebilir; iptal bilgisi süreç belleğinde yaşar. Dosya erişimi ve disk hatalarının izlenmesi işletim sorumluluğudur.
6. Etkin bellek oturumları varken tek bakım zamanlayıcısı çalışır. Süresi dolan bellek kayıtları dakikalık kontrolde, soğuk dosyalar saatlik dizin taramasında temizlenir. Silme veya tarama hataları loglanır ve sağlıklı oturumların keepalive işleri sürer. Hatalı soğuk tarama sonraki saatlik aralıkta yeniden denenir. Süreç boşken zamanlayıcı durur; yeni oturumla bakım devam eder. Süresi geçmiş dosyalar erişimde reddedilir.

Bozuk dosyada ilgili kullanıcı yeniden giriş yapar; diğer kullanıcıların yüklenmesi bağımsız sürer. Kaynak çerezleri hassastır; oturum dizinine yalnız uygulama hesabı erişmelidir. Şifre yalnız giriş isteği süresince kullanılır ve her denemeden sonra temizlenir; kullanıcı adı yalnız açık formda tekrar deneme için korunur ([hata sözleşmesi](../pdks-errors.md)). Plan ve tema mevcut tarayıcı depolamasını kullanmayı sürdürür.

## Kaynak istekleri

Giriş, `PizzyMain.aspx` profilindeki kişi bilgisiyle doğrulanır. Mesai raporu seçili haftanın kişisel turnike hareketlerini alır, bütün sayfaları birleştirir ve API'de zorunlu `passages` olarak sunar. Günlük ilk giriş–son çıkış ve süreler [kayıtlı süre sahibinde](../rules/recorded-time.md), açık giriş güvenilirliği [geçiş sahibinde](../rules/passages.md) çözülür. Başarılı girişte üretilen `self.pofiKey`, Pofi notları için sunucu oturumunda korunur ve diskten aynı değerle yüklenir. Kalıcı hesap bilgisi `self.pofiKey` alanıyla sınırlıdır. Anahtarı olmayan oturumlar yeniden girişle hesap anahtarını alır. [Anahtar sözleşmesi](../pofi-notes.md#hesap-anahtarı).

Farklı kullanıcıların istekleri ortak bir sıra beklemeden başlar. Aynı oturumdaki WebForms işlemleri kendi istemcisinde sıralanır; diğer oturumlar bağımsız çalışır. Her HTTP isteğinde 30 saniyelik zaman aşımı ve oturumun iptal sinyali uygulanır. Aynı oturum/aralıktaki başarılı rapor 20 saniye ilgili istemcinin belleğinde tutulur; önbellek her istemciye özeldir. Ayrıntılar [kaynak sözleşmesinde](../rules/source-policy.md).

Kaynak HTTP hatası gövdesinde giriş formu bulunsa da oturum korunur. API temizliği, kaynak kontrolü ve keepalive ortak kod/durum doğrulamasını kullanır; istemci de başarılı oturum yanıtını işlemine göre doğrular. [Hata sözleşmesi](../pdks-errors.md).

Yerel üretim önizlemesi standart `next start`, Docker dağıtımı standalone `server.js` kullanır; iki yöntem de tek uygulama süreci çalıştırır. [Tek pod, derleme, TZ ve ingress ayarları](../deployment.md).

## İşletim sınırları

[Windows/macOS masaüstü kabuğu](../desktop.md) aynı oturum yöneticisini Electron’un Node.js UtilityProcess’iyle kullanır. Profil ve sunucu oturumları sürüm dosyalarından, dış tarayıcıdan ve kurum sunucusundan ayrıdır; dizinler ve güncelleme davranışı masaüstü rehberinde yönetilir. Normal pencere kapanışı sunucuyu kapatır ve PDKS oturumunun mevcut TTL süresini korur. Yeniden açılışta mevcut sabit TTL uygulanır.

Masaüstü sürüm temizliği ve uygulama kaldırma kullanıcı profilini silmez. Yeniden kurulum mevcut profili ve oturumların sabit TTL kuralını kullanır; kaldırma ayrıntıları [masaüstü rehberindedir](../desktop.md#kaldırma).

Dağıtım tek uygulama süreci ve kalıcı yerel oturum diziniyle yapılmalıdır. Bellek kullanımı yüklenen oturum sayısıyla büyür; oturum dizininin sahibi tek uygulama sürecidir. Kurum ağı, TLS, yeniden başlatma, disk izinleri/yedekleri ve gerçek hesap kabulü dağıtım ortamında doğrulanır.

Yerel fixture ve sentetik yük kontrolleri gerçek PDKS kapasitesini belirlemez. Bekleyen kurum kabulü [görev listesinde](../../tasks/todo.md), kontrol yöntemi [doğrulama rehberinde](../verification.md) tutulur.

Masaüstünde sunucu portu doluysa boş loopback portu seçilir. Electron içindeki sabit origin, HTTP protokol yönlendirmesiyle korunur; port değişimi tema/plan depolamasını veya çerez profilini değiştirmez. Ayrıntılar [masaüstü sözleşmesindedir](../desktop.md#yaşam-döngüsü-ve-sorumluluklar).

## Sonraki karar

Gerçek ölçümde tek süreç yetersiz kalırsa veya yüksek erişilebilirlik gerekirse ortak oturum deposu ve süreçler arası sahiplik birlikte tasarlanır. Depo seçimi o gereksinime göre yapılır. Mevcut adım yeni altyapı veya bağımlılık gerektirmez.
