# PDKS istekleri ve kullanıcı hataları

[Belge haritası](README.md) · [Kaynak politikası](rules/source-policy.md) · [Oturum politikası](rules/session-policy.md)

## Sahipler

- [pdks-failure.ts](../src/lib/pdks-failure.ts): ortak hata sınıfları, izinli tanı alanları ve işlem bazında toparlanma sözleşmesi.
- [api-client.js](../src/lib/api-client.js): HTTP/JSON doğrulaması, tarayıcı ağ hatası ve istek iptali. [http.js](../src/server/http.js) sunucu hatasını aynı tanı alanlarıyla serileştirir.
- [session-response.js](../src/lib/session-response.js): oturum GET yanıtındaki boolean durumu, giriş/heartbeat POST yanıtındaki `true` ve çıkış DELETE yanıtındaki `false` değerini doğrular. Eksik veya çelişkili başarılı yanıt `INVALID_RESPONSE` olur.
- [pdks-state.ts](../src/data/pdks-state.ts): bağlantı, rapor tazeliği ve hata durumunun atomik geçişleri. [use-pdks.ts](../src/data/use-pdks.ts) istekleri ve iptali yürütür.
- [pdks-error-presentation.ts](../src/components/pdks-error-presentation.ts): anlamsal hata sınıfını kullanıcı mesajına ve eylem etiketine uyarlar. Metinler [ui-text.js](../src/lib/ui-text.js), çizim [RequestError](../src/components/request-error.js) sahibindedir.

## API sözleşmesi

Başarısız API yanıtı `{ error: string, code: string, details?: object }` biçimindedir. İstemci hata kodunu yanıtın `code` alanından okur. Bozuk JSON, eksik hata sözleşmesi ve geçersiz başarılı yanıt `INVALID_RESPONSE` olur. Başarılı raporun kişi, tarih ve kayıt yapısını ayrıca [report-response.ts](../src/data/report-response.ts) doğrular.

Kullanıcı mesajı hata koduna göre seçilir. Tanı yalnız izinli, en fazla 1000 karakterlik metin veya sonlu sayı alanlarından oluşur. Kaynak adaptör güvenli tanı üretmekten sorumludur. İstemci API yolu/yöntemini kendi isteğinden alır; istek bağlamının sahibi istemcidir. Beklenmeyen sunucu hatası genel kullanıcı mesajı ve sunucu tanısıyla işlenir.

Sunucu içindeki `PdksError` kimliği modül yeniden yüklemelerinde korunur: kalıcı oturum istemcilerinden gelen bilinen hatalar yeniden yükleme sonrasında da özgün sınıflarını korur. Bilinen hata sınıflandırması `PdksError` kimliğiyle yapılır. Kaynağa erişilememesi `CONNECTION_FAILED / 502` üretir; kullanıcıya kaynak adresini ve ağ erişimini kontrol etmesi söylenir.

Kaynak adaptörü Bun'ın doğrudan `error.code` ve Node fetch'in `error.cause.code` alanlarını aynı izinli bağlantı kodlarına uyarlar. `ENOTFOUND` tanıda sunucu adresinin çözümlenemediğini belirtir. Bağlantı hatasının kullanıcı mesajı kurum ağı/VPN bağlantısını kontrol etmeye yönlendirir; kaynak HTTP hata yanıtları bu yönlendirmeden ayrı kalır.

## Kullanıcı davranışı

