# Oturum politikası

[Kural haritası](README.md) · [Oturum mimarisi](../architecture/multi-user-sessions.md)

## Tek sahip

[session-policy.ts](../../src/domain/rules/session-policy.ts), istemci ve sunucunun kullandığı `SESSION_POLICY` değerlerini tanımlar.

| Politika | Değer |
| --- | --- |
| Oturum çerezi | `pofis_session`; HttpOnly, SameSite=strict, Path=/ |
| Sabit TTL | oluşturulma anından itibaren sabit 8 saat |
| Token | 32 rastgele bayt |
| İstemci heartbeat ve bellek bakım döngüsü / heartbeat zaman aşımı | 1 dakika / 10 saniye |
| Etkin istemci lease'i / kaynak keepalive | 10 dakika / 20 dakika |
| Soğuk dosya taraması / en uzun backoff | 1 saat / 1 saat |
| Kullanıcı adı / şifre üst sınırı | 200 / 1000 karakter |

Secure çerezi doğrudan HTTPS veya proxy'nin ilk `X-Forwarded-Proto` değeri `https` olduğunda kullanılır. Güvenilir proxy ve başlık yazımı [dağıtım sözleşmesindedir](../deployment.md#proxy--ingress).

## Güvenceler

- Girişte kullanıcı adının çevresindeki boşluklar temizlenir; `@` varsa ilk `@` öncesi kullanıcı adı olarak kullanılır. Örneğin `mert.ercan@trt.net.tr`, PDKS'ye `mert.ercan` olarak gönderilir. Dönüşüm ek kullanıcı işlemi gerektirmez; boş kalan kullanıcı adı reddedilir. 200 karakter sınırı girilen özgün değere uygulanır; parola değiştirilmez. Bu dönüşümün sahibi [oturum yöneticisinin](../../src/server/session-manager.js) `connect` işlemidir.
- Her oturum kendi doğrulanmış profili, Pofi hesap anahtarı (`self.pofiKey`), `PdksClient` ve CookieJar'ı ile çalışır. Anahtarın hesaplar ve oturumlar arasındaki eşlemesi [Pofi notları sözleşmesindedir](../pofi-notes.md#hesap-anahtarı). Yalnız güncel çerez adı okunur ve temizlenir. Anahtarı olmayan veya bozuk oturum yeniden giriş ister.
- Web'de parola yalnız giriş isteğinde kullanılır. Electron'da kullanıcının açık seçimiyle şifreli saklama ve otomatik giriş aşağıdaki sözleşmeye tabidir. İstek kimlik alanları ve form şifresi işlem sonunda temizlenir. Kullanıcı adı tekrar deneme için yalnız açık formda kalabilir. Bu temizlik uygulamadaki referansları bırakır; belleğin fiziksel yönetimi JavaScript çalışma zamanına aittir.
- TTL erişimde ve kaynak işi tamamlandığında yeniden denetlenir. Çıkış devam eden kaynak işini iptal eder; iptal edilmiş oturum durumu geciken yanıtlara ve dosya okumalarına karşı korunur.
- Yeniden bağlantıda yeni kimlik doğrulama/ilk kayıt başarısızsa mevcut oturum korunur. Eski kaydı silme ve geri alma hatalarının sınırları [yaşam döngüsünde](../architecture/multi-user-sessions.md#oturum-yaşam-döngüsü) tanımlıdır.
- Başarılı raporun oturum kaydı yazılamazsa işlem API `INTERNAL_ERROR` / 500 yanıtıyla sona erer; başarı önbelleği yalnız kayıt tamamlandığında oluşturulur. Etkin oturum korunur; depolama düzeldikten sonraki deneme kaynağı yeniden çağırır. Kaynak işi zaten hata verdiyse özgün hata korunur, ikincil disk hatası güvenli koduyla loglanır.
- Temizlik ve keepalive hatalarında sağlıklı oturumlar çalışmayı sürdürür. Dosya yazma/silme sırası, yeniden başlatma ve silinemeyen dosyanın sınırları mimari sahibinde yönetilir.
- Oturum yanıtlarının doğrulanması, oturumu bitiren kod/durum çifti ve toparlanma eylemleri [hata sözleşmesinde](../pdks-errors.md) yönetilir.

[Masaüstü](../desktop.md) aynı TTL kurallarını kullanır. Heartbeat sahibi Electron ana sürecidir; pencere gizliyken de bir dakikalık döngü sürer. [Bildirim sözleşmesi](notifications.md). Rapor önbelleği ve kaynak kapasitesi [kaynak politikasına](source-policy.md) aittir.

## Electron'da beni hatırla

[remembered-session.ts](../../src/desktop/remembered-session.ts) seçimi, şifreli kaydı ve yeniden giriş sırasını yönetir. Giriş ekranındaki **Beni hatırla (şifrem bu cihazda saklanır)** başlangıçta seçili değildir; web ve izole senaryo modunda görünmez. Seçilirse kullanıcı adı ve şifre yalnız başarılı girişten sonra kullanıcı profilindeki `remembered-session.bin` dosyasına taşınır. Ön hazırlık dosyası da şifrelidir. Seçim kapalıyken varsa eski hatırlama kaydı giriş denemesinden önce silinir.

Electron'un [asenkron safeStorage API'si](../desktop.md#yaşam-döngüsü-ve-sorumluluklar) Windows'ta DPAPI, macOS'ta Keychain kullanır. [Ortak arka uç kontrolü](../../src/desktop/secure-storage.ts) Linux'ta `basic_text` ve `unknown` değerlerini reddeder; hatırlama kaydı ayrıca sabit anahtarlı `v10` çıktısını reddeder ve yalnız anahtarlıkla üretilen `v11` kaydeder. Windows koruması aynı Windows kullanıcısı olarak çalışan diğer uygulamalara karşı ayrı bir yalıtım sağlamaz. Kimlik bilgileri renderer'a geri verilmez, loglanmaz veya web depolamasına yazılmaz.

- Uygulama yeniden açıldığında geçerli Pofis oturumu yoksa kayıtlı bilgilerle giriş denenir. Oturumun TTL'i değişmez; başarılı giriş yeni bir sekiz saatlik oturum oluşturur.
- Doğrulanmış oturum bitişinde veya rapor/heartbeat kaynak bağlantı hatasında yeniden giriş denenir. Geçici hatalarda kayıt korunur; yeniden deneme 30 saniyeden başlar, beş dakikaya kadar artar ve kaynak daha uzun bir bekleme verdiyse o süreye uyulur. Etkin oturumdaki kaynak hatası raporu silmez. Elle giriş geçici hatayla başarısız olursa otomatik deneme yalnız hatırlama seçili ve girilen bilgiler kayıtla birebir aynıysa sürer.
- Otomatik giriş `AUTH_FAILED / 401` alırsa denemeler durur ve kayıtlı bilgiler silinir. Elle girişte aynı hata otomatik denemeyi durdurur. Başka giriş hataları şifrenin yanlış olduğunu kanıtlamaz. Silme başarısızsa kullanıcıya bildirilir; aynı süreçte otomatik deneme durur, silinemeyen kayıt bir sonraki açılışta tekrar denenebilir.
- Kullanıcının **Bağlantıyı kes** eylemi önce kaydı ve varsa kesintiden kalan şifreli giriş geçici dosyalarını siler, sonra oturumu kapatır. Silme veya çıkış başarısızsa hata gösterilir; çıkış başarısızsa sunucudaki oturum korunabilir, hatırlama kaydı zaten silinmiş olabilir. Uygulamayı kapatmak bu eylem değildir ve kaydı korur.
- Güvenli saklama kullanılamıyorsa seçili hatırlama ile giriş başlatılmaz; kullanıcı seçimi kaldırarak giriş yapabilir. Başarılı girişten sonra kayıt değiştirilemezse oturum açık kalır ve uyarı gösterilir. Eski kayıt da silinemiyorsa uyarı bunu belirtir.
- Otomatik girişler paylaşılır; açık giriş veya çıkış, bekleyen otomatik işlemin sonucunu geçersizleştirir ve oturum değişiklikleri sırayla tamamlanır. Gecikmiş yanıt açık çıkıştan sonra oturumu geri getiremez. Yenilenen oturumun kimliği bildirimlere ve Mini'ye yeniden aktarılır.

## Kullanan yerler

- [session-manager.js](../../src/server/session-manager.js): giriş, geri yükleme, TTL ve iptal.
- [session-storage.js](../../src/server/session-storage.js): dosya kalıcılığı.
- [http.js](../../src/server/http.js): çerez ve giriş sınırları.
- [session-heartbeat.js](../../src/lib/session-heartbeat.js), [connection.tsx](../../src/components/connection.tsx): istemci süreleri ve giriş alanları.
- [install-notifications.ts](../../src/desktop/install-notifications.ts): masaüstü heartbeat isteği web ile aynı `heartbeatTimeoutMs` değerini kullanır.
- [remembered-session.ts](../../src/desktop/remembered-session.ts), [install-notifications.ts](../../src/desktop/install-notifications.ts), [preload.cjs](../../electron/preload.cjs) ve [use-pdks.ts](../../src/data/use-pdks.ts): yalnız ana pencerenin giriş/çıkış yetkisi, şifreli kayıt ve pencerelere oturum sonucu.

## Testler

[Depolama](../../src/server/session-storage.test.js) · [Oturum yöneticisi](../../src/server/session-manager.test.js) · [Route](../../src/server/routes.test.js) · [HTTP](../../src/server/http.test.js) · [Oturum yanıtı](../../src/lib/session-response.test.ts) · [Heartbeat](../../src/lib/session-heartbeat.test.js).

[Adaptör testi](../../src/domain/rules/policy-adapters.test.ts), yalnız politika süresini bellekte değiştirip web ve masaüstü heartbeat isteklerinin yeni sürede iptal edildiğini doğrular.

[Hatırlama davranışı](../../src/desktop/remembered-session.test.ts) izole depolama ve sahte kaynakla; [Electron kabulü](../../src/data/remembered-electron.test.ts) gerçek Electron, işletim sistemi şifrelemesi, ayrı profil ve sahte PDKS yanıtlarıyla doğrulanır. Gerçek kurum hesabı ve hedef cihaz kabulü ayrıdır.
