# Mesai bildirimleri

[Kural haritası](README.md) · [Mesai planı](work-plan.md) · [Masaüstü](../desktop.md)

## Sahipler

- [notifications.ts](../../src/domain/rules/notifications.ts) bildirim türlerini, varsayılan kapalı tercihleri, ön süreyi, geçerlilik aralığını ve tekrar deneme sınırını yönetir.
- [notification-report.ts](../../src/desktop/notification-report.ts), raporu mevcut geçiş/rapor/plan sahipleriyle değerlendirir. Güvenilir açık giriş ve güncel İstanbul günü için çalışma planındaki çıkış hedefini kullanır.
- [notification-runtime.ts](../../src/desktop/notification-runtime.ts) Electron ana sürecinde zamanlamayı, oturum yaşamını ve kanal başına gönderim kaydını yönetir.
- [install-notifications.ts](../../src/desktop/install-notifications.ts) sınırlı IPC, native bildirim, yerel sunucu erişimi ve güvenli saklama adaptörlerini bağlar.
- [telegram.ts](../../src/desktop/telegram.ts) kullanıcının botunu ve kişisel sohbetini doğrular; mesajları Telegram Bot API ile gönderir.
- [telegram-input.ts](../../src/lib/telegram-input.ts) token ve kişisel sohbet kimliği biçiminin sahibidir. Manuel formun `pattern` değeri, keşfedilen sohbetlerin süzülmesi ve bağlantı girdisi aynı kimlik kuralını kullanır. Sohbet keşfi tokenı bağımsız doğrular.
- [ui-text.js](../../src/lib/ui-text.js) gönderilen bildirimlerin başlık/gövdelerini `notificationMessages`, ayar ekranını `notifications`, Telegram kurulumunu `telegramSetup`, hata metinlerini `notificationErrors` ve `telegramErrors` altında tutar. Kural ve sağlayıcılar bu metinleri kullanır; zamanlama ve gönderim kararları kendi sahiplerinde kalır.

## Koşullar ve zamanlama

Her bildirim türü için masaüstü ve Telegram ayrı ayrı açılır. Varsayılanların tamamı kapalıdır. Hatırlatma ön süresi 1–120 dakika, başlangıç değeri 10 dakikadır. Deneme gönderimi kullanıcının ilgili düğmeye basmasıyla yapılır.

Ön süre sınırları ve başlangıç değeri `NOTIFICATION_POLICY` sahibindedir. Doğrulayıcı, formun min/max değerleri ve hata metinleri bu değerleri kullanır; hazır seçenekler bu aralığa göre süzülür. Bildirim saatinin gösterimi ortak [takvimin](calendar.md) saat dilimini kullanır.

Güncel haftanın raporu açılışta ve 30 dakikada bir ana süreçten yenilenir. Görünen geçmiş hafta bu işi değiştirmez. Başarılı manuel yenileme arka plan raporunun yenilenmesini de ister. Ekran planın bütün kayıtlarını doğrulanmış mevcut serileştirmeyle ana sürece aktarır; plan değişikliğinde hedef yeniden hesaplanır.

Eşzamanlı plan senkronizasyonlarında son istek geçerlidir. Eski isteğin geciken oturum yanıtı veya hatası yeni oturumu durduramaz ve eski planı tekrar deneme kuyruğuna yazamaz. Yeni istek önceki bekleyen plan tekrarını kaldırır; geçici hatada yalnız son plan yeniden denenir.

Son başarılı raporda güvenilir açık giriş varsa geçici ağ/yenileme hatası bildirimleri durdurmaz. Görünümün eski rapor nedeniyle canlı tahmini durdurması kendi sözleşmesini korur; bildirimler son bilinen giriş ve güncel planla sürer. Yeni raporda çıkış, belirsiz hedef veya kapalı gün bulunursa mesai bildirimi üretilmez. Önceki günün açık girişi bugüne taşınmaz.

Ana süreç 15 saniyede bir zamanı değerlendirir. Ön bildirim hedefin seçilen dakika öncesinde, tamamlanma bildirimi hedef anında oluşur. Bir dakikalık geçerlilik aralığı küçük işlem gecikmelerini karşılar. Ön bildirim hedef anında sona erer. Açılıştan veya tercihlerin kaydedilmesinden önceki eşikler gönderilmez. Uyku dönüşünde rapor yenilemesi başlatılır ve uyanmadan önceki eşikler atlanır. Süren veya başarısız yenilemede aynı günün son bilinen açık girişiyle sonraki eşikler değerlendirilmeye devam eder.

Masaüstünde bir dakikalık oturum heartbeat'ini ana süreç gönderir. İlk oturum okumasındaki geçici ağ hatası 30 saniye arayla yeniden denenir; çıkış bu bekleyen işi iptal eder.

## Gönderim ve hesap ayrımı

