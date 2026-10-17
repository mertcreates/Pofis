# PDKS istekleri ve kullanıcı hataları

[Belge haritası](README.md) · [Kaynak politikası](rules/source-policy.md) · [Oturum politikası](rules/session-policy.md)

## Sahipler

- [pdks-failure.ts](../src/lib/pdks-failure.ts): hata sınıfları, izinli tanı alanları ve işlem bazında toparlanma sözleşmesi. React veya sunucu bağımlılığı taşımaz.
- [api-client.js](../src/lib/api-client.js): HTTP/JSON doğrulaması, tarayıcı ağ hatası ve istek iptali. [http.js](../src/server/http.js) sunucu hatasını aynı tanı alanlarıyla serileştirir.
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
| `CONNECTION_FAILED`, `SOURCE_ERROR` | PDKS’ye erişim sorunu; manuel yeniden deneme. Kaynağın 429 yanıtında bekleme, 403 yanıtında yetki açıklaması. | Kaynak hatası oturum bitişi sayılmaz. |
| `SOURCE_CHANGED`, `INVALID_RESPONSE`, `INTERNAL_ERROR`, bilinmeyen kod | Güvenli kullanıcı mesajı; teknik ayrıntı kapalı bir açılır alanda. | Geçerli rapor varsa korunur; başarısız yenilemede tahmin durur. |
| `TOO_MANY_RESULTS` | Rapor sınırı ve başka hafta seçme açıklaması. | Kısmi rapor başarı gibi gösterilmez. |

Yalnız doğru kod/durum çiftine sahip `SESSION_EXPIRED` oturumu bitirir. Kod içermeyen veya okunamayan 401 yanıtı oturumu düşürmez. Heartbeat aynı sınıflandırmayı kullanır; geçici heartbeat erişim sorunu raporu silmez.

Toparlanma işlemi hatanın sahibine döner: oturum kontrolü GET `/api/session`, rapor GET `/api/report`, çıkış DELETE `/api/session`. Giriş yalnız formdan POST edilir. Giriş/çıkış aynı anda ikinci kez başlatılmaz. Geç kalan veya iptal edilmiş rapor yanıtı yeni durumu değiştiremez. İstek sonunda FormData kimlik alanları ve formdaki şifre temizlenir. Kullanıcı adı tekrar deneme için yalnız açık formda korunur; uygulama depolamasına yazılmaz.

Girişte bilgi/doğrulama hatası şifre alanının altında gösterilir. Sistem hatası giriş kartının yerini normal hata ekranıyla alır; form içinde hata kartı gösterilmez. Giriş isteği hatasında “Girişe dön” hatayı temizleyip boş formu açar; POST isteğini tekrarlamaz. İlk oturum kontrolü hatası kendi GET yeniden denemesini sunar. Oturum bitişi giriş formunda kutusuz, nötr durum metnidir. Pofi yanlış bilgide normal, sistem hatasında hata duruşunu kullanır; istek sürerken çalışma duruşundadır.

Eski rapor varken hata kısa bir bildirim olarak raporun üzerinde kalır; rapor yokken tek hata görünümü sunulur. İlk oturum kontrolü başarısızsa tam sayfa hata ekranında oturum kontrolünü tekrar deneme eylemi bulunur.

Tam sayfa hata görünümü ölçülü Pofi görseli, başlık, kısa açıklama ve işleme uygun ana eylemden oluşur. Teknik ayrıntılar kutusuz ve başlangıçta kapalı bir açılımdır. “Ayrıntıları kopyala” yalnız ekranda sunulan izinli tanı alanlarını kopyalar; başarı veya erişim reddi görünür durum metniyle bildirilir. Hata zamanı İstanbul saat diliminde tarih, saat ve UTC farkıyla gösterilir; kopyalanan metin özgün zaman damgasını korur. Uzun tanı değerleri satır kırar; dar ekranda etiket ve değer alt alta yerleşir.

## Doğrulama

[Hata ve HTTP okuma testleri](../src/lib/pdks-failure.test.ts), [durum geçişleri](../src/data/pdks-state.test.ts), [kullanıcı sunumu](../src/components/pdks-error.test.tsx), [sunucu serileştirme](../src/server/http.test.js) ve [route/oturum testleri](../src/server/routes.test.js) sözleşmeyi korur. [Fixture kabulü](../scripts/acceptance/archive-behavior.js) sentetik API yanıtları kullanır; gerçek PDKS erişimini kanıtlamaz.

Tarayıcıda hata zinciri için `bun run dev` yanında `bun scripts/acceptance/pdks-errors.mjs` çalıştırılır; yeni sekmede `http://127.0.0.1:3101` açılır. Tüm API istekleri sentetiktir. Sıra: ilk oturum kontrolü hatası → tekrar kontrol → yanlış şifre → kaynak bağlantı hatası → başarılı giriş → bozuk 401 rapor yanıtı → kaynak 500 → başarılı rapor → çıkış hatası → çıkışı tekrar deneme → tekrar giriş → oturum bitişi. Akışı baştan almak için yalnız fixture süreci yeniden başlatılır.
