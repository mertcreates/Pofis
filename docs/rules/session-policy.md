# Oturum politikası

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/session-policy.ts](../../src/domain/rules/session-policy.ts)

Arayüz: `SESSION_POLICY`.

## Sözleşme

TTL, temizlik aralıkları, token uzunluğu, heartbeat/lease/keepalive, backoff, giriş alan limitleri ve çerez nitelikleri tek politikadır. Sunucu oturum işlemlerinin sahibidir; istemci yalnız gerekli süre/alan limitlerini okur. Girişte kullanıcı adı/şifre geçici olarak kullanılır; oturum ve önbellekte giriş kimlik bilgileri saklanmaz. İstek nesnesi ve giriş formundaki kimlik alanları kullanımdan sonra bırakılır; kaynak tarafından doğrulanan kişi bilgisi ve CookieJar oturumda kalır. JavaScript belleğinin fiziksel olarak sıfırlanması garanti edilmez. Kalıcılığa şifre yazılmaz. Sunucu ve form aynı uzunluk limitini kullanır. Çerez adaptörü doğrudan HTTPS veya proxy'nin `X-Forwarded-Proto` başlığındaki ilk `https` değeri için Secure kullanır; HttpOnly ve SameSite=strict korunur. [Proxy sözleşmesi](../deployment.md). Bu dosya sunucu durumu veya sır içermez.

Toplam oturum kotası yoktur; sabit 8 saat TTL korunur. Tek süreçte her oturum ayrı istemci ve CookieJar kullanır. Dosyalar asenkron, oturum başına sıralı yazma/silme ve atomik değiştirmeyle yönetilir; diskten yalnız istenen oturum yüklenir. Çıkış devam eden kaynak isteğini iptal eder; geciken okuma ve yazılar oturumu geri getiremez. Bellekteki oturumlar dakikalık bakımda, soğuk dosyalar saatlik taramada temizlenir; boş süreçte bakım durur. Erişim anında TTL daima denetlenir. [Yapı ve işletim sınırları](../architecture/multi-user-sessions.md). Kaynak istek kapasitesi [kaynak politikasına](source-policy.md) aittir.

Yeniden bağlantıyı oturum yöneticisinin `replaceSession` işlemi yürütür. Yeni kimlik doğrulama veya ilk kayıt başarısızsa mevcut oturum korunur. Yeni oturum kaydedildikten sonra eski oturum kapatılır; eski kaydın silinmesi başarısızsa yeni oturum da iptal edilir ve dosyası silinmeye çalışılır. Geri alma sırasında disk silme de başarısızsa iki oturum aynı süreçte iptal edilmiş kalır; hata kaydedilir ve istek başarısız döner. Diskte kalan dosyaların süreç yeniden başlatıldıktan sonraki sınırları mimari belgede açıklanır.

Bakımda süresi dolan kayıtların silme hataları ayrı ayrı kaydedilir; sağlıklı oturumların keepalive işleri sürer. Soğuk dosya taraması hata verse de keepalive işleri sürer; tarama bir sonraki saatlik aralıkta yeniden denenir. İstek sırasında oluşan disk hataları çağırana başarısızlık olarak döner.

Raporun kaynak işi başarılı olduğunda ve hata verdiğinde oturum üyeliği/TTL tekrar denetlenir. Çıkış veya TTL nedeniyle geçersiz oturum `SESSION_EXPIRED` / 401 döner ve tarayıcı çerezi temizlenir. Aktif oturumun kaynak bağlantı hatası 502 olarak kalır. Yeni girişin `AUTH_FAILED` sonucu mevcut oturumu veya çerezini iptal etmez.

## Bağımlılıklar

Başka ürün kuralına bağlı değildir.

## Kullanan yerler

- [session-manager.js](../../src/server/session-manager.js)
- [session-storage.js](../../src/server/session-storage.js)
- [http.js](../../src/server/http.js)
- [session-heartbeat.js](../../src/lib/session-heartbeat.js)
- [connection.tsx](../../src/components/connection.tsx)

## Testler

- [session-storage.test.js](../../src/server/session-storage.test.js)
- [session-manager.test.js](../../src/server/session-manager.test.js)
- [routes.test.js](../../src/server/routes.test.js)
- [http.test.js](../../src/server/http.test.js)
- [Tarayıcı kabulü](../../scripts/acceptance/archive-behavior.js)
