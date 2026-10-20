# Oturum politikası

[Kural haritası](README.md) · [Oturum mimarisi](../architecture/multi-user-sessions.md)

## Tek sahip

[session-policy.ts](../../src/domain/rules/session-policy.ts), `SESSION_POLICY` değerlerini tanımlar; sunucu durumu veya sır içermez.

| Politika | Değer |
| --- | --- |
| Oturum çerezi | `pofis_session`; HttpOnly, SameSite=strict, Path=/ |
| Sabit TTL | oluşturulma anından itibaren sabit 8 saat |
| Token | 32 rastgele bayt |
| İstemci heartbeat / zaman aşımı | 1 dakika / 10 saniye |
| Etkin istemci lease'i / kaynak keepalive | 10 dakika / 20 dakika |
| Soğuk dosya taraması / en uzun backoff | 1 saat / 1 saat |
| Kullanıcı adı / şifre üst sınırı | 200 / 1000 karakter |

Secure çerezi doğrudan HTTPS veya proxy'nin ilk `X-Forwarded-Proto` değeri `https` olduğunda kullanılır. Güvenilir proxy ve başlık yazımı [dağıtım sözleşmesindedir](../deployment.md#proxy--ingress).

## Güvenceler

- Girişte kullanıcı adının çevresindeki boşluklar temizlenir; `@` varsa ilk `@` öncesi kullanıcı adı olarak kullanılır. Örneğin `mert.ercan@trt.net.tr`, PDKS'ye `mert.ercan` olarak gönderilir. Dönüşüm ek kullanıcı işlemi gerektirmez; boş kalan kullanıcı adı reddedilir. 200 karakter sınırı girilen özgün değere uygulanır; parola değiştirilmez. Bu dönüşümün sahibi [oturum yöneticisinin](../../src/server/session-manager.js) `connect` işlemidir.
- Her oturum ayrı profil, Pofi hesap anahtarı (`self.pofiKey`), `PdksClient` ve CookieJar kullanır; her doğrulanmış kullanıcıya ayrı oturum açılır. Yalnız güncel çerez adı okunur ve temizlenir. Pofi anahtarı olmayan eski veya bozuk oturum yeniden girişle yeni anahtar alır.
- Parolanın kullanım alanı giriş isteğiyle sınırlıdır. İstek kimlik alanları ve form şifresi işlem sonunda temizlenir. Kullanıcı adı tekrar deneme için yalnız açık formda kalabilir. Bu temizlik uygulamadaki referansları bırakır; belleğin fiziksel yönetimi JavaScript çalışma zamanına aittir.
- TTL erişimde ve kaynak işi tamamlandığında yeniden denetlenir. Çıkış devam eden kaynak işini iptal eder; iptal edilmiş oturum durumu geciken yanıtlara ve dosya okumalarına karşı korunur.
- Yeniden bağlantıda yeni kimlik doğrulama/ilk kayıt başarısızsa mevcut oturum korunur. Eski kaydı silme ve geri alma hatalarının sınırları [yaşam döngüsünde](../architecture/multi-user-sessions.md#oturum-yaşam-döngüsü) tanımlıdır.
- Başarılı raporun oturum kaydı yazılamazsa işlem API `INTERNAL_ERROR` / 500 yanıtıyla sona erer; başarı önbelleği yalnız kayıt tamamlandığında oluşturulur. Etkin oturum korunur; depolama düzeldikten sonraki deneme kaynağı yeniden çağırır. Kaynak işi zaten hata verdiyse özgün hata korunur, ikincil disk hatası güvenli koduyla loglanır.
- Temizlik ve keepalive hatalarında sağlıklı oturumlar çalışmayı sürdürür. Dosya yazma/silme sırası, yeniden başlatma ve silinemeyen dosyanın sınırları mimari sahibinde yönetilir.
- Yalnız `SESSION_EXPIRED` + 401 oturumu bitirir. Yanlış şifrede mevcut oturum korunur. İstemci GET'te boolean, giriş/heartbeat başarısında `true`, çıkışta `false` bekler. [Yanıt ve toparlanma sözleşmesi](../pdks-errors.md).

[Windows/macOS masaüstü](../desktop.md) aynı kuralları kullanır; normal uygulama kapanışında mevcut PDKS oturumunun TTL süresi korunur. Rapor önbelleği ve kaynak kapasitesi [kaynak politikasına](source-policy.md) aittir.

## Kullanan yerler

- [session-manager.js](../../src/server/session-manager.js): giriş, geri yükleme, TTL ve iptal.
- [session-storage.js](../../src/server/session-storage.js): dosya kalıcılığı.
- [http.js](../../src/server/http.js): çerez ve giriş sınırları.
- [session-heartbeat.js](../../src/lib/session-heartbeat.js), [connection.tsx](../../src/components/connection.tsx): istemci süreleri ve giriş alanları.

## Testler

[Depolama](../../src/server/session-storage.test.js) · [Oturum yöneticisi](../../src/server/session-manager.test.js) · [Route](../../src/server/routes.test.js) · [HTTP](../../src/server/http.test.js) · [Oturum yanıtı](../../src/lib/session-response.test.ts) · [Heartbeat](../../src/lib/session-heartbeat.test.js).
