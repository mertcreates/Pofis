# Kullanım ölçümü

Üretim web ve Electron sürümleri GA4 `G-MV4MG71CDB` Web akışını otomatik kullanır. Geliştirme çalıştırmalarında etiket yüklenmez. [Kök yerleşim](../src/app/layout.tsx) etiketi bağlar; [istemci bileşeni](../src/components/google-analytics.tsx) hidrasyon sonrasında Google betiğini bir kez yükler ve yol değişimlerini izler. Başlangıç ve sayfa geçişleri [ölçüm sahibinden](../src/lib/analytics.ts) geçer.

## Alanlar ve sınırlar

- Sayfa adresleri sabittir: ana uygulama `https://pofis.app/app`, demo `https://pofis.app/demo`, diğer yollar `https://pofis.app/other`. Bunlar rapor etiketleridir; masaüstü arayüzünün gerçek origin'i korunur.
- Başlık `Pofis` veya `Pofis Demo`, yönlendiren adres boş, sayfa olayındaki `app_release` paket sürümüdür. Gerçek adresin sorgusu, fragment'i ve bilinmeyen yol parçaları ölçüm alanlarına alınmaz.
- Google etiketi çerez tabanlı istemci/oturum ölçümü ve standart cihaz, dil, etkileşim bilgilerini toplar. Google istekleri ağ bağlantısı üzerinden iletilir; bu ölçüm anonimlik garantisi vermez. PDKS kimliği, kullanıcı adı, parola, turnike kayıtları, rapor ve mesai süreleri olay alanlarına bağlanmaz.
- Google Signals ve reklam kişiselleştirme sinyalleri kapalıdır. `cookie_domain: none` yerel masaüstü origin'inde host çerezi kullanır.
- `send_page_view: false` ile başlangıçtaki otomatik sayfa olayı kapatılır. İstemci her yol geçişinde bir `page_view` gönderir. Giriş ve rapor aynı yoldadır; bunlar ayrı ekran olayı olarak ölçülmez. Özel özellik olayları henüz tanımlı değildir.
- Ağ engeli veya çevrimdışı durumda Google betiği yüklenemese de Pofis çalışmaya devam eder.

## Hesap kimliği

[Sunucu kimlik sahibi](../src/server/analytics-identity.ts), mevcut Pofi hesap anahtarından `pofis_ga_v1_` önekli SHA-256 kimliği üretir: UTF-8 JSON girdisi `["pofis:analytics-user:v1", accountKey]`. Anahtarın kendisi ve oturum token'ı Google'a gönderilmez. Aynı kaynak/normalize kullanıcı adıyla girişler, süreçler ve cihazlar aynı analytics kimliğini üretir. Ad-soyad kimliğe katılmaz. Kaynağın farklı harf/takma adlarla aynı hesabı kabul etmesi, mevcut Pofi anahtarı sözleşmesine bağlıdır; bu eşdeğerlik doğrulanmış değildir.

