# Oturum mimarisi

## Uygulanan yapı

Tek uygulama süreci, süreç belleğinde oturumlar ve yerel JSON dosyaları kullanılır. Her oturum kendi `PdksClient`, CookieJar ve doğrulanmış kişi kimliğiyle çalışır. Süreler ve kimlik güvenceleri aşağıdaki oturum politikasında yönetilir.

| Sahip                                                    | Sorumluluk                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [Oturum politikası](../rules/session-policy.md)          | TTL, çerez, heartbeat, lease ve temizlik aralıkları                                        |
| [Oturum yöneticisi](../../src/server/session-manager.js) | Giriş, talep üzerine geri yükleme, iptal ve süre dolumu                                    |
| [Dosya deposu](../../src/server/session-storage.js)      | Asenkron okuma, oturum başına sıralı yazma/silme, geçici dosya üzerinden atomik değiştirme |
| [Kaynak politikası](../rules/source-policy.md)           | Rapor önbelleği, kaynak zaman aşımı ve protokol sınırları                                  |
| [PDKS adaptörü](../../src/server/pdks.js)                | Oturum başına işlem sıralaması ve kaynak protokolü                                         |

## Oturum yaşam döngüsü

Kullanıcı adının normalizasyonu, hesap anahtarı gereksinimi ve parola temizliği [oturum politikasında](../rules/session-policy.md#güvenceler) tanımlıdır.

Bellekteki yönetici `pofis.session-manager:account-key-v1` anahtarıyla tutulur. Bu anahtar geliştirme sunucusundaki yönetici ve giriş istemcisi fabrikasını hesap anahtarı sözleşmesine göre oluşturur.

1. Girişte ayrı istemci oluşturulur; parola yalnız kaynak girişinde kullanılır. Oturum yöneticisi yeni oturumu kaydeder, mevcut oturumu kapatır ve ardından tarayıcıya yeni token verilir. Yeni kimlik doğrulama veya ilk kayıt başarısızsa mevcut oturum korunur. Eski oturumun diskten silinmesi başarısızsa yeni oturum da iptal edilip dosyası silinmeye çalışılır; istek başarısız döner.
2. İstek yalnız güncel oturum çerezindeki kimliği arar. Bellekte yoksa v1 biçimindeki ilgili dosya asenkron okunur; aynı kimliğin eşzamanlı okumaları birleştirilir. Desteklenmeyen dosya biçimi yeniden kimlik doğrulama gerektirir.
3. Kaynak çerezleri değiştiğinde kayıt asenkron yazılır. Oturum başına yazma/silme sırası korunur. Yeniden adlandırma kısmi JSON görünmesini önler; elektrik kesintisine karşı fsync garantisi verilmez. İstek sırasında kayıt hatasının yanıta, önbelleğe ve özgün kaynak hatasına etkisi [oturum politikasında](../rules/session-policy.md) tanımlıdır.
4. Çıkış bellek kaydını kaldırır, devam eden kaynak isteğini iptal eder, bekleyen yazıların ardından dosyayı siler. Geciken okuma oturumu geri getiremez. Raporun kaynak işi başarıyla tamamlandığında ve hata verdiğinde üyelik ve TTL tekrar doğrulanır. Geçersiz oturum 401 döner ve tarayıcı çerezi temizlenir; aktif oturumun kaynak bağlantı hatası 502 döner.
5. Dosya silme başarısızsa hata döner ve aynı süreç oturumu yeniden yüklemeyi engeller; silme yeniden denenebilir. Bu sınır, yeniden bağlantının geri alınmasındaki silme hatası için de geçerlidir. Silinemeyen kayıt süreç yeniden başlatılınca TTL sonuna kadar yeniden yüklenebilir; iptal bilgisi süreç belleğinde yaşar. Dosya erişimi ve disk hatalarının izlenmesi işletim sorumluluğudur.
6. Etkin bellek oturumları varken tek bakım zamanlayıcısı çalışır. Süresi dolan bellek kayıtları ve soğuk dosyalar [politika aralıklarında](../rules/session-policy.md) temizlenir. Silme/tarama hataları loglanır, sonraki aralıkta yeniden denenir ve sağlıklı oturumların keepalive işleri sürer. Süreç boşken zamanlayıcı durur; yeni oturumla devam eder. Süresi geçmiş dosyalar erişimde reddedilir.

Bozuk dosyada ilgili kullanıcı yeniden giriş yapar; diğer kullanıcıların yüklenmesi bağımsız sürer. Kaynak çerezleri hassastır; oturum dizinine yalnız uygulama hesabı erişmelidir. Plan ve tema mevcut tarayıcı depolamasını kullanmayı sürdürür.

## Kaynak istekleri

[Kaynak politikası](../rules/source-policy.md) profil doğrulamasını, kişisel turnike sayfalamasını, oturum başına işlem sırasını ve kısa rapor önbelleğini yönetir. [Hata sözleşmesi](../pdks-errors.md) hangi kaynak yanıtının oturumu bitirdiğini belirler.

Başarılı girişte üretilen `self.pofiKey` sunucu oturumunda saklanır ve diskten aynı değerle yüklenir. Anahtarı olmayan oturumlar yeniden giriş ister; [üretim ve geçiş sözleşmesi](../pofi-notes.md#hesap-anahtarı). Kendi raporuna eklenen [analytics kimliği](../analytics.md#hesap-kimliği) ayrı kullanım alanına sahiptir.

[Yemek kaynağı önbelleği](../rules/meal-menu.md) oturumlar arasında ortaktır; kişisel yorum her istekte mevcut hesap anahtarıyla seçilir. HTTP yanıtı `no-store` taşır.

Yerel üretim önizlemesi standart `next start`, Docker dağıtımı standalone `server.js` kullanır; iki yöntem de tek uygulama süreci çalıştırır. [Tek pod, derleme, TZ ve ingress ayarları](../deployment.md).

## İşletim sınırları

[Paketli senaryo modu](../desktop.md#paketli-senaryo-modu) ayrı Chromium profili ve örnek oturum adaptörü kullanır; normal kullanıcı profiline ve PDKS kaynağına bağlanmaz. Bu doğrulama modunun yaşam döngüsü ve sınırları masaüstü rehberindedir.

[Masaüstü kabuğu](../desktop.md#yaşam-döngüsü-ve-sorumluluklar) aynı oturum yöneticisini Node UtilityProcess ile kullanır. Kullanıcı profili dış tarayıcıdan ve kurum sunucusundan ayrıdır. Ana pencere ve [Pofi Mini](../desktop.md#pofi-mini-ve-macos-menü-çubuğu) aynı oturumu paylaşır; arka plan oturumu askıya alındığında Mini önceki raporu ve bekleyen isteği temizler. Yeniden etkinleşme sunucu oturumunun doğrulanmasını başlatır. Port, arka plan ve kapanış davranışı masaüstü rehberinde; heartbeat ve hesaba özgü işler [bildirim sözleşmesinde](../rules/notifications.md) yönetilir.

Bellek kullanımı yüklenen oturum sayısıyla büyür; oturum dizininin sahibi tek uygulama sürecidir. Replica, kalıcı volume, TLS ve kurum kabulünü [dağıtım rehberine](../deployment.md) göre yönetin.

Gerçek PDKS kapasitesi hedef kurum ortamında ölçülür. Yerel fixture ve yük kontrolleri [doğrulama rehberinde](../verification.md) açıklanır.

## Sonraki karar

Gerçek ölçümde tek süreç yetersiz kalırsa veya yüksek erişilebilirlik gerekirse ortak oturum deposu ve süreçler arası sahiplik birlikte tasarlanır. Depo seçimi o gereksinime göre yapılır.
