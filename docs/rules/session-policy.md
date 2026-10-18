# Oturum politikası

[Kural haritası](README.md) · [Oturum mimarisi](../architecture/multi-user-sessions.md)

## Tek sahip

[session-policy.ts](../../src/domain/rules/session-policy.ts), `SESSION_POLICY` değerlerini tanımlar; sunucu durumu veya sır içermez.

| Politika | Değer |
| --- | --- |
| Oturum çerezi | `pofis_session`; HttpOnly, SameSite=strict, Path=/ |
| Sabit TTL | 8 saat; istekler süreyi uzatmaz |
| Token | 32 rastgele bayt |
| İstemci heartbeat / zaman aşımı | 1 dakika / 10 saniye |
| Etkin istemci lease'i / kaynak keepalive | 10 dakika / 20 dakika |
| Soğuk dosya taraması / en uzun backoff | 1 saat / 1 saat |
| Kullanıcı adı / şifre üst sınırı | 200 / 1000 karakter |

Secure çerezi doğrudan HTTPS veya proxy'nin ilk `X-Forwarded-Proto` değeri `https` olduğunda kullanılır. Güvenilir proxy ve başlık yazımı [dağıtım sözleşmesindedir](../deployment.md#proxy--ingress).

## Güvenceler

- Her oturum ayrı kişi kimliği, `PdksClient` ve CookieJar kullanır; toplam oturum kotası yoktur. Yalnız güncel çerez adı okunur ve temizlenir.
- Parola yalnız girişte kullanılır; oturum, önbellek veya dosyaya yazılmaz. İstek kimlik alanları ve form şifresi işlem sonunda bırakılır. Kullanıcı adı tekrar deneme için açık formda kalabilir; uygulama depolamasına yazılmaz. JavaScript belleğinin fiziksel sıfırlanması garanti edilmez.
- TTL erişimde ve kaynak işi tamamlandığında yeniden denetlenir. Çıkış devam eden kaynak işini iptal eder; geciken yanıtlar veya dosya okumaları kişiyi geri getiremez.
- Yeniden bağlantıda yeni kimlik doğrulama/ilk kayıt başarısızsa mevcut oturum korunur. Eski kaydı silme ve geri alma hatalarının sınırları [yaşam döngüsünde](../architecture/multi-user-sessions.md#oturum-yaşam-döngüsü) tanımlıdır.
- Başarılı raporun oturum kaydı yazılamazsa API `INTERNAL_ERROR` / 500 döner; rapor veya başarı önbelleği üretilmez. Etkin oturum korunur; depolama düzeldikten sonraki deneme kaynağı yeniden çağırır. Kaynak işi zaten hata verdiyse özgün hata korunur, ikincil disk hatası güvenli koduyla loglanır.
- Temizlik ve keepalive hataları sağlıklı oturumları durdurmaz. Dosya yazma/silme sırası, yeniden başlatma ve silinemeyen dosyanın sınırları mimari sahibinde yönetilir.
- Yalnız `SESSION_EXPIRED` + 401 oturumu bitirir. Yanlış şifre mevcut oturumu iptal etmez. İstemci GET'te boolean, giriş/heartbeat başarısında `true`, çıkışta `false` bekler. [Yanıt ve toparlanma sözleşmesi](../pdks-errors.md).

[Windows/macOS masaüstü](../desktop.md) aynı kuralları kullanır; normal uygulama kapanışı PDKS çıkışı sayılmaz. Rapor önbelleği ve kaynak kapasitesi [kaynak politikasına](source-policy.md) aittir.

## Kullanan yerler

- [session-manager.js](../../src/server/session-manager.js): giriş, geri yükleme, TTL ve iptal.
- [session-storage.js](../../src/server/session-storage.js): dosya kalıcılığı.
- [http.js](../../src/server/http.js): çerez ve giriş sınırları.
- [session-heartbeat.js](../../src/lib/session-heartbeat.js), [connection.tsx](../../src/components/connection.tsx): istemci süreleri ve giriş alanları.

## Testler

[Depolama](../../src/server/session-storage.test.js) · [Oturum yöneticisi](../../src/server/session-manager.test.js) · [Route](../../src/server/routes.test.js) · [HTTP](../../src/server/http.test.js) · [Oturum yanıtı](../../src/lib/session-response.test.ts) · [Heartbeat](../../src/lib/session-heartbeat.test.js).
