# PDKS istekleri ve kullanıcı hataları

[Belge haritası](README.md) · [Kaynak politikası](rules/source-policy.md) · [Oturum politikası](rules/session-policy.md)

## Sahipler

- [pdks-failure.ts](../src/lib/pdks-failure.ts): hata sınıfları, izinli tanı alanları ve işlem bazında toparlanma sözleşmesi. React veya sunucu bağımlılığı taşımaz.
- [api-client.js](../src/lib/api-client.js): HTTP/JSON doğrulaması, tarayıcı ağ hatası ve istek iptali. [http.js](../src/server/http.js) sunucu hatasını aynı tanı alanlarıyla serileştirir.
- [session-response.js](../src/lib/session-response.js): oturum GET yanıtındaki boolean durumu, giriş/heartbeat POST yanıtındaki `true` ve çıkış DELETE yanıtındaki `false` değerini doğrular. Eksik veya çelişkili başarılı yanıt `INVALID_RESPONSE` olur.
- [pdks-state.ts](../src/data/pdks-state.ts): bağlantı, rapor tazeliği ve hata durumunun atomik geçişleri. [use-pdks.ts](../src/data/use-pdks.ts) istekleri ve iptali yürütür.
- [pdks-error-presentation.ts](../src/components/pdks-error-presentation.ts): anlamsal hata sınıfını kullanıcı mesajına ve eylem etiketine uyarlar. Metinler [ui-text.js](../src/lib/ui-text.js), çizim [RequestError](../src/components/request-error.js) sahibindedir.

## API sözleşmesi

Başarısız API yanıtı `{ error: string, code: string, details?: object }` biçimindedir. Eski hata biçimi veya HTTP durumundan hata kodu türetme yolu yoktur. Bozuk JSON, eksik hata sözleşmesi ve geçersiz başarılı yanıt `INVALID_RESPONSE` olur. Başarılı raporun kişi, tarih ve kayıt yapısını ayrıca [report-response.ts](../src/data/report-response.ts) doğrular.

Ham hata mesajı kullanıcı sunumuna taşınmaz. Tanı yalnız izinli, en fazla 1000 karakterlik metin veya sonlu sayı alanlarından oluşur; gövde, parola, çerez ve keyfi alanlar kopyalanmaz. Kaynak adaptör güvenli tanı üretmekten sorumludur. İstemci API yolu/yöntemini kendi isteğinden alır; sunucu gövdesi bu bağlamı değiştiremez. Beklenmeyen sunucu hatasının mesajı dışarı verilmez.

Sunucu içindeki `PdksError` kimliği modül yeniden yüklemelerinde korunur: kalıcı oturum istemcilerinden gelen bilinen hatalar yalnız constructor referansı değiştiği için `INTERNAL_ERROR` sayılmaz. Benzer kod/durum alanları taşıyan sıradan istisnalar bilinen hata kabul edilmez. Kaynağa erişilememesi `CONNECTION_FAILED / 502` üretir; bu sonuç VPN'in kapalı olduğunu tek başına kanıtlamaz.

Kaynak adaptörü Bun'ın doğrudan `error.code` ve Node fetch'in `error.cause.code` alanlarını aynı izinli bağlantı kodlarına uyarlar. `ENOTFOUND` tanıda sunucu adresinin çözümlenemediğini belirtir. Bağlantı hatasının kullanıcı mesajı kurum ağı/VPN bağlantısını kontrol etmeye yönlendirir; kaynak HTTP hata yanıtları bu yönlendirmeden ayrı kalır.

## Kullanıcı davranışı