| Durum | Sunum ve eylem | Oturum/rapor |
| --- | --- | --- |
| `AUTH_FAILED` / 401 | Şifre alanının altında kısa açıklama; iki alan hata mesajına bağlanır, odak şifreye döner. Sunum kısa form açıklamasıyla sınırlıdır. | Mevcut oturum korunur. |
| `INVALID_INPUT` | Girişte bilgileri, raporda hafta seçimini düzeltme. Aynı geçersiz raporu tekrar gönderme düğmesi verilmez. | Korunur. |
| `SESSION_EXPIRED` / 401 | Yeniden giriş formunda nötr bildirim; alanlar geçersiz işaretlenmez, teknik tanı gösterilmez. | Bekleyen rapor iptal edilir, kişi ve rapor temizlenir. |
| `NETWORK_ERROR` | Uygulamaya erişim sorunu ve ilgili işlemi yeniden deneme. | Rapor isteği başarısızsa eski rapor korunur, anlık tahmin durur. |
| `CONNECTION_FAILED` | PDKS bağlantısı kurulamadı; kurum ağı/VPN kontrolü ve manuel yeniden deneme. | Oturum korunur. |
| `SOURCE_ERROR` | PDKS bir HTTP hata yanıtı verdi; manuel yeniden deneme. Kaynağın 429 yanıtında bekleme, 403 yanıtında yetki açıklaması. | HTTP hata gövdesindeki giriş formu oturumu bitirmez. |
| `SOURCE_CHANGED`, `INVALID_RESPONSE`, `INTERNAL_ERROR`, bilinmeyen kod | Güvenli kullanıcı mesajı; teknik ayrıntılar İz kaydı düzeninde sürekli görünür. | Geçerli rapor varsa korunur; başarısız yenilemede tahmin durur. |
| `TOO_MANY_RESULTS` | Rapor sınırı ve başka hafta seçme açıklaması. | Kısmi rapor başarı gibi gösterilmez. |

Yalnız doğru kod/durum çiftine sahip `SESSION_EXPIRED` oturumu bitirir. Kod içermeyen veya okunamayan 401 yanıtı oturumu düşürmez. Heartbeat aynı sınıflandırmayı kullanır; geçici heartbeat erişim sorunu raporu silmez.

Bu çiftin tek sahibi `isSessionExpired` kontrolüdür; API temizliği, kaynak doğrulaması, keepalive ve istemci aynı koşulu kullanır. Kaynakta başarılı HTTP yanıtındaki giriş sayfası veya kaynak 401 yanıtı oturum bitişi üretir. `403/429/5xx` hata yanıtının gövdesi giriş formu içerse de HTTP hata sınıfı korunur. Bozuk form/yönlendirme adresi veya doğrulanamayan profil `SOURCE_CHANGED` olur. İstek hazırlığındaki uygulama hatası ağ hatası olarak maskelenmez; oturum iptali özgün nedeni korur, kaynak zaman aşımı bağlantı hatasıdır. Tarayıcıda yarıda kesilen/çözülemeyen gövde `NETWORK_ERROR`, geçersiz JSON `INVALID_RESPONSE` olur.

[Masaüstü HTTP adaptörü](../src/desktop/install-notifications.ts) de yanıtın kod/durum çiftini `isSessionExpired` ile doğrular; doğrulanmış sonucu bildirim çalışma zamanına oturum bitişi olarak aktarır.

Toparlanma işlemi hatanın sahibine döner: oturum kontrolü GET `/api/session`, rapor GET `/api/report`, çıkış DELETE `/api/session`. Giriş yalnız formdan POST edilir. Giriş/çıkış sürerken ilgili eylem kilitlenir. Giriş/çıkış sürerken hafta değişse de oturum işleminin sonucu uygulanır; rapor yükleme işlemi oturum işlemi tamamlandıktan sonra başlatılabilir. Yeni durum yalnız güncel rapor isteğinin yanıtıyla güncellenir. İstek sonunda FormData kimlik alanları ve formdaki şifre temizlenir. Kullanıcı adı tekrar deneme için yalnız açık formda korunur.

Sistem hatası normal hata ekranında sunulur. “Girişe dön” hatayı temizleyip boş formu açar; yeni giriş isteği form gönderildiğinde başlar. Oturum bitişi giriş formunda kutusuz, nötr durum metnidir. Pofi yanlış bilgide normal, sistem hatasında hata duruşunu kullanır; istek sürerken çalışma duruşundadır.

Eski rapor varken hata kısa bir bildirim olarak raporun üzerinde kalır; rapor yokken tek hata görünümü sunulur.