Sunucu, Pofi hesap anahtarından bildirimlere özgü SHA-256 hesap kimliğini ve sabit oturum bitiş anını üretir. Kaynak anahtar ve PDKS çerezleri renderer'a verilmez. Hesap değişimi, başarılı çıkış, doğrulanmış oturum bitişi ve [oturum TTL'inin](session-policy.md) dolması ilgili arka plan işini durdurur. Giriş/çıkış işlemi sırasında gönderimler askıya alınır; başarısız çıkışta mevcut oturum yeniden bağlanır.

Kalıcı tekrar anahtarı hesap + İstanbul tarihi + bildirim türü + kanaldır. Ön süre veya tür/kanal tercihleri değiştirilip başarıyla kaydedilirse ilgili hesabın bugünkü bütün gönderim kayıtları sıfırlanır; sonraki uygun eşikte açık kanallara yeniden gönderilebilir. Aynı tercihleri tekrar kaydetmek kayıtları ve eşik uygunluğunu değiştirmez. Tercih değişmeden yalnız çıkış hedefinin değişmesi aynı gün aynı tür/kanalda ikinci gönderim oluşturmaz. Önceki günlerin kayıtları korunur; gönderim sırasında son yedi gün dışındaki kayıtlar temizlenir. Gönderim öncesi `pending` diske yazılır; kayıt yazılamıyorsa mesaj gönderilmez. Kayıt hatası Bildirimler'de gösterilir, başarılı hesap kaydında temizlenir ve raporun tazeliğini değiştirmez. Sağlayıcı kabulü `accepted` olur; bu durum okunma kanıtı değildir.

Tercihler, güncel gönderim kayıtları ve tercih sürümü tek hesap kaydında birlikte yazılır. Eski kayıtlarda tercih sürümü sıfır kabul edilir. Tercih değişikliği sırasında devam eden gönderim tamamlanabilir; eski sürümün sonucu sıfırlanan kaydı geri yazamaz veya eski eşikte diğer kanalı başlatamaz. Hesap değiştiğinde eski bildirim döngüsünün kayıt hatası yeni oturumun durumunu değiştirmez; beklenmeyen hata loglanır. Kaydetme başarısızsa mevcut tercihler ve gönderim kayıtları korunur. Sıfırlama geçmiş eşikleri geriye dönük göndermeyi sağlamaz.

Telegram'ın kesin hız sınırı yanıtı, sağlayıcının bekleme süresiyle en fazla üç denemeye izin verir; bildirim geçerliliği her denemede tekrar denetlenir. Ağ zaman aşımı, okunamayan yanıt veya gönderim sırasında uygulamanın kapanması `unknown` olur ve otomatik yinelenmez. Diğer kesin retler kullanıcıya kanal hatası olarak gösterilir. Bir kanal hatası diğer kanalı durdurmaz.

## Telegram ve yerel saklama

Kullanıcı BotFather ile kendi botunu oluşturur ve bot sohbetinde Başlat'ı seçer. Pofis token üzerinden botu ve seçilen kişisel sohbeti doğrular. Sohbet bulma yalnız `getUpdates` okuması yapar; offset ile güncellemeleri tüketmez veya webhook ayarını değiştirmez. Mevcut webhook kullanan botta kullanıcı sayısal kişisel sohbet kimliğini elle girebilir.

Ortak [TelegramSetup](../../src/components/notifications/telegram-setup.tsx) modalı önce token ve “Sohbeti bul” eylemini gösterir. Bulunan kişisel sohbetler aynı modalda açılır; tek sonuç seçili gelir, bağlantı “Bağla” onayıyla kurulur. Sohbet kimliği elle giriş seçeneğiyle açılır. Token değiştiğinde önceki sohbet sonuçları ve seçim temizlenir. Arama ve bağlantı hataları modal içinde gösterilir; modal kapatıldığında token ve geçici form durumu temizlenir. Demo ve Electron bu akışı aynı bileşenden kullanır.

Bot tokenı ve sohbet bağlantısı Electron `safeStorage` ile şifrelenir; şifreli değer profilin `notifications/<hesap>.json` dosyasında saklanır. Güvenli saklama kullanılamıyorsa bağlantı kaydedilmez. Linux arka uç kontrolünü [güvenli saklama adaptörü](../../src/desktop/secure-storage.ts) hatırlama kaydıyla paylaşır; Ubuntu GNOME anahtarlığı gerekir. Token durum yanıtına veya loglara eklenmez. Bağlantı kaldırılınca şifreli kayıt silinir. Tercihler ve kanal sonuçları aynı hesap dosyasındadır; bozuk kayıt korunur ve hata gösterilir. JSON yazıları sıralıdır; geçici dosya atomik yeniden adlandırılır. Elektrik kesintisine karşı fsync garantisi verilmez.

macOS durum yanıtındaki güvenli saklama alanı Keychain desteğini belirtir; [güvenli saklama adaptörü](../../src/desktop/secure-storage.ts) açılış, gezinme ve duraklatma sırasında senkron Keychain sorgusu yapmaz. Keychain erişimi Telegram bağlantısını şifreleme veya mevcut bağlantıyı çözme sırasında yapılır; erişim reddedilirse açık token kaydedilmez.

Gönderilen içerik bildirim başlığı ve hesaplanan çıkış saatini anlatan kısa metindir. Telegram'a PDKS kullanıcı adı, parola, kaynak çerezi veya raporun tamamı gönderilmez.