[Kendi raporu route'u](../src/app/api/report/route.js) aktif oturumu doğruladıktan sonra yanıta `analyticsUserId` ekler. Bu alan raporun `no-store` sınırını kullanır. Ek sunucu, veri tabanı, isim eşleştirme tablosu veya yerel kimlik deposu oluşturulmaz. Pofi notlarının anahtarı ve seçim davranışı korunur. Bu kimlik takma kimliktir; sürümlü hash ve ayrı kullanım alanı anonimlik veya tahmin saldırısına direnç garantisi vermez.

[use-pdks](../src/data/use-pdks.ts) yalnız güncel, doğrulanmış raporun kimliğini [biçim denetiminden](../src/lib/analytics-identity.ts) geçirir; gecikmiş/iptal edilmiş yanıt kimliği değiştiremez. İlk başarılı rapor gelene kadar olaylar cihaz kimliğiyle ölçülür. Kimlik eksik/geçersizse hesap eşleştirmesi temizlenir; mesai ekranının kullanılabilirliği korunur.

İstemci `gtag('set', { user_id: id })` ile kimliği etkinleştirir. Etiket hazırsa hesap kimliği etkinleştiğinde `account_identified` olayı gönderilir; aynı kimlikle rapor yenilemesi bu olayı tekrarlamaz. Kimlik etiketten önce gelirse ilk sayfa olayına hazırlanır. `user_id` konfigürasyon alanıdır; özel kullanıcı özelliği veya olay parametresi olarak çoğaltılmaz.

Çıkış isteğinin başında, başarılı hesap değişiminde, doğrulanmış `SESSION_EXPIRED` hatasında ve canlı görünüm kaldırıldığında kimlik `null` olur. Çıkış hatasında uygulamanın mevcut oturumu sürüyorsa önceki kimlik geri yüklenir. Demo ve diğer yollar canlı hesap kimliğini temizler. Başka sekmedeki oturum değişimi bu sekmenin sonraki oturum/rapor kontrolünde anlaşılır; sekmeler arası anlık bildirim eklenmez.

Mevcut özel olaylar `page_view` ve `account_identified` ile sınırlıdır. Plan kaydetme, menü açma ve Pofi etkileşimi gibi kullanıcı işlemleri için olaylar henüz tanımlı değildir; bu işlemlerin ayrıntılı zaman çizelgesi mevcut ölçümden çıkarılamaz.

## Google Analytics ayarları

Akış adı `Pofis Masaüstü`, kurulum URL'si `https://pofis.app` olabilir. Uygulamanın gönderdiği ölçüm kimliği veriyi bu akışa bağlar. Landing ölçümü ayrı akışta yönetilir.

Bu akışta **Geliştirilmiş ölçüm kapalı tutulur**. Otomatik geçmiş/form/arama/bağlantı ölçümü, elle gönderilen sayfa olaylarını çoğaltabilir veya uygulamanın sınırlandırdığı alanlara ek veri toplayabilir. Google panelindeki bu ayar uygulama kodundan yönetilmez.

Yönetici → Veri görüntüleme → Raporlama kimliği altında User-ID içeren **Gözlemlenen (Observed)** veya **Harmanlanmış (Blended)** seçilir. `user_id` için özel boyut oluşturulmaz; kullanıcı incelemesi GA4 Keşifler üzerinden yapılır. [Google User-ID kurulumu](https://developers.google.com/analytics/devguides/collection/ga4/user-id) · [raporlama kimliği ve kullanıcı keşfi](https://support.google.com/analytics/answer/9213390?hl=tr). Üretimde kullanılan kimliklerin açıklaması ürünün kullanıcıya sunulan veri bilgilendirmesinde yer almalıdır.

Sürüm karşılaştırması için Yönetici → Özel tanımlar üzerinden olay kapsamlı `app_release` özel boyutu oluşturulur. Bu alan sayfa olayında açıkça gönderilir; Web akışında uygulama SDK'sına ait `app_version` alanına güvenilmez. [Özel olay parametreleri](https://developers.google.com/analytics/devguides/collection/ga4/event-parameters).

## Doğrulama

[Alan testleri](../src/lib/analytics.test.ts) başlangıç yapılandırmasını, tek kurulumla sayfa geçişlerini ve kişisel adres/başlıkların alanlara taşınmamasını doğrular. Üretim derlemesini izole tarayıcıda açıp Google isteklerini yakalayın: tek betik, tek başlangıç sayfa olayı, demo geçişi ve çevrimdışı kullanılabilirlik. Test isteklerini canlı akışa göndermeyin. Gerçek yayında veri kabulünü GA4 Anlık raporundan kontrol edin.

Tekrar kullanılabilir [Electron kabulü](../scripts/electron/analytics-smoke.cjs): `bun run build` ardından ayrı terminalde `bun run start --port 3210`, sonra `bun scripts/electron/analytics-smoke.cjs`. Betik geçici profilde gerçek Google etiketini yükler, ölçüm isteklerini ağdan önce iptal edip alanlarını denetler; Google betiği engelliyken giriş ekranının kullanılabilirliğini kontrol eder ve profili temizler. Gerçek paket yükleme/güncellemesi ve GA4 paneline veri kabulü bu yerel kontrolün kapsamı dışındadır.

Kimlik kabulü sentetik API yanıtlarıyla alpha → çıkış hatası → çıkış → beta → doğrulanmış oturum bitişi → alpha → demo zincirini gerçek `usePdks` ve Google etiketi üzerinden çalıştırır. Kabul betiğinin `analytics_probe` olayı yalnız testte üretilir ve ağdan önce iptal edilir. [Sunucu kimlik testleri](../src/server/analytics-identity.test.ts) sabit vektörü, [route testleri](../src/server/routes.test.js) hesap ayrımı ve diskten geri yüklemeyi, [istemci testleri](../src/lib/analytics.test.ts) kuyruklama, biçim ve temizliği doğrular.

Kaynaklar: [Next Script](https://nextjs.org/docs/app/guides/scripts), [GA4 sayfa ölçümü](https://developers.google.com/analytics/devguides/collection/ga4/views), [GA4 yapılandırması](https://developers.google.com/analytics/devguides/collection/ga4/reference/config), [yerel sunucu çerezleri](https://developers.google.com/tag-platform/security/guides/customize-cookies).