| Durum | Sunum ve eylem | Oturum/rapor |
| --- | --- | --- |
| `AUTH_FAILED` / 401 | Şifre alanının altında kısa açıklama; iki alan hata mesajına bağlanır, odak şifreye döner. Teknik tanı gösterilmez. | Mevcut oturum iptal edilmez. |
| `INVALID_INPUT` | Girişte bilgileri, raporda hafta seçimini düzeltme. Aynı geçersiz raporu tekrar gönderme düğmesi verilmez. | Korunur. |
| `SESSION_EXPIRED` / 401 | Yeniden giriş formunda nötr bildirim; alanlar geçersiz işaretlenmez, teknik tanı gösterilmez. | Bekleyen rapor iptal edilir, kişi ve rapor temizlenir. |
| `NETWORK_ERROR` | Uygulamaya erişim sorunu ve ilgili işlemi yeniden deneme. | Rapor isteği başarısızsa eski rapor korunur, anlık tahmin durur. |
| `CONNECTION_FAILED` | PDKS bağlantısı kurulamadı; kurum ağı/VPN kontrolü ve manuel yeniden deneme. | Oturum korunur. |
| `SOURCE_ERROR` | PDKS bir HTTP hata yanıtı verdi; manuel yeniden deneme. Kaynağın 429 yanıtında bekleme, 403 yanıtında yetki açıklaması. | HTTP hata gövdesindeki giriş formu oturumu bitirmez. |
| `SOURCE_CHANGED`, `INVALID_RESPONSE`, `INTERNAL_ERROR`, bilinmeyen kod | Güvenli kullanıcı mesajı; teknik ayrıntılar İz kaydı düzeninde sürekli görünür. | Geçerli rapor varsa korunur; başarısız yenilemede tahmin durur. |
| `TOO_MANY_RESULTS` | Rapor sınırı ve başka hafta seçme açıklaması. | Kısmi rapor başarı gibi gösterilmez. |

Yalnız doğru kod/durum çiftine sahip `SESSION_EXPIRED` oturumu bitirir. Kod içermeyen veya okunamayan 401 yanıtı oturumu düşürmez. Heartbeat aynı sınıflandırmayı kullanır; geçici heartbeat erişim sorunu raporu silmez.

Bu çiftin tek sahibi `isSessionExpired` kontrolüdür; API temizliği, kaynak doğrulaması, keepalive ve istemci aynı koşulu kullanır. Kaynakta başarılı HTTP yanıtındaki giriş sayfası veya kaynak 401 yanıtı oturum bitişi üretir. `403/429/5xx` hata yanıtının gövdesi giriş formu içerse de HTTP hata sınıfı korunur. Bozuk form/menü/yönlendirme adresi `SOURCE_CHANGED` olur. İstek hazırlığındaki uygulama hatası ağ hatası olarak maskelenmez; oturum iptali özgün nedeni korur, kaynak zaman aşımı bağlantı hatasıdır. Tarayıcıda yarıda kesilen/çözülemeyen gövde `NETWORK_ERROR`, geçersiz JSON `INVALID_RESPONSE` olur.

Toparlanma işlemi hatanın sahibine döner: oturum kontrolü GET `/api/session`, rapor GET `/api/report`, çıkış DELETE `/api/session`. Giriş yalnız formdan POST edilir. Giriş/çıkış aynı anda ikinci kez başlatılmaz. Geç kalan veya iptal edilmiş rapor yanıtı yeni durumu değiştiremez. İstek sonunda FormData kimlik alanları ve formdaki şifre temizlenir. Kullanıcı adı tekrar deneme için yalnız açık formda korunur; uygulama depolamasına yazılmaz.

Girişte bilgi/doğrulama hatası şifre alanının altında gösterilir. Sistem hatası giriş kartının yerini normal hata ekranıyla alır; form içinde hata kartı gösterilmez. Giriş isteği hatasında “Girişe dön” hatayı temizleyip boş formu açar; POST isteğini tekrarlamaz. İlk oturum kontrolü hatası kendi GET yeniden denemesini sunar. Oturum bitişi giriş formunda kutusuz, nötr durum metnidir. Pofi yanlış bilgide normal, sistem hatasında hata duruşunu kullanır; istek sürerken çalışma duruşundadır.

Eski rapor varken hata kısa bir bildirim olarak raporun üzerinde kalır; rapor yokken tek hata görünümü sunulur. İlk oturum kontrolü başarısızsa tam sayfa hata ekranında oturum kontrolünü tekrar deneme eylemi bulunur.