## Sunum ve uygulama kimliği

İşlem geri bildirimi kendi eyleminin yanında gösterilir: tercih kaydı kaydetme satırında, masaüstü ve Telegram deneme/bağlantı sonuçları ilgili kanal satırında yer alır. Başarı mesajları beş saniye sonra kaybolur; hatalar yeniden denemeye kadar kalır. Arka plan gönderim hataları da kendi kanalında görünür. İşlem sürerken ilgili eylem bekleme metni gösterir. Sonuçlar kalıcı canlı durum alanlarıyla duyurulur; kurulum hataları Telegram modalında kalır. Bağlantı/oturum hataları sayfanın üstünde gösterilir.

Bildirimler yan menüden açılır. İlk durum okunurken yeni bir durum gelirse ekran onu kullanır. Kanal tercihleri ve ön süre, açık kaydetme eylemiyle uygulanır; Mesaim'e dönüp yeniden açıldığında kaydedilmemiş seçimler korunur. Ön süre 5 / 10 / 15 / 30 dakika veya 1–120 aralığında özel değerdir. Telegram kurulumu Bildirim kanalları bölümünden açılır. Bağlı olmayan kanalın kapalı tercihi açılamaz; daha önce açık kaydedilmiş tercih kapatılabilir. Yerleşim, switch ve popover kararları [DESIGN](../../DESIGN.md#bildirim-kontrolleri) sahibindedir.

Masaüstü, web ve `/demo` aynı [NotificationSettings](../../src/components/notifications/settings.tsx) bileşenini kullanır. Normal web oturumunda ekran salt okunurdur ve masaüstü gereksinimini gösterir. [Demo bildirimleri](../demo.md#mesai-bildirimi-ayarları) aynı akışı örnek sonuçlarla sunar; gerçek zamanlayıcı Electron ana sürecindedir.

Native bildirimin işletim sistemi kaynak adı **Pofis** olur. Windows ve Linux'ta içerik ikonu `public/pofi/pofi-mark-256.png` olur. Windows paketleyicisi EXE ikonuyla birlikte `ProductName`, `FileDescription`, `InternalName` ve `OriginalFilename` alanlarını Pofis olarak işler; Electron'un bildirim kısayolu adı EXE `ProductName` alanından gelir. Süreç ve Başlat menüsü kısayolu aynı `app.pofis.client` kimliğini kullanır. macOS uygulama adı ve ikonu bundle metadata'sından gelir; aynı görselin iki kez görünmemesi için bildirime ayrıca içerik ikonu eklenmez. Native bildirime tıklama çalışan Pofis penceresini açar.

| Durum | Başlık | Gövde örneği |
| --- | --- | --- |
| Hedefe 10 dakika | Çıkış hedefin yaklaşıyor | Planına göre çıkış hedefin 17:00. Hedefe 10 dakika kaldı. |
| Hedef anı | Çıkış hedefin tamamlandı | Son alınan kayıtlara ve planına göre 17:00 çıkış hedefine ulaştın. |
| Native deneme | Pofis bildirimi hazır | Mesai hatırlatmaların burada görünecek. |
| Telegram deneme | Pofis bildirimi hazır | Mesai hatırlatmaların bu sohbete gelecek. |

Telegram mesajı başlık, boş satır ve gövdeyi düz metin olarak taşır. Gönderen botun adı ve profil resmi kullanıcı tarafından Telegram/BotFather üzerinden yönetilir; Pofis bu kimliği değiştirmez. Sistem metinleri [ton rehberindeki](../brand/pofi-tone-guide.md) kısa ve bilgi veren Pofis sesini kullanır.

Electron 43.8.1 kaynakları: [Windows uygulama adı][electron-app-name], [toast kısayolu][electron-toast].

[electron-app-name]: https://github.com/electron/electron/blob/v43.8.1/shell/common/application_info_win.cc
[electron-toast]: https://github.com/electron/electron/blob/v43.8.1/shell/browser/notifications/win/windows_toast_activator.cc

## Doğrulama

Kural ve ana süreç testleri sabit saat/rapor senaryolarıyla eşikleri, plan değişikliğini, yenileme hatasında devamı, çıkışta iptali, hesap/TTL ayrımını, kalıcı tekrar kontrolünü ve kanal hatalarını sınar. Tercih değişikliği testleri bugünün kayıtlarının sıfırlanmasını, aynı tercihlerde korunmasını, sonraki eşikte iki kanalın yeniden gönderimini ve başarısız kayıtta mevcut durumun korunmasını doğrular. Geçici disk kaydıyla yeniden açılış ve devam eden eski gönderimin sıfırlanan durumu geri yazmaması da sınanır. Komutlar [doğrulama rehberindedir](../verification.md). Telegram testleri sahte HTTP yanıtları kullanır. Gerçek Telegram gönderimi kullanıcının kendi botuyla Deneme düğmesinden; native görünüm/tıklama ve izinler paketli Windows/macOS uygulamasında doğrulanır.