Tam sayfa hata ve rapor üzerindeki kompakt bildirim ortak [RequestError](../src/components/request-error.js) sahibini kullanır. Tam sayfa görünümü rapor yokken, kompakt bildirim mevcut raporun üzerinde sunulur. Lavanta Pofi sahnesi ve duyarlı yerleşim [DESIGN](../DESIGN.md#hata-ve-yardımcı-ekranlar) belgesinde yönetilir.

Teknik ayrıntılar kutusuz İz kaydı düzeninde sürekli görünür. “Sorunun nedeni” güvenli açıklama, hata kodu ve kısa İstanbul zamanını içerir. “İstek ayrıntıları” Pofis API ve PDKS alanlarını kendi isteklerinin altında toplar; verisi bulunmayan kaynak grubu çizilmez. API ve PDKS HTTP durumları kendi istek bağlamında gösterilir. Alanlar yalnız boşlukla ayrılır, uzun yollar satır kırar. “Teknik ayrıntıları kopyala” tüm izinli alanları ve özgün zaman damgasını kopyalar; başarı veya erişim reddi durum metniyle bildirilir.

Masaüstünden gelen doğrulanmış güncel rapor, aynı haftanın bekleyen HTTP rapor isteğini iptal edip nesil sayacını ilerletir; geciken yanıt yeni raporu ezemez. Daha eski `fetchedAt` taşıyan olay reddedilir. Devam eden yenileme sırasında mevcut raporla aynı alınma zamanına sahip önbellek olayı yeni isteği iptal etmez. Mini'nin abone olduğu arka plan yenileme hatası mevcut hata/tazelik durumuna aktarılır; başarılı rapor hatayı temizler ve canlı tahmini yeniden açar. İş kuralları [rapor ve süre sahiplerinde](rules/README.md) kalır.

## Uygulama içi hata ve yerel bildirimler

Rapor hazırlığı veya saat izdüşümündeki beklenmeyen istisnalar [DashboardView](../src/components/dashboard/view.tsx) veya [ReportContent](../src/components/dashboard/report-content.tsx) üzerinden Next.js hata sınırına ulaşır. [error.tsx](../src/app/error.tsx) güvenli Pofi hata ekranını ve framework yeniden denemesini sunar. `runtime` hatasının kullanıcı sunumu güvenli genel mesajdan oluşur. İz kaydında hata sınıfı ve zaman gösterilir; istek bölümü yalnız gerçek istek alanları bulunduğunda çizilir.

[InlineNotice](../src/components/inline-notice.tsx) yerel depolama sorunlarını ve eski rapor bilgisini kompakt biçimde sunar. Tema hatasını [AppShell](../src/components/shell/app-shell.js) gösterir; giriş, 404 ve hata ekranları da aynı yolu kullanır. Tema ve plan hataları kendi durumlarıyla birlikte görünür kalır. Plan hatasının durumu [use-work-plans](../src/data/use-work-plans.ts) sahibindedir: plan modalı açıkken modalda, diğer durumlarda raporun üzerinde gösterilir. Başarılı yazı hatayı temizler; başarısız yazıda son kayıtlı plan korunur. Eski rapor mesajı durum bilgisini gösterir; yeniden deneme ortak rapor eylemiyle yapılır.

404, aynı lavanta sahne yerleşiminde Mesaim'e dönüş bağlantısını ve mevcut Pofi etkileşimini sunar. Not defterinde bulunmayan içerik, tarih ve gezinmeyi koruyan yerel durum mesajıyla gösterilir. Plan düzenleyicisinin stepper sınırları geçersiz süre seçimini engeller; kapasite ve kayıt sorunları modalda açıklanır.

## Doğrulama

[Hata ve HTTP okuma testleri](../src/lib/pdks-failure.test.ts), [durum geçişleri](../src/data/pdks-state.test.ts), [sunucu serileştirme](../src/server/http.test.js) ve [route/oturum testleri](../src/server/routes.test.js) sözleşmeyi korur.

Arayüzdeki hata ve bildirim metinlerini [demo](demo.md) üzerinden kontrol edin: hata ekranı → girişe dönüş, yeniden deneme, rapor/çıkış hataları ve yerel depolama bildirimleri. Demo arayüzdeki mesaj ve eylem sunumunu doğrular. Gerçek giriş → rapor → yenileme → çıkış ve oturum bitişini kurum ortamında [doğrulama rehberine](verification.md#tarayıcı-ve-gerçek-kaynak) göre kontrol edin.

[Oturum yanıtı testleri](../src/lib/session-response.test.ts), [heartbeat testleri](../src/lib/session-heartbeat.test.js) ve [rapor sınırı testleri](../src/data/report-response.test.ts) bozuk başarılı yanıtları da kapsar. Rapor yönü doğrulaması yalnız `in` veya `out` metnini kabul eder; diğer türler geçersiz yanıt hatası üretir.