Tam sayfa hata görünümü lavanta Pofi sahnesinde başlık, kısa açıklama ve işleme uygun ana eylemi sunar; masaüstünde Pofi sağda, dar ekranda üsttedir. Giriş, raporsuz hatalar ve demo aynı [RequestError](../src/components/request-error.js) sahibini kullanır. Eski rapor üzerindeki kompakt bildirim Pofi Sahne düzenini kullanır: lavanta yüzeyde mesaj ve eylem, sağda küçük Pofi, altta açık İz kaydı bulunur. Demo da aynı RequestError bileşenini kullanır. Bildirim aynı [tanı bileşenini](../src/components/request-error-details.tsx) kullanır; tam sayfa sahnesi raporu kapatmaz.

Teknik ayrıntılar kutusuz İz kaydı düzeninde sürekli görünür. “Sorunun nedeni” güvenli açıklama, hata kodu ve kısa İstanbul zamanını içerir. “İstek ayrıntıları” Pofis API ve PDKS alanlarını kendi isteklerinin altında toplar; verisi bulunmayan kaynak grubu çizilmez. API HTTP durumu kaynak yanıtı sayılmaz. Alanlar yalnız boşlukla ayrılır, uzun yollar satır kırar. “Teknik ayrıntıları kopyala” tüm izinli alanları ve özgün zaman damgasını kopyalar; başarı veya erişim reddi durum metniyle bildirilir. API hata sınıflandırması, parola/çerez sınırı ve işlem bazındaki toparlanma davranışı değişmez.

## Uygulama içi hata ve yerel bildirimler

Rapor hazırlığı veya saat izdüşümündeki beklenmeyen istisnalar [DashboardView](../src/components/dashboard/view.tsx) içinde metne çevrilmez; Next.js hata sınırına ulaşır. [error.tsx](../src/app/error.tsx) güvenli Pofi hata ekranını ve framework yeniden denemesini sunar. Ham istisna mesajı kullanıcıya gösterilmez. `runtime` hatası API isteği sayılmaz; tanıda API HTTP durumu üretilmez. İstek alanı yoksa İz kaydının istek bölümü çizilmez.

[InlineNotice](../src/components/inline-notice.tsx) yerel depolama sorunlarını ve eski rapor bilgisini kompakt biçimde sunar. Tema hatasını [AppShell](../src/components/shell/app-shell.js) gösterir; giriş, 404 ve hata ekranları da aynı yolu kullanır. Tema ve plan hataları birbirini gizlemez. Plan hatasının durumu [use-work-plans](../src/data/use-work-plans.ts) sahibindedir: plan modalı açıkken modalda, diğer durumlarda raporun üzerinde gösterilir. Başarılı yazı hatayı temizler; başarısız yazı son kayıtlı planı değiştirmez. Eski rapor mesajı durum bilgisidir; ayrı bir teknik hata veya ikinci yeniden deneme eylemi üretmez.

404, aynı lavanta sahne yerleşiminde Mesaim'e dönüş bağlantısını ve mevcut Pofi etkileşimini korur; API hatası veya teknik tanı üretmez. Not defterinde bulunmayan içerik ve planın geçersiz girdileri kendi bağlamlarında kalır; tam sayfa hata ekranına dönüşmez.

## Doğrulama

[Hata ve HTTP okuma testleri](../src/lib/pdks-failure.test.ts), [durum geçişleri](../src/data/pdks-state.test.ts), [sunucu serileştirme](../src/server/http.test.js) ve [route/oturum testleri](../src/server/routes.test.js) sözleşmeyi korur.

Arayüzdeki hata ve bildirim metinlerini [demo](demo.md) üzerinden kontrol edin: hata ekranı → girişe dönüş, yeniden deneme, rapor/çıkış hataları ve yerel depolama bildirimleri. Demo gerçek PDKS erişimini kanıtlamaz. Gerçek giriş → rapor → yenileme → çıkış ve oturum bitişi kabulünü [görev listesine](../tasks/todo.md) göre kurum ortamında yapın.

[Oturum yanıtı testleri](../src/lib/session-response.test.ts), [heartbeat testleri](../src/lib/session-heartbeat.test.js) ve [rapor sınırı testleri](../src/data/report-response.test.ts) bozuk başarılı yanıtları da kapsar. Rapor yönü yalnız `in` veya `out` metni olabilir; dizi veya başka türden değer metne çevrilerek kabul edilmez.
